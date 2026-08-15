'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  KeyRound,
  ShoppingBag,
  Laptop2,
  Users,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  Globe2,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/analytics/overview');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">System Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time multi-channel license metrics, activations, and product distributions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOverview}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/products">
            <Button size="sm" className="gap-2">
              <Box className="h-4 w-4" />
              Manage Products
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Licenses"
          value={kpis.activeLicenses ?? '-'}
          description={`Total: ${kpis.totalLicenses ?? 0}`}
          icon={KeyRound}
          color="from-indigo-500 to-indigo-600"
        />
        <StatCard
          title="Live Installations"
          value={kpis.activeInstallations ?? '-'}
          description={`Total checks: ${kpis.totalActivations ?? 0}`}
          icon={Laptop2}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          title="Total Purchases"
          value={kpis.totalPurchases ?? '-'}
          description={`Envato: ${kpis.envatoPurchases ?? 0} | Internal: ${kpis.internalPurchases ?? 0}`}
          icon={ShoppingBag}
          color="from-pink-500 to-rose-500"
        />
        <StatCard
          title="Registered Products"
          value={kpis.totalProducts ?? '-'}
          description={`${kpis.totalCustomers ?? 0} active customers`}
          icon={Box}
          color="from-emerald-500 to-teal-600"
        />
      </div>

      {/* Tables Section: Top Products & Recent Activations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Top Products */}
        <div className="lg:col-span-6 rounded-3xl border border-border bg-card shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Box className="h-4 w-4 text-indigo-500" />
              Top Licensed Products
            </h2>
            <Link href="/admin/products" className="text-xs text-indigo-500 hover:underline font-semibold flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60 text-sm">
            {data?.topProducts?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">No products registered yet.</div>
            ) : (
              data?.topProducts?.map((prod: any) => (
                <div key={prod.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-foreground">{prod.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{prod.productType.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-xs">{prod.activeActivations} Active</p>
                    <p className="text-[11px] text-muted-foreground">{prod.totalLicenses} Licenses</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activations */}
        <div className="lg:col-span-6 rounded-3xl border border-border bg-card shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Laptop2 className="h-4 w-4 text-purple-500" />
              Recent Live Activations
            </h2>
            <Link href="/admin/activations" className="text-xs text-indigo-500 hover:underline font-semibold flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60 text-sm">
            {data?.recentActivations?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">No activations recorded yet.</div>
            ) : (
              data?.recentActivations?.map((act: any) => (
                <div key={act._id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-xs">{act.domain}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-secondary text-muted-foreground uppercase">
                        {act.environment}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{act.productId?.name || 'Product'}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                      {act.status}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(act.activatedAt).toLocaleDateString()}
                    </p>
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
