'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  CheckCircle2,
  Laptop2,
  Trash2,
  Globe2,
  ShieldCheck,
  AlertCircle,
  Store,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function CustomerLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/customer/licenses');
      setLicenses(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const copyLicense = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeactivateDomain = async (activationId: string, domain: string) => {
    if (!confirm(`Are you sure you want to deactivate domain "${domain}"? This will free up 1 activation slot.`)) {
      return;
    }

    try {
      await apiRequest(`/customer/activations/${activationId}/deactivate`, {
        method: 'POST',
      });
      fetchLicenses();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate domain');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">License Keys & Domain Manager</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          View your active license keys, monitor registered domains, and self-deactivate installations
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs">Loading license records...</div>
      ) : licenses.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/50">
          <p className="text-sm font-semibold">No active licenses found on your account.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {licenses.map((lic) => (
            <div
              key={lic._id}
              className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold uppercase text-muted-foreground">
                      {lic.productId?.productType?.replace('_', ' ')}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        lic.source === 'envato'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : lic.source === 'internal'
                          ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {lic.source === 'envato' ? <Store className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                      {lic.source === 'internal' ? 'Own Marketplace' : lic.source}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{lic.productId?.name}</h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">
                      {lic.currentActivationCount} of {lic.activationLimit} Slots Used
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">{lic.licenseType} Plan</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      lic.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}
                  >
                    {lic.status}
                  </span>
                </div>
              </div>

              {/* Relationship summary bar */}
              <div className="p-3 rounded-2xl bg-secondary/30 border border-border text-xs font-mono grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-sans">Purchase Reference</span>
                  <span className="font-bold text-foreground">
                    {lic.purchaseId?.orderNumber || lic.purchaseId?.externalPurchaseCode || 'Direct Grant'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-sans">License Expiration</span>
                  <span className="font-bold text-foreground">
                    {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'Lifetime Access'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block font-sans">Support Expiration</span>
                  <span className="font-bold text-foreground">
                    {lic.supportExpiresAt ? new Date(lic.supportExpiresAt).toLocaleDateString() : 'Lifetime Support'}
                  </span>
                </div>
              </div>

              {/* License Key Bar */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">License Key</label>
                <div className="p-3.5 rounded-2xl bg-secondary/80 border border-border flex items-center justify-between">
                  <span className="font-mono text-sm font-black tracking-wider text-foreground">
                    {lic.licenseKey}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLicense(lic.licenseKey)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    {copiedKey === lic.licenseKey ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Active Domains Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Laptop2 className="h-4 w-4" />
                    Activated Installations & Domains ({lic.activeActivations?.length || 0})
                  </h3>
                </div>

                {!lic.activeActivations || lic.activeActivations.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                    No domains currently activated. You have{' '}
                    <strong className="text-foreground">{lic.activationLimit} slots available</strong>.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60 rounded-2xl border border-border overflow-hidden bg-background">
                    {lic.activeActivations.map((act: any) => (
                      <div
                        key={act.activationId}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{act.domain}</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-semibold uppercase text-muted-foreground">
                              {act.environment}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Activation ID: {act.activationId} • Activated:{' '}
                            {new Date(act.activatedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeactivateDomain(act.activationId, act.domain)}
                          className="h-8 text-xs font-semibold gap-1.5 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Deactivate Domain
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
