/**
 * LicenseNest — Next.js Theme / Plugin Integration
 *
 * For distributable Next.js themes and plugins (headless, visual builders,
 * analytics plugins, SEO tools, etc.) that ship inside end-user Next.js projects.
 *
 * Design:
 *   - The theme/plugin ships its own license client.
 *   - License key is stored in `.env.local` (not in source code).
 *   - Validation runs at build time (getStaticProps) OR at runtime (middleware).
 *   - Provides a built-in `<LicenseGate>` React component to wrap protected features.
 *
 * USAGE in the theme/plugin's entry file (index.ts):
 *
 *   import { LicenseNestPlugin } from './sdk/LicenseNestPlugin';
 *
 *   export const pluginLicense = new LicenseNestPlugin({
 *     apiUrl:         process.env.NEXT_PUBLIC_LICENSENEST_API!,
 *     productSlug:    'my-nextjs-theme',
 *     productVersion: '3.1.0',
 *   });
 *
 *   // In getStaticProps / server action:
 *   const status = await pluginLicense.validate();
 */

import { LicenseNestBaseClient, ILicenseStorage, BrowserStorage, MemoryStorage } from '../core/LicenseNestBaseClient';
import type { LicenseResponse, LicenseStatusInfo, ActivateOptions } from '../core/LicenseNestBaseClient';

export type { LicenseResponse, LicenseStatusInfo };

// ─── Config ───────────────────────────────────────────────────────────────────

export interface LicenseNestPluginConfig {
  /** LicenseNest API base URL — use NEXT_PUBLIC_ prefix for client-side */
  apiUrl: string;
  /** Product slug matching the admin panel */
  productSlug: string;
  /** Current version of this theme/plugin */
  productVersion?: string;
  /** Optional custom storage backend */
  storage?: ILicenseStorage;
  /**
   * Where to read the license key from automatically.
   * Defaults to process.env.LICENSENEST_KEY (server) or
   * process.env.NEXT_PUBLIC_LICENSENEST_KEY (client).
   */
  licenseKeyEnvVar?: string;
}

// ─── Environment Variable Storage ────────────────────────────────────────────
// Allows saving activation state to a .env.local file for simple projects.
// Falls back to MemoryStorage if the file system is unavailable.

class EnvFileStorage implements ILicenseStorage {
  private fallback = new MemoryStorage();

  private filePath(): string {
    try { return require('path').join(process.cwd(), '.ln-cache.json'); } catch { return ''; }
  }

  read(key: string): any {
    const p = this.filePath();
    if (!p) return this.fallback.read(key);
    try {
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return data[key] ?? null;
    } catch { return this.fallback.read(key); }
  }

  write(key: string, value: any): void {
    const p = this.filePath();
    if (!p) { this.fallback.write(key, value); return; }
    try {
      const fs   = require('fs');
      const data = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {};
      data[key]  = value;
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
    } catch { this.fallback.write(key, value); }
  }

  remove(key: string): void {
    const p = this.filePath();
    if (!p) { this.fallback.remove(key); return; }
    try {
      const fs   = require('fs');
      const data = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {};
      delete data[key];
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
    } catch { this.fallback.remove(key); }
  }
}

// ─── Plugin / Theme License Client ───────────────────────────────────────────

export class LicenseNestPlugin extends LicenseNestBaseClient {
  private readonly envKey: string;

  constructor(config: LicenseNestPluginConfig) {
    const storage = config.storage ?? (
      typeof window !== 'undefined' ? new BrowserStorage() : new EnvFileStorage()
    );
    super(config.apiUrl, config.productSlug, config.productVersion ?? '1.0.0', storage);
    this.envKey = config.licenseKeyEnvVar ?? 'LICENSENEST_KEY';
  }

  protected getDomain(): string {
    if (typeof window !== 'undefined') return window.location.hostname;
    const url = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? '';
    if (url) { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname; } catch {} }
    return 'localhost';
  }

  /**
   * Auto-activate using the license key from environment variable.
   * Call this once at startup (e.g. in a Next.js instrumentation.ts file).
   *
   * The license key must be set in .env.local:
   *   LICENSENEST_KEY=LIC-XXXX-XXXX-XXXX-XXXX
   */
  public async autoActivate(): Promise<LicenseResponse> {
    const key = process.env[this.envKey] ?? process.env['NEXT_PUBLIC_' + this.envKey];

    if (!key) {
      return {
        valid:   false,
        status:  'INACTIVE',
        message: `License key not found. Set ${this.envKey} in your .env.local file.`,
      };
    }

    // If already activated for this key, validate (uses cache)
    const cached = this.getLicenseStatus();
    if (cached.activated) return this.validate();

    // Activate fresh
    return this.activate(key, { installationUrl: `https://${this.getDomain()}` });
  }

  /**
   * Validate license at build time (usable in generateStaticParams, getStaticProps, etc.)
   * Returns true if license is valid, false otherwise.
   */
  public async isLicensedForBuild(): Promise<boolean> {
    const res = await this.validate();
    return res.valid;
  }

  /**
   * Validate for middleware — lightweight, uses cached state.
   */
  public isLicensedSync(): boolean {
    const status = this.getLicenseStatus();
    if (!status.activated) return false;
    const now = Date.now();
    if (status.gracePeriodUntil && new Date(status.gracePeriodUntil).getTime() > now) return true;
    return false;
  }
}
