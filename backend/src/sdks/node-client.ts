/**
 * LicenseNest Node.js / Next.js Client SDK
 * 
 * Reusable helper library for integrating LicenseNest into Next.js & Node.js SaaS/apps.
 */

export interface LicenseClientConfig {
  apiUrl: string;
  productSlug: string;
  installationId: string;
  domain: string;
  productVersion: string;
}

export interface ActivationResult {
  success: boolean;
  status: string;
  token?: string;
  message?: string;
  license?: any;
}

export interface ValidationResult {
  valid: boolean;
  status: string;
  message?: string;
  validationIntervalHours?: number;
}

export class LicenseClient {
  private config: LicenseClientConfig;
  private cachedToken: string | null = null;

  constructor(config: LicenseClientConfig) {
    this.config = config;
  }

  setCachedToken(token: string) {
    this.cachedToken = token;
  }

  async activate(licenseKeyOrPurchaseCode: { licenseKey?: string; purchaseCode?: string }): Promise<ActivationResult> {
    const response = await fetch(`${this.config.apiUrl}/public/licenses/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productSlug: this.config.productSlug,
        licenseKey: licenseKeyOrPurchaseCode.licenseKey,
        purchaseCode: licenseKeyOrPurchaseCode.purchaseCode,
        installationId: this.config.installationId,
        domain: this.config.domain,
        productVersion: this.config.productVersion,
      }),
    });

    const data = await response.json();
    if (data.success && data.data?.token) {
      this.cachedToken = data.data.token;
    }

    return {
      success: data.success,
      status: data.data?.status || (data.success ? 'activated' : 'failed'),
      token: data.data?.token,
      message: data.message,
      license: data.data?.license,
    };
  }

  async validate(): Promise<ValidationResult> {
    if (!this.cachedToken) {
      return { valid: false, status: 'NO_TOKEN', message: 'No cached activation token found' };
    }

    const response = await fetch(`${this.config.apiUrl}/public/licenses/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productSlug: this.config.productSlug,
        installationId: this.config.installationId,
        token: this.cachedToken,
        domain: this.config.domain,
        productVersion: this.config.productVersion,
      }),
    });

    const data = await response.json();
    return {
      valid: Boolean(data.data?.valid),
      status: data.data?.status || 'INVALID',
      message: data.message,
      validationIntervalHours: data.data?.validationIntervalHours,
    };
  }

  async deactivate(reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.config.apiUrl}/public/licenses/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installationId: this.config.installationId,
        token: this.cachedToken || undefined,
        domain: this.config.domain,
        reason: reason || 'Client deactivation',
      }),
    });

    const data = await response.json();
    if (data.success) {
      this.cachedToken = null;
    }
    return { success: data.success, message: data.message };
  }

  async checkForUpdates(): Promise<any> {
    if (!this.cachedToken) {
      throw new Error('Active license token required to check updates');
    }

    const response = await fetch(
      `${this.config.apiUrl}/public/products/${this.config.productSlug}/updates?currentVersion=${this.config.productVersion}&domain=${this.config.domain}`,
      {
        headers: {
          Authorization: `Bearer ${this.cachedToken}`,
        },
      },
    );

    const data = await response.json();
    return data.data;
  }
}
