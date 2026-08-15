'use client';

import React, { useState, useEffect } from 'react';
import {
  Laptop2,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  XCircle,
  Globe2,
  X,
  Filter,
  ExternalLink,
  Copy,
  Check,
  User,
  ShoppingBag,
  Store,
  Building2,
  KeyRound,
  Layers,
  ShieldAlert,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminActivationsPage() {
  const [activations, setActivations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Relationship Inspector Modal
  const [inspectorTarget, setInspectorTarget] = useState<any>(null);

  // Transfer Modal State
  const [transferTarget, setTransferTarget] = useState<any>(null);
  const [newDomain, setNewDomain] = useState('');
  const [newInstallationId, setNewInstallationId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Action (Deactivate / Suspend / Revoke) Modal State
  const [actionTarget, setActionTarget] = useState<any>(null);
  const [actionKind, setActionKind] = useState<'deactivate' | 'suspend' | 'revoke'>('deactivate');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchActivations = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/activations?search=${encodeURIComponent(search)}`);
      setActivations(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivations();
  }, [search]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTarget) return;
    setActionLoading(true);

    try {
      await apiRequest(`/admin/activations/${actionTarget.activationId}/${actionKind}`, {
        method: 'POST',
        body: JSON.stringify({ reason: actionReason || `Admin panel ${actionKind}` }),
      });
      setActionTarget(null);
      setActionReason('');
      fetchActivations();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionKind} activation`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget) return;
    setTransferring(true);

    try {
      await apiRequest(`/admin/activations/${transferTarget.activationId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({
          newDomain,
          newInstallationId: newInstallationId || `ins_${Math.random().toString(36).slice(2, 9)}`,
          reason: transferReason,
        }),
      });

      setTransferTarget(null);
      fetchActivations();
    } catch (err: any) {
      alert(err.message || 'Failed to transfer activation');
    } finally {
      setTransferring(false);
    }
  };

  const filteredActivations = activations.filter((act) => {
    if (envFilter !== 'all' && act.environment !== envFilter) return false;
    if (statusFilter !== 'all' && act.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <Laptop2 className="h-7 w-7 text-indigo-500" />
            Activations & Installation Registry
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor real-time domain bindings, installation heartbeats, slot usage limits, and server transfers
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by domain, activation ID, installation ID, or IP..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="localhost">Localhost Dev</option>
            <option value="development">Development</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      {/* Activations Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Domain / Installation</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">License Key & Slots</th>
                <th className="px-6 py-4">Environment</th>
                <th className="px-6 py-4">IP / Heartbeat</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    Loading live activations...
                  </td>
                </tr>
              ) : filteredActivations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    No active installations found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredActivations.map((act) => {
                  const license = act.licenseId || {};
                  const activeCount = license.currentActivationCount ?? 1;
                  const limit = license.activationLimit ?? 1;

                  return (
                    <tr key={act._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                          <span>{act.domain}</span>
                          {act.installationUrl && (
                            <a
                              href={act.installationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-indigo-500"
                              title="Open site"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span>{act.activationId}</span>
                          <button
                            onClick={() => handleCopy(act.activationId)}
                            className="hover:text-foreground"
                            title="Copy ID"
                          >
                            {copiedId === act.activationId ? (
                              <Check className="h-2.5 w-2.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-2.5 w-2.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="font-semibold">{act.productId?.name || 'Product'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">v{act.productVersion || '1.0'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <div className="font-bold text-foreground">{license.licenseKey || 'N/A'}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Usage: <strong className="text-foreground">{activeCount} / {limit} Slots</strong>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            act.environment === 'production'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {act.environment}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">
                        <div>{act.ip || 'Unknown IP'}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(act.lastValidatedAt || act.activatedAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            act.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : act.status === 'revoked'
                              ? 'bg-destructive/10 text-destructive border border-destructive/20'
                              : 'bg-secondary text-muted-foreground border border-border'
                          }`}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInspectorTarget(act)}
                          className="text-xs h-8 gap-1"
                          title="Inspect 6-step relationship chain"
                        >
                          <Layers className="h-3.5 w-3.5 text-indigo-500" />
                          Chain
                        </Button>

                        {act.status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTransferTarget(act);
                                setNewDomain('');
                                setNewInstallationId('');
                                setTransferReason('');
                              }}
                              className="text-xs h-8 gap-1"
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              Transfer
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setActionTarget(act);
                                setActionKind('deactivate');
                                setActionReason('');
                              }}
                              className="text-xs h-8"
                            >
                              Deactivate
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6-STEP RELATIONSHIP CHAIN INSPECTOR MODAL */}
      {inspectorTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  6-Step Complete Relationship Chain
                </h2>
                <p className="text-xs text-muted-foreground">
                  Customer → Product → Purchase → License → Installation → Activation
                </p>
              </div>
              <button onClick={() => setInspectorTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {/* 1. Customer */}
              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-500">
                  <span>1. Customer</span>
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="font-bold text-foreground truncate">{inspectorTarget.userId?.fullName || 'Customer'}</div>
                <div className="text-[11px] font-mono text-muted-foreground truncate">{inspectorTarget.userId?.email}</div>
                {inspectorTarget.userId?.envatoUsername && (
                  <div className="text-[10px] text-emerald-500 font-mono">@{inspectorTarget.userId.envatoUsername}</div>
                )}
              </div>

              {/* 2. Product */}
              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-indigo-500">
                  <span>2. Product</span>
                  <ShoppingBag className="h-3.5 w-3.5" />
                </div>
                <div className="font-bold text-foreground truncate">{inspectorTarget.productId?.name || 'Product'}</div>
                <div className="text-[11px] font-mono text-muted-foreground">Type: {inspectorTarget.productId?.productType}</div>
                <div className="text-[11px] font-mono text-muted-foreground">v{inspectorTarget.productVersion || '1.0'}</div>
              </div>

              {/* 3. Purchase */}
              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-500">
                  <span>3. Purchase</span>
                  <Store className="h-3.5 w-3.5" />
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                  {inspectorTarget.licenseId?.purchaseId?.source || inspectorTarget.licenseId?.source || 'Internal'}
                </span>
                <div className="font-mono font-bold text-foreground truncate mt-1">
                  {inspectorTarget.licenseId?.purchaseId?.orderNumber ||
                    inspectorTarget.licenseId?.purchaseId?.externalPurchaseCode ||
                    'Direct Grant'}
                </div>
              </div>

              {/* 4. License */}
              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-500">
                  <span>4. License</span>
                  <KeyRound className="h-3.5 w-3.5" />
                </div>
                <div className="font-mono font-bold text-foreground truncate">{inspectorTarget.licenseId?.licenseKey}</div>
                <div className="text-[11px] font-mono text-emerald-500 font-bold">
                  {inspectorTarget.licenseId?.currentActivationCount || 1} / {inspectorTarget.licenseId?.activationLimit || 1} Slots
                </div>
              </div>

              {/* 5. Installation */}
              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-purple-500">
                  <span>5. Installation</span>
                  <Laptop2 className="h-3.5 w-3.5" />
                </div>
                <div className="font-mono font-bold text-foreground truncate">{inspectorTarget.installationId}</div>
                <div className="text-[10px] text-muted-foreground">IP: {inspectorTarget.ip || 'Unknown'}</div>
              </div>

              {/* 6. Activation */}
              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-rose-500">
                  <span>6. Activation</span>
                  <Globe2 className="h-3.5 w-3.5" />
                </div>
                <div className="font-bold text-foreground truncate">{inspectorTarget.domain}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{inspectorTarget.activationId}</div>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase inline-block mt-0.5">
                  {inspectorTarget.status}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button onClick={() => setInspectorTarget(null)} variant="outline" size="sm">
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ACTION MODAL (DEACTIVATE / SUSPEND / REVOKE) */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold capitalize text-destructive">
                  {actionKind} Activation
                </h2>
                <p className="text-xs font-mono text-muted-foreground">{actionTarget.domain}</p>
              </div>
              <button onClick={() => setActionTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Select Action Type</label>
                <select
                  value={actionKind}
                  onChange={(e: any) => setActionKind(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                >
                  <option value="deactivate">Deactivate (Frees 1 activation slot)</option>
                  <option value="suspend">Suspend (Temporarily block installation)</option>
                  <option value="revoke">Revoke (Permanently invalidate token history)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Customer domain migration / security audit"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setActionTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={actionLoading}>
                  {actionLoading ? 'Applying...' : `Confirm ${actionKind}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER ACTIVATION MODAL */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold">Transfer Activation</h2>
                <p className="text-xs font-mono text-muted-foreground">Current: {transferTarget.domain}</p>
              </div>
              <button onClick={() => setTransferTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">New Target Domain</label>
                <input
                  type="text"
                  required
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="newsite.example.com"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">New Installation ID (Optional)</label>
                <input
                  type="text"
                  value={newInstallationId}
                  onChange={(e) => setNewInstallationId(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Reason for Transfer</label>
                <input
                  type="text"
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Domain migration from staging to live production"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setTransferTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={transferring} className="font-bold">
                  {transferring ? 'Transferring...' : 'Confirm Transfer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
