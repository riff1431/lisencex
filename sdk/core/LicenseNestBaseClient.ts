/**
 * LicenseNest Core TypeScript SDK — Base Client
 *
 * Version: 2.0.0
 *
 * Shared by ALL TypeScript/JavaScript product integrations:
 *   - Next.js Apps
 *   - Next.js Themes / Plugins
 *   - Node.js Applications
 *   - Standalone JavaScript Products
 *
 * SECURITY MODEL:
 *   - Zero private server secrets stored in distributed product code.
 *   - The signed activation token is issued & rotated by the LicenseNest server.
 *   - Token + timestamps are stored locally (localStorage, file, or in-memory).
 *   - Network calls only happen when cachedUntil has elapsed.
 *   - Offline grace period keeps product active when server is temporarily unreachable.
 */

// ─── Response Types ────────────────────────────────────────────────────────────

export type LicenseStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'DOMAIN_MISMATCH'
  | 'INSTALLATION_MISMATCH'
  | 'TOKEN_INVALID'
  | 'INACTIVE'
  | 'GRACE_PERIOD_EXPIRED'
  | 'BLOCKED'
  | 'ERROR';

export interface LicenseInfo {
  licenseKey?: string;
  status?: string;
  licenseType?: string;
  activationLimit?: number;
  currentActivationCount?: number;
  expiresAt?: string | null;
  supportExpiresAt?: string | null;
}

export interface ProductInfo {
  name?: string;
  slug?: string;
  currentVersion?: string;
  latestVersion?: string;
}

export interface LicenseResponse {
  valid: boolean;
  status: LicenseStatus;
  message?: string;
  cached?: boolean;
  grace_period?: boolean;
  token?: string;
  license?: LicenseInfo;
  product?: ProductInfo;
  validationIntervalHours?: number;
  offlineGracePeriodDays?: number;
  cachedUntil?: string;
  gracePeriodUntil?: string;
}

export interface LicenseStatusInfo {
  activated: boolean;
  licenseKey?: string;
  status?: string;
  licenseType?: string;
  expiresAt?: string | null;
  supportExpiresAt?: string | null;
  activationLimit?: number;
  domain?: string;
  cachedUntil?: string;
  gracePeriodUntil?: string;
}

export interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion?: string;
  currentVersion?: string;
  downloadUrl?: string;
  changelog?: string;
  releaseDate?: string;
}

export interface DeactivateResponse {
  success: boolean;
  message: string;
}

export interface ActivateOptions {
  isPurchaseCode?: boolean;
  installationUrl?: string;
  environment?: 'production' | 'staging' | 'localhost';
}

// ─── Storage Interface — subclasses implement storage backend ─────────────────

export interface ILicenseStorage {
  read(key: string): Promise<any> | any;
  write(key: string, value: any): Promise<void> | void;
  remove(key: string): Promise<void> | void;
}

// ─── Browser localStorage Storage ─────────────────────────────────────────────

