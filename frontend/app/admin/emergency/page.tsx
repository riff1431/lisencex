'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame, ShieldAlert, AlertTriangle, RefreshCw, Power, PowerOff,
  ShieldOff, ShieldCheck, CheckCircle2, XCircle, RotateCcw,
  Search, Layers, Box, KeyRound, Laptop2, ScrollText, AlertOctagon,
  Sparkles, Check, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { EmergencyKillSwitchModal } from '@/components/emergency-kill-switch-modal';

interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  productType?: string;
  status: string;
  emergencyKillSwitch?: {
    disableNewActivations?: boolean;
    disableValidation?: boolean;
    disableUpdatesDownloads?: boolean;
    isProductSuspended?: boolean;
    activeReason?: string;
    activatedAt?: string;
    activatedBy?: string;
  };
}

export default function AdminEmergencyPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Bulk Action State
  const [bulkTarget, setBulkTarget] = useState<'licenses' | 'activations'>('licenses');
  const [bulkActionType, setBulkActionType] = useState<'revoke' | 'suspend' | 'restore'>('suspend');
  const [bulkKeysText, setBulkKeysText] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkCritical, setBulkCritical] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overRes, prodRes] = await Promise.all([
        apiRequest('/admin/emergency/overview'),
        apiRequest('/admin/products?limit=100'),
      ]);
      setOverview(overRes.data || overRes);
      setProducts(prodRes.data?.items || prodRes.data || []);
    } catch (err) {
      console.error('Failed to load emergency overview', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteBulkAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const idsOrKeys = bulkKeysText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (idsOrKeys.length === 0) {
      setBulkError('Please enter at least one license ID / key or activation ID.');
      return;
    }
    if (bulkReason.trim().length < 5) {
      setBulkError('A mandatory reason (min 5 characters) is required for bulk emergency actions.');
      return;
    }

    setBulkSubmitting(true);
    setBulkError(null);
    setBulkSuccessMsg(null);

    try {
      const endpoint =
        bulkActionType === 'revoke'
          ? '/admin/emergency/bulk-revoke'
          : bulkActionType === 'suspend'
          ? '/admin/emergency/bulk-suspend'
          : '/admin/emergency/bulk-restore';

      const payload = {
        licenseIds: bulkTarget === 'licenses' ? idsOrKeys : undefined,
        activationIds: bulkTarget === 'activations' ? idsOrKeys : undefined,
        reason: bulkReason.trim(),
        critical: bulkCritical,
      };

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setBulkSuccessMsg(res.message || 'Bulk emergency action completed successfully.');
      setBulkKeysText('');
      setBulkReason('');
      loadData();
    } catch (err: any) {
      setBulkError(err.message || 'Failed to execute bulk action');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-destructive text-white flex items-center justify-center shadow-md shadow-destructive/30">
              <Flame className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-black text-foreground">License Revocation & Emergency Kill-Switch</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Instant product-level kill switches, temporary suspensions, critical revocations, and mass emergency operations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl border border-destructive/30 bg-destructive/5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <span>Revoked Licenses</span>
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          </div>
          <p className="text-2xl font-black text-destructive">
            {overview?.stats?.totalRevokedLicenses ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-3xl border border-amber-500/30 bg-amber-500/5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <span>Suspended Licenses</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {overview?.stats?.totalSuspendedLicenses ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-3xl border border-purple-500/30 bg-purple-500/5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <span>Critical Revocations</span>
            <ShieldAlert className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {overview?.stats?.totalCriticalRevokedLicenses ?? 0}
          </p>
        </div>

        <div className="p-4 rounded-3xl border border-border bg-card space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            <span>Active Kill-Switches</span>
            <Flame className="h-3.5 w-3.5 text-destructive" />
          </div>
          <p className="text-2xl font-black text-foreground">
            {overview?.stats?.activeProductKillSwitches ?? 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Kill-Switch Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-3xl border border-border bg-card space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Power className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  Product Kill-Switch Control
                </h3>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-secondary/50 border border-border focus:ring-2 focus:ring-destructive outline-hidden"
                />
              </div>
            </div>

            <div className="divide-y divide-border">
              {filteredProducts.map((prod) => {
                const ks = prod.emergencyKillSwitch || {};
                const hasActiveKillSwitch =
                  ks.disableNewActivations ||
                  ks.disableValidation ||
                  ks.disableUpdatesDownloads ||
                  ks.isProductSuspended;

                return (
                  <div key={prod._id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground truncate">{prod.name}</span>
                        {hasActiveKillSwitch && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-destructive/15 text-destructive border border-destructive/30 animate-pulse">
                            Kill-Switch Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        slug: <span className="text-foreground">{prod.slug}</span>
                      </p>

                      {hasActiveKillSwitch && (
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {ks.disableNewActivations && (
                            <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                              ⛔ Activations Disabled
                            </span>
                          )}
                          {ks.disableValidation && (
                            <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">
                              ⛔ Validations Frozen
                            </span>
                          )}
                          {ks.disableUpdatesDownloads && (
                            <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                              ⛔ Updates Blocked
                            </span>
                          )}
                          {ks.isProductSuspended && (
                            <span className="text-[10px] font-semibold text-destructive bg-destructive/20 px-2 py-0.5 rounded-md">
                              🚨 Product Suspended
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={hasActiveKillSwitch ? 'destructive' : 'outline'}
                      onClick={() => {
                        setSelectedProduct(prod);
                        setIsModalOpen(true);
                      }}
                      className="gap-1.5 text-xs font-bold shrink-0 self-start sm:self-auto"
                    >
                      <Flame className="h-3.5 w-3.5" />
                      {hasActiveKillSwitch ? 'Manage Kill-Switch' : 'Emergency Action'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emergency Audit Trail */}
          <div className="p-5 rounded-3xl border border-border bg-card space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                Recent Emergency Audit Trail
              </h3>
            </div>

            <div className="divide-y divide-border/60 text-xs">
              {overview?.recentEmergencyLogs?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No emergency actions recorded yet.</p>
              ) : (
                overview?.recentEmergencyLogs?.map((log: any) => (
                  <div key={log._id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px] text-destructive">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-muted-foreground">by {log.actorEmail}</span>
                      </div>
                      <p className="text-[11px] text-foreground">
                        {log.after?.reason ? `"${log.after.reason}"` : `Target: ${log.targetType} ${log.targetId || ''}`}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Bulk Emergency Action Console */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl border border-destructive/30 bg-card space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                Bulk Emergency Console
              </h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Instantly revoke, suspend, or restore multiple compromised licenses or installations in 1 batch.
            </p>

            {bulkSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{bulkSuccessMsg}</span>
              </div>
            )}

            {bulkError && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 shrink-0" />
                <span className="font-semibold">{bulkError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteBulkAction} className="space-y-4 text-xs">
              {/* Target Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Target Entity:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkTarget('licenses')}
                    className={`p-2 rounded-xl border font-bold transition-all ${
                      bulkTarget === 'licenses'
                        ? 'bg-secondary text-foreground border-border'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    License Keys / IDs
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTarget('activations')}
                    className={`p-2 rounded-xl border font-bold transition-all ${
                      bulkTarget === 'activations'
                        ? 'bg-secondary text-foreground border-border'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Activations / Domains
                  </button>
                </div>
              </div>

              {/* Action Type */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Action Type:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBulkActionType('revoke')}
                    className={`p-2 rounded-xl border font-bold transition-all ${
                      bulkActionType === 'revoke'
                        ? 'bg-destructive text-white border-destructive shadow-xs'
                        : 'border-border text-muted-foreground hover:text-destructive'
                    }`}
                  >
                    Revoke
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkActionType('suspend')}
                    className={`p-2 rounded-xl border font-bold transition-all ${
                      bulkActionType === 'suspend'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'border-border text-muted-foreground hover:text-amber-500'
                    }`}
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkActionType('restore')}
                    className={`p-2 rounded-xl border font-bold transition-all ${
                      bulkActionType === 'restore'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'border-border text-muted-foreground hover:text-emerald-600'
                    }`}
                  >
                    Restore
                  </button>
                </div>
              </div>

              {/* Critical Revoke Toggle */}
              {bulkActionType === 'revoke' && (
                <label className="p-3 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-destructive block">Critical Revoke Mode</span>
                    <span className="text-[10px] text-muted-foreground">
                      Bypasses offline grace period completely; immediate hard client lockdown.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={bulkCritical}
                    onChange={(e) => setBulkCritical(e.target.checked)}
                    className="h-4 w-4 accent-destructive rounded"
                  />
                </label>
              )}

              {/* Keys / IDs Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Paste {bulkTarget === 'licenses' ? 'License Keys / MongoDB ObjectIDs' : 'Activation IDs'} (1 per line):
                </label>
                <textarea
                  rows={4}
                  required
                  value={bulkKeysText}
                  onChange={(e) => setBulkKeysText(e.target.value)}
                  placeholder="LIC-PROD-AAAA-1111&#10;LIC-PROD-BBBB-2222&#10;6a7f8e..."
                  className="w-full p-2.5 rounded-xl bg-background border border-border font-mono text-[11px] outline-hidden focus:ring-2 focus:ring-destructive resize-none"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Mandatory Reason * (min 5 chars):
                </label>
                <input
                  type="text"
                  required
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="e.g. Mass leak on compromised repository"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs outline-hidden focus:ring-2 focus:ring-destructive"
                />
              </div>

              <Button
                type="submit"
                disabled={bulkSubmitting}
                className="w-full gap-2 text-xs font-bold bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/20 disabled:opacity-50"
              >
                {bulkSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                Execute Bulk Emergency Action
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Emergency Kill Switch Modal */}
      {selectedProduct && (
        <EmergencyKillSwitchModal
          productId={selectedProduct._id}
          productName={selectedProduct.name}
          currentKillSwitch={selectedProduct.emergencyKillSwitch}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
}
