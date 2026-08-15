/**
 * EXAMPLE: useLicense React Hook
 *
 * Copy this file into your Next.js app (e.g., src/hooks/useLicense.ts).
 * Uses the LicenseNestNextApp client for client-side license management.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LicenseNestNextApp } from '../LicenseNestNextApp';
import type { LicenseResponse, LicenseStatusInfo, ActivateOptions } from '../../core/LicenseNestBaseClient';

export interface UseLicenseReturn {
  /** Current validation status */
  status: LicenseResponse | null;
  /** Local cache status (no network call) */
  info: LicenseStatusInfo;
  /** True while fetching from server */
  loading: boolean;
  /** Validation or activation error */
  error: string | null;
  /** Activate with a license key or Envato purchase code */
  activate: (credential: string, options?: ActivateOptions) => Promise<boolean>;
  /** Deactivate this installation */
  deactivate: (reason?: string) => Promise<boolean>;
  /** Re-run validation check */
  refresh: () => Promise<void>;
}

export function useLicense(client: LicenseNestNextApp): UseLicenseReturn {
  const [status, setStatus] = useState<LicenseResponse | null>(null);
  const [info,   setInfo]   = useState<LicenseStatusInfo>({ activated: false });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.validate();
      setStatus(res);
      setInfo(client.getLicenseStatus());
    } catch (e: any) {
      setError(e.message ?? 'Validation error');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { refresh(); }, [refresh]);

  const activate = async (credential: string, options?: ActivateOptions): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.activate(credential, options);
      if (res.valid) {
        setStatus(res);
        setInfo(client.getLicenseStatus());
        return true;
      }
      setError(res.message ?? 'Activation failed');
      return false;
    } catch (e: any) {
      setError(e.message ?? 'Activation error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deactivate = async (reason?: string): Promise<boolean> => {
    setLoading(true);
    try {
      await client.deactivate(reason);
      setStatus(null);
      setInfo({ activated: false });
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { status, info, loading, error, activate, deactivate, refresh };
}
