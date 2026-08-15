'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  KeyRound, Copy, CheckCircle2, Laptop2, Trash2, Eye, EyeOff,
  Sparkles, Search, Filter, RefreshCw, Shield, Clock, CalendarDays,
  Globe2, Zap, AlertTriangle, X, ChevronDown, ChevronUp,
  ExternalLink, Package, Tag, Activity, Infinity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  active:    { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Active' },
  expired:   { color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',   dot: 'bg-amber-500',  label: 'Expired' },
  suspended: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500', label: 'Suspended' },
  revoked:   { color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-500/10 border-red-500/20',       dot: 'bg-red-500',   label: 'Revoked' },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  envato:         { label: 'Envato',          color: 'text-[#79c41a]', bg: 'bg-[#79c41a]/10 border-[#79c41a]/20', icon: <Sparkles className="h-3 w-3" /> },
  internal:       { label: 'Own Marketplace', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: <Package className="h-3 w-3" /> },
  own_marketplace:{ label: 'Own Marketplace', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20', icon: <Package className="h-3 w-3" /> },
  manual:         { label: 'Manual Issue',    color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20', icon: <Tag className="h-3 w-3" /> },
};

const ENV_CONFIG: Record<string, { label: string; color: string }> = {
  production: { label: 'Production', color: 'text-emerald-600 dark:text-emerald-400' },
  staging:    { label: 'Staging',    color: 'text-amber-600 dark:text-amber-400' },
  localhost:  { label: 'Localhost',  color: 'text-blue-500' },
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getDaysLeft(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface DeactivateModalProps {
  activation: any;
  licenseKey: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function DeactivateModal({ activation, licenseKey, onConfirm, onCancel, loading }: DeactivateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Deactivate Installation?</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              This will immediately remove <strong className="text-foreground">{activation.domain}</strong> from your active installations and free up 1 activation slot.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-secondary/60 border border-border text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Domain</span>
            <span className="font-bold font-mono">{activation.domain}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environment</span>
            <span className="font-semibold capitalize">{activation.environment}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Activated</span>
            <span className="font-semibold">{formatDate(activation.activatedAt)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 h-10 font-semibold" disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1 h-10 font-semibold gap-2" disabled={loading}>
            {loading ? (
              <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Deactivating...</>
            ) : (
              <><Trash2 className="h-4 w-4" /> Confirm Deactivate</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [deactivateTarget, setDeactivateTarget] = useState<{ activation: any; licenseKey: string } | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLicenses = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiRequest('/customer/licenses');
      setLicenses(res.data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLicenses(); }, [fetchLicenses]);

  const copyLicense = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowKey = (id: string) => setShowKeyMap(p => ({ ...p, [id]: !p[id] }));
  const toggleExpand = (id: string) => setExpandedMap(p => ({ ...p, [id]: !p[id] }));

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivateLoading(true);
    setDeactivateError('');
    try {
      await apiRequest(`/customer/activations/${deactivateTarget.activation.activationId}/deactivate`, { method: 'POST' });
      setDeactivateTarget(null);
      showToast('success', `${deactivateTarget.activation.domain} has been deactivated. Slot freed.`);
      fetchLicenses(true);
    } catch (err: any) {
      setDeactivateError(err.message || 'Deactivation failed');
      showToast('error', err.message || 'Deactivation failed');
    } finally {
      setDeactivateLoading(false);
    }
  };

  // Filtering
  const filtered = licenses.filter(lic => {
    if (statusFilter !== 'all' && lic.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && lic.source !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        lic.licenseKey?.toLowerCase().includes(q) ||
        lic.productId?.name?.toLowerCase().includes(q) ||
        lic.licenseType?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalSlots = licenses.reduce((a, l) => a + (l.activationLimit || 0), 0);
  const usedSlots = licenses.reduce((a, l) => a + (l.currentActivationCount || 0), 0);
  const activeCount = licenses.filter(l => l.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl font-semibold text-sm max-w-sm ${
          toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-destructive text-white border-destructive/70'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-auto hover:opacity-70"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Deactivate Modal */}
      {deactivateTarget && (
        <DeactivateModal
          activation={deactivateTarget.activation}
          licenseKey={deactivateTarget.licenseKey}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateTarget(null)}
          loading={deactivateLoading}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-indigo-500" />
            </div>
            Licenses &amp; Domain Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage license keys, activated domains, and installation slots across all your products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLicenses(true)}
            disabled={refreshing}
            className="h-9 w-9 rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/dashboard/envato">
            <Button className="gap-2 h-9 px-4 text-xs font-semibold shadow-md shadow-primary/10">
              <Sparkles className="h-3.5 w-3.5" />
              Import Envato
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && licenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Licenses', value: licenses.length, icon: KeyRound, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { label: 'Active Licenses', value: activeCount, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Domains Used', value: usedSlots, icon: Globe2, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Slots Available', value: totalSlots - usedSlots, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div>
                <div className="text-xl font-black">{s.value}</div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      {!loading && licenses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by product name, license key..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-medium min-w-[130px]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
          </select>
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-medium min-w-[150px]"
          >
            <option value="all">All Sources</option>
            <option value="envato">Envato</option>
            <option value="internal">Own Marketplace</option>
            <option value="manual">Manual Issue</option>
          </select>
        </div>
      )}

      {/* License List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-3xl border border-border bg-card animate-pulse space-y-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-secondary rounded-lg" />
                  <div className="h-5 w-48 bg-secondary rounded-lg" />
                </div>
                <div className="h-6 w-16 bg-secondary rounded-full" />
              </div>
              <div className="h-10 w-full bg-secondary rounded-xl" />
              <div className="h-2 w-full bg-secondary rounded-full" />
            </div>
          ))}
        </div>
      ) : licenses.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-5">
          <div className="h-14 w-14 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <KeyRound className="h-7 w-7 text-indigo-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold">No licenses on your account</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Purchase a product from our marketplace or import your Envato CodeCanyon purchase code to get started.
            </p>
          </div>
          <Link href="/dashboard/envato">
            <Button className="gap-2 shadow-md shadow-primary/10">
              <Sparkles className="h-4 w-4" />
              Import Envato Purchase
            </Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-3">
          <Filter className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm font-semibold">No licenses match your filters</p>
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setSourceFilter('all'); }} className="text-xs text-indigo-500 hover:underline font-semibold">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(lic => {
            const isVisible = showKeyMap[lic._id];
            const isExpanded = expandedMap[lic._id];
            const maskedKey = isVisible
              ? lic.licenseKey
              : `${lic.licenseKey?.slice(0, 8) || ''}••••••••••••${lic.licenseKey?.slice(-4) || ''}`;

            const pct = Math.min(100, Math.round(((lic.currentActivationCount || 0) / (lic.activationLimit || 1)) * 100));
            const statusCfg = STATUS_CONFIG[lic.status] || STATUS_CONFIG['active'];
            const sourceCfg = SOURCE_CONFIG[lic.source] || SOURCE_CONFIG['internal'];
            const licExpiryDays = getDaysLeft(lic.expiresAt);
            const supportExpiryDays = getDaysLeft(lic.supportExpiresAt);

            return (
              <div key={lic._id} className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Marketplace Source Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${sourceCfg.bg} ${sourceCfg.color}`}>
                          {sourceCfg.icon} {sourceCfg.label}
                        </span>
                        {/* Product Type Badge */}
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold uppercase text-muted-foreground">
                          {lic.productId?.productType?.replace(/_/g, ' ')}
                        </span>
                        {/* License Type */}
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold uppercase text-muted-foreground">
                          {lic.licenseType} plan
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-foreground leading-tight">{lic.productId?.name || 'Unknown Product'}</h2>
                      <p className="text-xs text-muted-foreground">
                        Version <span className="font-mono font-bold text-foreground">v{lic.productId?.currentVersion || '—'}</span>
                        {lic.productId?.latestStableVersion && lic.productId.latestStableVersion !== lic.productId.currentVersion && (
                          <span className="ml-2 text-indigo-500 font-semibold">→ v{lic.productId.latestStableVersion} available</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* License Key Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Secret License Key</span>
                      <button
                        onClick={() => toggleShowKey(lic._id)}
                        className="flex items-center gap-1 font-normal normal-case text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isVisible ? <><EyeOff className="h-3.5 w-3.5" /> Hide key</> : <><Eye className="h-3.5 w-3.5" /> Reveal key</>}
                      </button>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border flex items-center justify-between gap-3">
                      <span className={`font-mono text-sm font-black tracking-widest text-foreground select-all ${!isVisible ? 'blur-sm' : ''}`}>
                        {maskedKey}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { if (isVisible) copyLicense(lic.licenseKey); else { toggleShowKey(lic._id); } }}
                        className="h-8 px-3 text-xs font-semibold gap-1.5 shrink-0"
                      >
                        {copiedKey === lic.licenseKey ? (
                          <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" /> Copy</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Activation Slots Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Laptop2 className="h-3.5 w-3.5" /> Activation Slots
                      </span>
                      <span className={`font-mono font-bold ${pct >= 100 ? 'text-amber-500' : 'text-foreground'}`}>
                        {lic.currentActivationCount} / {lic.activationLimit === 999999 ? '∞' : lic.activationLimit} Used
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-amber-500' : pct >= 80 ? 'bg-orange-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Expiry Info Row */}
                  <div className="flex flex-wrap gap-3 pt-1">
                    {lic.expiresAt ? (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                        licExpiryDays !== null && licExpiryDays < 30
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-secondary border-border text-muted-foreground'
                      }`}>
                        <CalendarDays className="h-3 w-3" />
                        License expires: {formatDate(lic.expiresAt)}
                        {licExpiryDays !== null && licExpiryDays > 0 && licExpiryDays < 60 && (
                          <span className="ml-1 font-bold">({licExpiryDays}d left)</span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Infinity className="h-3 w-3" /> Lifetime License
                      </div>
                    )}
                    {lic.supportExpiresAt && (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                        supportExpiryDays !== null && supportExpiryDays < 30
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-secondary border-border text-muted-foreground'
                      }`}>
                        <Shield className="h-3 w-3" />
                        Support until: {formatDate(lic.supportExpiresAt)}
                        {supportExpiryDays !== null && supportExpiryDays > 0 && supportExpiryDays < 60 && (
                          <span className="ml-1 font-bold">({supportExpiryDays}d)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse Activations */}
                <div className="border-t border-border">
                  <button
                    onClick={() => toggleExpand(lic._id)}
                    className="w-full flex items-center justify-between px-6 py-3.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Laptop2 className="h-3.5 w-3.5" />
                      Active Installations ({(lic.activeActivations || []).length})
                      {(lic.activeActivations || []).length === 0 && (
                        <span className="ml-1 text-[10px] font-normal text-muted-foreground">(none registered)</span>
                      )}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-3">
                      {!lic.activeActivations || lic.activeActivations.length === 0 ? (
                        <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-secondary/30 space-y-2">
                          <Globe2 className="h-6 w-6 text-muted-foreground mx-auto opacity-40" />
                          <p className="text-xs text-muted-foreground">
                            No domains activated yet. You have <strong className="text-foreground">{lic.activationLimit} slot{lic.activationLimit !== 1 ? 's' : ''}</strong> available.
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Use your license key in the plugin/theme activation panel to register a domain.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50 rounded-2xl border border-border overflow-hidden">
                          {lic.activeActivations.map((act: any) => {
                            const envCfg = ENV_CONFIG[act.environment] || ENV_CONFIG['production'];
                            return (
                              <div key={act.activationId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-background hover:bg-secondary/30 transition-colors">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-foreground">{act.domain}</span>
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-secondary ${envCfg.color}`}>
                                      {envCfg.label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground font-mono">
                                    ID: {act.activationId}
                                  </p>
                                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Activated {formatDate(act.activatedAt)}</span>
                                    {act.lastValidatedAt && (
                                      <span>· Last seen {formatDate(act.lastValidatedAt)}</span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeactivateTarget({ activation: act, licenseKey: lic.licenseKey })}
                                  className="h-8 text-xs font-semibold gap-1.5 shrink-0 text-destructive border-destructive/30 hover:bg-destructive hover:text-white hover:border-destructive transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Deactivate
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