export class BrowserStorage implements ILicenseStorage {
  read(key: string): any {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
  write(key: string, value: any): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
  remove(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}

// ─── In-Memory Storage (SSR / Node.js / testing) ──────────────────────────────

export class MemoryStorage implements ILicenseStorage {
  private store = new Map<string, any>();
  read(key: string): any { return this.store.get(key) ?? null; }
  write(key: string, value: any): void { this.store.set(key, value); }
  remove(key: string): void { this.store.delete(key); }
}

// ─── Core Base Client ──────────────────────────────────────────────────────────

export abstract class LicenseNestBaseClient {
  protected readonly apiUrl: string;
  protected readonly productSlug: string;
  protected readonly productVersion: string;
  protected readonly storage: ILicenseStorage;

  private readonly CACHE_KEY: string;
  private readonly INST_KEY: string;

  constructor(
    apiUrl: string,
    productSlug: string,
    productVersion = '1.0.0',
    storage?: ILicenseStorage,
  ) {
    this.apiUrl         = apiUrl.replace(/\/$/, '');
    this.productSlug    = productSlug;
    this.productVersion = productVersion;
    this.CACHE_KEY      = `ln_cache_${productSlug}`;
    this.INST_KEY       = `ln_inst_${productSlug}`;
    this.storage        = storage ?? this.defaultStorage();
  }

  // ─── Abstract hooks — subclasses override for product-specific behavior ───

  /** Return the current domain/hostname for this installation */
  protected abstract getDomain(): string;

  // ─── Public API contract ─────────────────────────────────────────────────

  /**
   * Get or generate a stable unique installation ID.
   * Stored persistently so it survives page reloads.
   */
  public getInstallationId(): string {
    const existing = this.storage.read(this.INST_KEY);
    if (existing) return existing;
    const id = `ins_${this.randomHex(12)}`;
    this.storage.write(this.INST_KEY, id);
    return id;
  }

  /**
   * Activate this product installation.
   *
   * @param credential - License key (LIC-XXXX-...) or Envato purchase code (UUID)
   * @param options    - { isPurchaseCode, installationUrl, environment }
   */
  public async activate(credential: string, options: ActivateOptions = {}): Promise<LicenseResponse> {
    const payload: Record<string, string> = {
      productSlug:     this.productSlug,
      installationId:  this.getInstallationId(),
      domain:          this.getDomain(),
      productVersion:  this.productVersion,
      installationUrl: options.installationUrl ?? `https://${this.getDomain()}`,
      ...(options.environment ? { environment: options.environment } : {}),
    };

    if (options.isPurchaseCode) {
      payload.purchaseCode = credential.trim();
    } else {
      payload.licenseKey = credential.trim().toUpperCase();
    }

    const res = await this.post('/public/licenses/activate', payload);

    if (res.valid && res.token) {
      this.saveCache(res);
    }

    return res;
  }

  /**
   * Validate the license. Self-throttled via cache — only contacts server
   * when cachedUntil has elapsed. Safe to call on every app boot.
   */
  public async validate(): Promise<LicenseResponse> {
    const cached = this.loadCache();
    const now    = Date.now();

    if (!cached?.token) {
      return { valid: false, status: 'INACTIVE', message: 'Product not activated.' };
    }

    // Cache still fresh → return immediately
    if (cached.cachedUntil && new Date(cached.cachedUntil).getTime() > now) {
      return { valid: true, status: 'ACTIVE', cached: true, license: cached.license };
    }

    // cachedUntil elapsed → server heartbeat
    try {
      const res = await this.post('/public/licenses/validate', {
        productSlug:    this.productSlug,
        installationId: this.getInstallationId(),
        token:          cached.token,
        domain:         this.getDomain(),
        productVersion: this.productVersion,
      });

      if (res.valid) {
        this.saveCache({
          ...cached,
          token:            res.token          ?? cached.token,
          cachedUntil:      res.cachedUntil    ?? new Date(now + 86400000).toISOString(),
          gracePeriodUntil: res.gracePeriodUntil ?? new Date(now + 604800000).toISOString(),
          license:          res.license         ?? cached.license,
        });
        return { valid: true, status: 'ACTIVE', cached: false, license: res.license };
      }

      // Server explicitly rejected
      this.clearCache();
      return res;

    } catch {
      // Network unreachable → check grace period
      if (cached.gracePeriodUntil && new Date(cached.gracePeriodUntil).getTime() > now) {
        return {
          valid: true, status: 'ACTIVE', grace_period: true,
          message: 'License server unreachable. Running under offline grace period.',
        };
      }
      return {
        valid: false, status: 'GRACE_PERIOD_EXPIRED',
        message: 'Offline grace period expired. Please reconnect to the internet.',
      };
    }
  }

  /**
   * Get current license status from local cache. No network call.
   */
  public getLicenseStatus(): LicenseStatusInfo {
    const cached = this.loadCache();
    if (!cached?.token) return { activated: false };
    return {
      activated:        true,
      licenseKey:       cached.license?.licenseKey,
      status:           cached.license?.status ?? 'unknown',
      licenseType:      cached.license?.licenseType,
      expiresAt:        cached.license?.expiresAt ?? null,
      supportExpiresAt: cached.license?.supportExpiresAt ?? null,
      activationLimit:  cached.license?.activationLimit,
      domain:           this.getDomain(),
      cachedUntil:      cached.cachedUntil,
      gracePeriodUntil: cached.gracePeriodUntil,
    };
  }

  /**
   * Deactivate this installation and free an activation slot.
   */
  public async deactivate(reason?: string): Promise<DeactivateResponse> {
    const cached = this.loadCache();
    try {
      const res = await this.post('/public/licenses/deactivate', {
        installationId: this.getInstallationId(),
        token:          cached?.token,
        domain:         this.getDomain(),
        reason:         reason ?? 'User-initiated deactivation',
      });
      return res;
    } finally {
      this.clearCache(); // Always clear local state
    }
  }

  /**
   * Check if a product update is available.
   */
  public async checkUpdate(): Promise<UpdateInfo> {
    const cached = this.loadCache();
    const params = new URLSearchParams({
      currentVersion: this.productVersion,
      token:          cached?.token ?? '',
      domain:         this.getDomain(),
    });

    try {
      const res = await fetch(
        `${this.apiUrl}/public/products/${encodeURIComponent(this.productSlug)}/updates?${params}`,
        { headers: { 'Accept': 'application/json' } },
      );
      const json = await res.json();
      return json?.data ?? json ?? { updateAvailable: false };
    } catch {
      return { updateAvailable: false };
    }
  }

  /**
   * Alias for checkUpdate()
   */
  public async checkForUpdates(): Promise<UpdateInfo> {
    return this.checkUpdate();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private saveCache(data: any): void {
    this.storage.write(this.CACHE_KEY, data);
  }

  private loadCache(): any {
    return this.storage.read(this.CACHE_KEY);
  }

  private clearCache(): void {
    this.storage.remove(this.CACHE_KEY);
  }

  private async post(endpoint: string, body: Record<string, any>): Promise<any> {
    const res = await fetch(`${this.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    // Unwrap { success, data } envelope
    return json?.data ?? json;
  }

  private randomHex(len: number): string {
    return Array.from(
      { length: len },
      () => Math.floor(Math.random() * 16).toString(16),
    ).join('');
  }

  private defaultStorage(): ILicenseStorage {
    return typeof window !== 'undefined' ? new BrowserStorage() : new MemoryStorage();
  }
}
