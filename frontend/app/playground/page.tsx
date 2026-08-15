'use client';

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XCircle,
  Copy,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function PlaygroundPage() {
  const [productSlug, setProductSlug] = useState('hyperlicense-pro');
  const [licenseKey, setLicenseKey] = useState('');
  const [domain, setDomain] = useState('mystore.example.com');
  const [installationId, setInstallationId] = useState('ins_dev_' + Math.random().toString(36).slice(2, 9));
  const [productVersion, setProductVersion] = useState('1.0.0');

  const [activeToken, setActiveToken] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiLogs, setApiLogs] = useState<any[]>([]);

  // Pre-load a sample license key if available from public or local
  useEffect(() => {
    async function loadSampleLicense() {
      try {
        const res = await apiRequest('/public/products');
        if (res.data?.items?.length) {
          setProductSlug(res.data.items[0].slug);
        }
      } catch {
        // non-blocking
      }
    }
    loadSampleLicense();
  }, []);

  const addLog = (title: string, req: any, res: any, isError = false) => {
    setApiLogs((prev) => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        title,
        request: req,
        response: res,
        isError,
      },
      ...prev,
    ]);
  };

  const handleActivate = async () => {
    setLoading(true);
    setActiveAction('activate');
    const payload = {
      productSlug,
      licenseKey: licenseKey || undefined,
      purchaseCode: !licenseKey ? 'demo-purchase-code' : undefined,
      installationId,
      domain,
      productVersion,
    };

    try {
      const res = await apiRequest('/public/licenses/activate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.data?.token) {
        setActiveToken(res.data.token);
      }
      addLog('POST /api/v1/public/licenses/activate', payload, res);
    } catch (err: any) {
      addLog('POST /api/v1/public/licenses/activate (FAILED)', payload, { error: err.message }, true);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleValidate = async () => {
    if (!activeToken) {
      alert('Please activate first to obtain a signed activation token.');
      return;
    }
    setLoading(true);
    setActiveAction('validate');
    const payload = {
      productSlug,
      installationId,
      token: activeToken,
      domain,
      productVersion,
    };

    try {
      const res = await apiRequest('/public/licenses/validate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      addLog('POST /api/v1/public/licenses/validate', payload, res);
    } catch (err: any) {
      addLog('POST /api/v1/public/licenses/validate (FAILED)', payload, { error: err.message }, true);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleCheckUpdates = async () => {
    if (!activeToken) {
      alert('Please activate first to check for updates with a signed token.');
      return;
    }
    setLoading(true);
    setActiveAction('updates');

    try {
      const res = await apiRequest(
        `/public/products/${productSlug}/updates?currentVersion=${productVersion}&token=${activeToken}&domain=${domain}`,
      );
      addLog(`GET /api/v1/public/products/${productSlug}/updates`, { currentVersion: productVersion, token: activeToken.slice(0, 15) + '...' }, res);
    } catch (err: any) {
      addLog(`GET /api/v1/public/products/${productSlug}/updates (FAILED)`, {}, { error: err.message }, true);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    setActiveAction('deactivate');
    const payload = {
      installationId,
      token: activeToken || undefined,
      domain,
      reason: 'Playground test deactivation',
    };

    try {
      const res = await apiRequest('/public/licenses/deactivate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      addLog('POST /api/v1/public/licenses/deactivate', payload, res);
      setActiveToken('');
    } catch (err: any) {
      addLog('POST /api/v1/public/licenses/deactivate (FAILED)', payload, { error: err.message }, true);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const regenerateInstallation = () => {
    setInstallationId('ins_' + Math.random().toString(36).slice(2, 9));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-500 mb-2">
          <Terminal className="h-3.5 w-3.5" />
          <span>Interactive SDK & API Simulation</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">API Live Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulate how a WordPress Plugin, PHP Script, or Next.js app communicates with the License API in production.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Client Environment Simulator */}
        <div className="lg:col-span-5 p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-500" />
              Client Parameters
            </h2>
            <button
              onClick={regenerateInstallation}
              className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-medium"
            >
              <RefreshCw className="h-3 w-3" /> New Installation ID
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Product Slug</label>
              <input
                type="text"
                value={productSlug}
                onChange={(e) => setProductSlug(e.target.value)}
                placeholder="hyperlicense-pro"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                License Key (or leave empty to test with Purchase Code)
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="LIC-XXXX-XXXX-XXXX-XXXX"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs uppercase focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Domain</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Installed Version</label>
                <input
                  type="text"
                  value={productVersion}
                  onChange={(e) => setProductVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Installation ID</label>
              <input
                type="text"
                value={installationId}
                readOnly
                className="w-full px-3 py-2 rounded-xl border border-border bg-secondary font-mono text-xs text-muted-foreground"
              />
            </div>

            {activeToken && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider">Signed Token Active</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(activeToken)}
                    title="Copy token"
                    className="hover:opacity-80"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="font-mono text-[10px] truncate">{activeToken}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-border">
            <Button
              onClick={handleActivate}
              disabled={loading}
              className="w-full h-10 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading && activeAction === 'activate' ? 'Activating...' : '1. Activate License'}
            </Button>

            <Button
              onClick={handleValidate}
              disabled={loading || !activeToken}
              variant="outline"
              className="w-full h-10 text-xs font-semibold"
            >
              {loading && activeAction === 'validate' ? 'Validating...' : '2. Heartbeat Check'}
            </Button>

            <Button
              onClick={handleCheckUpdates}
              disabled={loading || !activeToken}
              variant="outline"
              className="w-full h-10 text-xs font-semibold"
            >
              {loading && activeAction === 'updates' ? 'Checking...' : '3. Check Updates'}
            </Button>

            <Button
              onClick={handleDeactivate}
              disabled={loading}
              variant="destructive"
              className="w-full h-10 text-xs font-semibold"
            >
              {loading && activeAction === 'deactivate' ? 'Deactivating...' : '4. Deactivate'}
            </Button>
          </div>
        </div>

        {/* Right Output: Real-time Live Log Stream */}
        <div className="lg:col-span-7 rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 bg-secondary/50 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider">Live API Request Stream</span>
            </div>
            {apiLogs.length > 0 && (
              <button
                onClick={() => setApiLogs([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Log
              </button>
            )}
          </div>

          <div className="p-4 flex-1 space-y-4 overflow-y-auto max-h-[600px] font-mono text-xs">
            {apiLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <Play className="h-8 w-8 mb-2 opacity-40" />
                <p className="font-sans font-medium text-sm">No requests made yet</p>
                <p className="text-xs max-w-sm mt-1">
                  Click any action button on the left to trigger live API calls and view server payloads.
                </p>
              </div>
            ) : (
              apiLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-2xl border ${
                    log.isError
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-border bg-background'
                  } space-y-2`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-bold flex items-center gap-1.5 ${
                        log.isError ? 'text-destructive' : 'text-indigo-500'
                      }`}
                    >
                      {log.isError ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {log.title}
                    </span>
                    <span className="text-muted-foreground">{log.time}</span>
                  </div>

                  <div className="pt-2 space-y-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Request Payload</div>
                    <pre className="p-2.5 rounded-xl bg-secondary/80 text-[11px] overflow-x-auto text-foreground">
                      {JSON.stringify(log.request, null, 2)}
                    </pre>

                    <div className="text-[10px] text-muted-foreground uppercase font-bold pt-1">Response Data</div>
                    <pre className="p-2.5 rounded-xl bg-secondary/80 text-[11px] overflow-x-auto text-foreground">
                      {JSON.stringify(log.response, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
