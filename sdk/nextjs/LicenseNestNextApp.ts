/**
 * LicenseNest — Next.js App Integration
 *
 * For full Next.js apps/SaaS distributed as products that need license validation.
 *
 * Storage Strategy:
 *  - Client-side: localStorage (persists across page reloads)
 *  - Server-side (middleware / API routes): file system via NodeFileStorage
 *
 * USAGE — App Router (src/lib/license.ts):
 *
 *   import { LicenseNestNextApp } from './sdk/LicenseNestNextApp';
 *
 *   export const license = new LicenseNestNextApp(
 *     process.env.NEXT_PUBLIC_LICENSENEST_API!,
 *     process.env.NEXT_PUBLIC_PRODUCT_SLUG!,
 *     process.env.NEXT_PUBLIC_PRODUCT_VERSION!,
 *   );
 *
 *   // In a React component:
 *   const status = await license.validate();
 *   if (!status.valid) redirect('/activate');
 */

import { LicenseNestBaseClient, ILicenseStorage, BrowserStorage, MemoryStorage } from '../core/LicenseNestBaseClient';
import type { LicenseResponse, LicenseStatusInfo, UpdateInfo, DeactivateResponse, ActivateOptions } from '../core/LicenseNestBaseClient';

export type { LicenseResponse, LicenseStatusInfo, UpdateInfo, DeactivateResponse, ActivateOptions };

// ─── Node.js File System Storage ─────────────────────────────────────────────
// Used in middleware, API routes, and server components where localStorage is unavailable.

export class NodeFileStorage implements ILicenseStorage {
  private dir: string;

  constructor(dir?: string) {
    // Use os.tmpdir() by default; pass a writable path in production
    this.dir = dir ?? (typeof process !== 'undefined' ? require('os').tmpdir() : '/tmp');
  }

  private filePath(key: string): string {
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
    return require('path').join(this.dir, `.ln_${safeKey}.json`);
  }

  read(key: string): any {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(this.filePath(key), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  write(key: string, value: any): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.filePath(key), JSON.stringify(value, null, 2), 'utf-8');
    } catch {}
  }

  remove(key: string): void {
    try {
      const fs = require('fs');
      fs.unlinkSync(this.filePath(key));
    } catch {}
  }
}

// ─── Database Storage (Prisma / Drizzle / any ORM) ───────────────────────────
// Useful when you want license state in your database instead of files.

export class DatabaseStorage implements ILicenseStorage {
  constructor(
    private readonly getter: (key: string) => Promise<string | null>,
    private readonly setter: (key: string, value: string) => Promise<void>,
    private readonly deleter: (key: string) => Promise<void>,
  ) {}

  async read(key: string): Promise<any> {
    const raw = await this.getter(key);
    return raw ? JSON.parse(raw) : null;
  }

  async write(key: string, value: any): Promise<void> {
    await this.setter(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await this.deleter(key);
  }
}

// ─── Next.js App License Client ───────────────────────────────────────────────

export class LicenseNestNextApp extends LicenseNestBaseClient {
  private readonly siteUrl: string;

  constructor(
    apiUrl: string,
    productSlug: string,
    productVersion = '1.0.0',
    storage?: ILicenseStorage,
    siteUrl?: string,
  ) {
    // Auto-select storage: browser → localStorage, server → file
    const resolvedStorage = storage ?? (
      typeof window !== 'undefined' ? new BrowserStorage() : new NodeFileStorage()
    );
    super(apiUrl, productSlug, productVersion, resolvedStorage);
    this.siteUrl = siteUrl ?? '';
  }

  protected getDomain(): string {
    if (typeof window !== 'undefined') {
      return window.location.hostname;
    }
    // Server-side: prefer NEXT_PUBLIC_SITE_DOMAIN env var
    const envDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? process.env.SITE_URL ?? '';
    if (envDomain) {
      try { return new URL(envDomain).hostname; } catch { return envDomain; }
    }
    return this.siteUrl ? (() => { try { return new URL(this.siteUrl).hostname; } catch { return this.siteUrl; } })() : 'localhost';
  }
}

// ─── React Hook ───────────────────────────────────────────────────────────────

/**
 * useLicense — React hook for client-side license management.
 *
 * USAGE (app/components/LicenseGate.tsx):
 *
 *   const { status, loading, activate, deactivate } = useLicense(licenseClient);
 *
 *   if (loading) return <Spinner />;
 *   if (!status?.valid) return <ActivationPage onActivate={activate} />;
 *   return <>{children}</>;
 */
export function useLicense(client: LicenseNestNextApp) {
  // This function is a React hook — import React in the consuming component.
  // Defined here as a factory to avoid direct React dependency in the SDK.
  throw new Error(
    'useLicense must be used inside a React component. ' +
    'Copy the hook implementation from sdk/nextjs/examples/useLicense.ts',
  );
}
