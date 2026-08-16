/**
 * LicenseNest Reusable Client SDK for Next.js, Node.js, and TypeScript Applications
 *
 * Handles activation, cached validation with offline grace periods,
 * and automatic heartbeat checks without exposing private keys.
 */

export interface LicenseValidationResponse {
  valid: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'DOMAIN_MISMATCH' | 'INSTALLATION_MISMATCH' | 'TOKEN_INVALID' | 'INACTIVE' | 'GRACE_PERIOD_EXPIRED';
  message?: string;
  cached?: boolean;
  grace_period?: boolean;
  license?: {
    licenseKey?: string;
    status?: string;
    licenseType?: string;
    expiresAt?: string;
    supportExpiresAt?: string;
  };
  product?: {
    name?: string;
    slug?: string;
    currentVersion?: string;
  };
  token?: string;
  validationIntervalHours?: number;
  offlineGracePeriodDays?: number;
  cachedUntil?: string;
  gracePeriodUntil?: string;
}

export class LicenseClient {
  private apiUrl: string;
  private productSlug: string;
  private currentVersion: string;
  private storage: Map<string, any> = new Map();

  constructor(apiUrl: string, productSlug: string, currentVersion = '1.0.0') {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.productSlug = productSlug;
    this.currentVersion = currentVersion;
  }

  /**
   * Get or generate unique installation ID
   */
  public getInstallationId(): string {
    const key = `license_inst_${this.productSlug}`;
    if (typeof window !== 'undefined' && window.localStorage) {
      let id = localStorage.getItem(key);
      if (!id) {
        id = `ins_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem(key, id);
      }
      return id;
    }

    if (!this.storage.has(key)) {
      this.storage.set(key, `ins_${Math.random().toString(36).substring(2, 11)}`);
    }
    return this.storage.get(key);
  }

  /**
   * Get current hostname / domain
   */
  public getDomain(): string {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.hostname;
    }
    return process.env.NEXT_PUBLIC_SITE_DOMAIN || process.env.SITE_URL || 'localhost';
  }

  /**
   * Activate product with License Key or Envato Purchase Code
   */
  public async activate(licenseKeyOrPurchaseCode: string, isPurchaseCode = false): Promise<LicenseValidationResponse> {
    const payload: any = {
      productSlug: this.productSlug,
      installationId: this.getInstallationId(),
      domain: this.getDomain(),
      productVersion: this.currentVersion,
      sdkVersion: '1.0.0',
      sdkType: 'typescript',
    };

    if (isPurchaseCode) {
      payload.purchaseCode = licenseKeyOrPurchaseCode.trim();
    } else {
      payload.licenseKey = licenseKeyOrPurchaseCode.trim();
    }

    const res = await this.sendRequest('/public/licenses/activate', payload);

    if (res.valid && res.token) {
      this.saveCache(res);
    }

    if (res.sdkWarning) {
      console.warn(`[LicenseNest SDK Warning]: ${res.sdkWarning}`);
    }

    return res;
  }

  /**
   * Verify license validity (uses local cache, verifies with server when interval expires)
   */
  public async checkLicense(): Promise<LicenseValidationResponse> {
    const cached = this.loadCache();
    const now = Date.now();

    if (!cached || !cached.token) {
      return {
        valid: false,
        status: 'INACTIVE',
        message: 'Product is not activated. Please provide a valid license key.',
      };
    }

    // If cache is fresh, return immediately without network call
    if (cached.cachedUntil && new Date(cached.cachedUntil).getTime() > now) {
      return {
        valid: true,
        status: 'ACTIVE',
        cached: true,
        license: cached.license,
      };
    }

    // Cache expired -> perform server validation heartbeat
    const payload = {
      productSlug: this.productSlug,
      installationId: this.getInstallationId(),
      token: cached.token,
      domain: this.getDomain(),
      productVersion: this.currentVersion,
      sdkVersion: '1.0.0',
      sdkType: 'typescript',
    };

    try {
      const res = await this.sendRequest('/public/licenses/validate', payload);

      if (res.sdkWarning) {
        console.warn(`[LicenseNest SDK Warning]: ${res.sdkWarning}`);
      }

      if (res.valid) {
        cached.token = res.token || cached.token;
        cached.cachedUntil = res.cachedUntil;
        cached.gracePeriodUntil = res.gracePeriodUntil;
        cached.license = res.license || cached.license;
        this.saveCache(cached);
        return {
          valid: true,
          status: 'ACTIVE',
          cached: false,
          license: res.license,
        };
      } else {
        this.clearCache();
        return res;
      }
    } catch (err: any) {
      // Offline grace period check
      if (cached.gracePeriodUntil && new Date(cached.gracePeriodUntil).getTime() > now) {
        return {
          valid: true,
          status: 'ACTIVE',
          grace_period: true,
          message: 'Server unreachable. Running under offline grace period.',
        };
      }

      return {
        valid: false,
        status: 'GRACE_PERIOD_EXPIRED',
        message: 'Offline grace period has expired. Please check internet connection.',
      };
    }
  }

  /**
   * Deactivate installation and free up slot
   */
  public async deactivate(reason?: string): Promise<{ success: boolean; message: string }> {
    const cached = this.loadCache();
    const payload = {
      installationId: this.getInstallationId(),
      token: cached?.token,
      domain: this.getDomain(),
      reason: reason || 'Application deactivation',
    };

    const res = await this.sendRequest('/public/licenses/deactivate', payload);
    this.clearCache();
    return res;
  }

  private async sendRequest(endpoint: string, body: any): Promise<any> {
    const res = await fetch(`${this.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    return json;
  }

  private saveCache(data: any) {
    const key = `license_cache_${this.productSlug}`;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      this.storage.set(key, data);
    }
  }

  private loadCache(): any {
    const key = `license_cache_${this.productSlug}`;
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
    return this.storage.get(key) || null;
  }

  private clearCache() {
    const key = `license_cache_${this.productSlug}`;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    } else {
      this.storage.delete(key);
    }
  }
}
