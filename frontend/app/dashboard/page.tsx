'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Box, KeyRound, Download, Sparkles, ArrowRight, Laptop2, Copy,
  CheckCircle2, ShieldCheck, Zap, ExternalLink, Eye, EyeOff,
  Activity, Clock, Globe2, Package, Tag, AlertTriangle,
  CalendarDays, Infinity, TrendingUp, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/stat-card';
import { apiRequest } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  expired:   { label: 'Expired',   color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/20',    dot: 'bg-amber-500'  },
  suspended: { label: 'Suspended', color: 'text-orange-600',                        bg: 'bg-orange-500/10 border-orange-500/20',  dot: 'bg-orange-500' },
  revoked:   { label: 'Revoked',   color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-500/10 border-red-500/20',        dot: 'bg-red-500'    },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  envato:         { label: 'Envato',          color: 'text-[#79c41a]',  icon: <Sparkles className="h-3 w-3" /> },
  internal:       { label: 'Own Marketplace', color: 'text-indigo-500', icon: <Package className="h-3 w-3" /> },
  own_marketplace:{ label: 'Own Marketplace', color: 'text-indigo-500', icon: <Package className="h-3 w-3" /> },
  manual:         { label: 'Manual',          color: 'text-purple-500', icon: <Tag className="h-3 w-3" /> },
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysLeft(d: string | null | undefined) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiRequest('/customer/licenses');
      setLicenses(res.data || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const copyLicense = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleShowKey = (id: string) => setShowKeyMap(p => ({ ...p, [id]: !p[id] }));

  const totalActivations = licenses.reduce((a, l) => a + (l.currentActivationCount || 0), 0);
  const totalSlots = licenses.reduce((a, l) => a + (l.activationLimit || 0), 0);
  const availableSlots = totalSlots - totalActivations;
  const activeLicenses = licenses.filter(l => l.status === 'active').length;
  const expiringSoon = licenses.filter(l => {
    const d = getDaysLeft(l.expiresAt);
    return d !== null && d > 0 && d <= 30;
  }).length;

  const envatoCount = licenses.filter(l => l.source === 'envato').length;
  const ownCount = licenses.filter(l => l.source !== 'envato').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-8 sm:p-10 rounded-3xl border border-indigo-500/20 shadow-sm"
        style={{ background: 'linear-gradient(135deg, hsl(239 84% 67% / 0.08) 0%, hsl(280 68% 60% / 0.06) 50%, hsl(330 70% 60% / 0.04) 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Customer Portal</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Welcome back, <span className="text-indigo-500">{user?.fullName?.split(' ')[0]}!</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage licensed software, download product packages, monitor activated domains, and claim marketplace purchases — all in one place.
            </p>
            {expiringSoon > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {expiringSoon} license{expiringSoon > 1 ? 's' : ''} expiring within 30 days
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link href="/dashboard/envato">
              <Button className="gap-2 h-11 px-5 font-semibold shadow-lg shadow-primary/20">
                <Sparkles className="h-4 w-4" />
                Import Envato Purchase
              </Button>
            </Link>
            <Link href="/dashboard/licenses">
              <Button variant="outline" className="gap-2 h-11 px-5 font-semibold">
                <KeyRound className="h-4 w-4" />
                Manage Licenses
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Licensed Products"
          value={licenses.length}
          description={`${activeLicenses} active`}
          icon={Box}
          color="from-indigo-500 to-indigo-600"
        />
        <StatCard
          title="Active Domains"
          value={totalActivations}
          description="Live installations"
          icon={Laptop2}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          title="Available Slots"
          value={availableSlots}
          description="Ready for new domains"
          icon={Zap}
          color="from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Account Status"
          value="Verified"
          description={user?.email || 'Active account'}
          icon={ShieldCheck}
          color="from-pink-500 to-rose-600"
        />
      </div>

      {/* Marketplace Split Stats */}
      {!loading && licenses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-card flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-[#79c41a]/10 border border-[#79c41a]/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-[#79c41a]" />
            </div>
            <div>
              <div className="text-2xl font-black">{envatoCount}</div>
              <div className="text-xs text-muted-foreground font-semibold">Envato Purchases (CodeCanyon / ThemeForest)</div>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-border bg-card flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <div className="text-2xl font-black">{ownCount}</div>
              <div className="text-xs text-muted-foreground font-semibold">Own Marketplace &amp; Manual Licenses</div>
            </div>
          </div>
        </div>
      )}

      {/* Active Licenses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-indigo-500" />
            Your License Keys
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="h-8 w-8 rounded-xl border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/dashboard/licenses" className="text-xs text-indigo-500 hover:underline font-semibold flex items-center gap-1">
              View All &amp; Manage Domains <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map(i => (
              <div key={i} className="p-6 rounded-3xl border border-border bg-card animate-pulse space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-secondary rounded" />
                    <div className="h-5 w-40 bg-secondary rounded" />
                  </div>
                  <div className="h-6 w-16 bg-secondary rounded-full" />
                </div>
                <div className="h-10 bg-secondary rounded-xl" />
                <div className="h-2 w-full bg-secondary rounded-full" />
              </div>
            ))}
          </div>
        ) : licenses.length === 0 ? (
          <div className="p-14 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-5">
            <div className="h-14 w-14 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
              <Box className="h-7 w-7 text-indigo-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold">No products licensed yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Purchased from CodeCanyon or ThemeForest? Use our 1-click import to claim your license key instantly.
              </p>
            </div>
            <Link href="/dashboard/envato">
              <Button className="gap-2 shadow-md shadow-primary/10">
                <Sparkles className="h-4 w-4" />
                Claim with Envato Purchase Code
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {licenses.slice(0, 6).map(lic => {
              const isVisible = showKeyMap[lic._id];
              const maskedKey = isVisible
                ? lic.licenseKey
                : `${lic.licenseKey?.slice(0, 8) || ''}••••••••••••${lic.licenseKey?.slice(-4) || ''}`;
              const pct = Math.min(100, Math.round(((lic.currentActivationCount || 0) / (lic.activationLimit || 1)) * 100));
              const statusCfg = STATUS_CONFIG[lic.status] || STATUS_CONFIG['active'];
              const sourceCfg = SOURCE_CONFIG[lic.source] || SOURCE_CONFIG['internal'];
              const licExpiryDays = getDaysLeft(lic.expiresAt);

              return (
                <div key={lic._id} className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-5 flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
                  <div className="space-y-4">
                    {/* Product Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${sourceCfg.color}`}>
                            {sourceCfg.icon} {sourceCfg.label}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {lic.productId?.productType?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-foreground truncate">{lic.productId?.name || 'Unknown Product'}</h3>
                        <p className="text-xs text-muted-foreground">
                          v{lic.productId?.currentVersion} · {lic.licenseType} plan
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* License Key */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold uppercase">
                        <span>License Key</span>
                        <button
                          onClick={() => toggleShowKey(lic._id)}
                          className="flex items-center gap-1 font-normal normal-case hover:text-foreground transition-colors"
                        >
                          {isVisible ? <><EyeOff className="h-3 w-3" /> hide</> : <><Eye className="h-3 w-3" /> reveal</>}
                        </button>
                      </div>
                      <div className="p-3 rounded-2xl bg-secondary/60 border border-border flex items-center justify-between gap-2">
                        <span className={`font-mono text-xs font-black tracking-wider text-foreground flex-1 min-w-0 truncate ${!isVisible ? 'blur-sm select-none' : 'select-all'}`}>
                          {maskedKey}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { if (!isVisible) { toggleShowKey(lic._id); } else copyLicense(lic.licenseKey); }}
                          className="h-7 px-2.5 text-xs font-semibold gap-1 text-indigo-500 hover:text-indigo-600 shrink-0"
                        >
                          {copiedKey === lic.licenseKey ? (
                            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> Copy</>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Slots Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">Domain Slots</span>
                        <span className={`font-mono font-bold ${pct >= 100 ? 'text-amber-500' : ''}`}>
                          {lic.currentActivationCount}/{lic.activationLimit} used
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-amber-500' : pct >= 80 ? 'bg-orange-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Expiry */}
                    {lic.expiresAt ? (
                      <div className={`text-xs flex items-center gap-1.5 ${licExpiryDays !== null && licExpiryDays < 30 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        Expires {formatDate(lic.expiresAt)}
                        {licExpiryDays !== null && licExpiryDays > 0 && licExpiryDays < 60 && (
                          <span className="font-bold">({licExpiryDays}d left)</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Infinity className="h-3.5 w-3.5" /> Lifetime license
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs pt-4 border-t border-border">
                    <Link href="/dashboard/licenses" className="text-indigo-500 hover:underline font-semibold flex items-center gap-1">
                      <Globe2 className="h-3.5 w-3.5" />
                      Domains ({(lic.activeActivations || []).length})
                    </Link>
                    <Link href="/dashboard/products" className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 transition-colors">
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {licenses.length > 6 && (
          <Link href="/dashboard/licenses" className="block text-center">
            <Button variant="outline" className="gap-2 font-semibold">
              View All {licenses.length} Licenses
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: '/dashboard/envato',
              icon: Sparkles,
              title: 'Import Envato Purchase',
              desc: 'Claim CodeCanyon & ThemeForest licenses',
              color: 'text-[#79c41a]',
              bg: 'bg-[#79c41a]/10 hover:bg-[#79c41a]/15 border-[#79c41a]/20',
            },
            {
              href: '/dashboard/products',
              icon: Download,
              title: 'Download Products',
              desc: 'Access latest ZIP packages and changelogs',
              color: 'text-indigo-500',
              bg: 'bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/20',
            },
            {
              href: '/dashboard/licenses',
              icon: Globe2,
              title: 'Manage Domains',
              desc: 'View and deactivate installation domains',
              color: 'text-purple-500',
              bg: 'bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20',
            },
          ].map(action => (
            <Link key={action.href} href={action.href}>
              <div className={`p-5 rounded-2xl border ${action.bg} flex items-center gap-4 transition-all cursor-pointer group`}>
                <div className={`h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 shadow-sm`}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground">{action.title}</p>
                  <p className="text-[11px] text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
