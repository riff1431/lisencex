'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Layers,
  KeyRound,
  ShoppingBag,
  Users,
  HardDriveDownload,
  AlertOctagon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminReportsPage() {
  const [overview, setOverview] = useState<any>({
    products: 0,
    purchases: 0,
    licenses: 0,
    activations: 0,
    customers: 0,
    downloads: 0,
    validationChecks: 0,
    blockedEntities: 0,
  });

  const [chartsData, setChartsData] = useState<any>({
    licenseGrowth: [],
    activationGrowth: [],
    marketplaceDistribution: [],
    versionUsage: [],
  });

  const [performance, setPerformance] = useState<any[]>([]);
  const [failedActivations, setFailedActivations] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any>({
    active: 0,
    expired: 0,
    suspended: 0,
    revoked: 0,
    unused: 0,
  });
  const [limitUsage, setLimitUsage] = useState<any[]>([]);

  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    productId: '',
    marketplace: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const queryStr = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v !== '')
      ).toString();

      const [overviewRes, chartsRes, perfRes, failedRes, statusRes, limitRes] =
        await Promise.all([
          apiRequest(`/admin/analytics/overview?${queryStr}`),
          apiRequest(`/admin/analytics/charts?${queryStr}`),
          apiRequest(`/admin/analytics/products-performance?${queryStr}`),
          apiRequest(`/admin/analytics/failed-activations?${queryStr}`),
          apiRequest(`/admin/analytics/status-breakdown?${queryStr}`),
          apiRequest(`/admin/analytics/limit-usage?${queryStr}`),
        ]);

      setOverview(
        overviewRes.data || {
          products: 0,
          purchases: 0,
          licenses: 0,
          activations: 0,
          customers: 0,
          downloads: 0,
          validationChecks: 0,
          blockedEntities: 0,
        }
      );
      setChartsData(
        chartsRes.data || {
          licenseGrowth: [],
          activationGrowth: [],
          marketplaceDistribution: [],
          versionUsage: [],
        }
      );
      setPerformance(perfRes.data || []);
      setFailedActivations(failedRes.data || []);
      setStatusBreakdown(
        statusRes.data || { active: 0, expired: 0, suspended: 0, revoked: 0, unused: 0 }
      );
      setLimitUsage(limitRes.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load products list for filters dropdown
    apiRequest('/admin/products').then((res) => {
      setProducts(res.data?.items || []);
    });
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [filters]);

  const handleExportCsv = async (reportType: string) => {
    setExporting(true);
    try {
      const res = await apiRequest('/admin/analytics/export-csv', {
        method: 'POST',
        body: JSON.stringify({
          reportType,
          query: Object.entries(filters).reduce((acc: any, [k, v]) => {
            if (v !== '') acc[k] = v;
            return acc;
          }, {}),
        }),
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(res.data.csv);
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      productId: '',
      marketplace: '',
      status: '',
      startDate: '',
      endDate: '',
    });
  };

  // Helper to render dual SVG Line chart
  const renderLineChart = (data: any[], keyName: string, color: string) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
          No timeline data available
        </div>
      );
    }

    const maxVal = Math.max(...data.map((d) => d.count), 1);
    const width = 500;
    const height = 150;
    const padding = 20;

    const points = data.map((d, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - (d.count / maxVal) * (height - padding * 2);
      return `${x},${y}`;
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + ratio * (height - padding * 2);
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          );
        })}
        {/* Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          points={points.join(' ')}
          className="transition-all duration-300"
        />
        {/* Dots */}
        {data.map((d, index) => {
          const [x, y] = points[index].split(',');
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3.5"
              className="fill-background stroke-[2px] transition-all hover:r-[5px] cursor-pointer"
              stroke={color}
            />
          );
        })}
      </svg>
    );
  };

  // Helper for Marketplace Donut Conic Gradient calculation
  const getConicGradient = (items: any[]) => {
    if (!items || items.length === 0) return 'var(--muted)';
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return 'var(--muted)';

    const colors = [
      'hsl(var(--primary))',
      '#10b981',
      '#f59e0b',
      '#3b82f6',
      '#ec4899',
    ];

    let currentAngle = 0;
    const gradients = items.map((item, index) => {
      const percent = (item.value / total) * 100;
      const nextAngle = currentAngle + (percent * 360) / 100;
      const segment = `${colors[index % colors.length]} ${currentAngle}deg ${nextAngle}deg`;
      currentAngle = nextAngle;
      return segment;
    });

    return `conic-gradient(${gradients.join(', ')})`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Admin Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Optimize database queries, review activations performance, and export csv datasets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchAllData} variant="outline" className="gap-2 font-bold shadow-xs">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-xs text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filter Analytics Reports
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Product Select */}
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Product</label>
            <select
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Marketplace Select */}
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Marketplace</label>
            <select
              value={filters.marketplace}
              onChange={(e) => setFilters({ ...filters, marketplace: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="">All Marketplaces</option>
              <option value="internal">Own Marketplace</option>
              <option value="envato">Envato</option>
              <option value="manual">Manual Admin</option>
              <option value="reseller">Reseller</option>
              <option value="bulk">Bulk Batch</option>
            </select>
          </div>

          {/* Status Select */}
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">License Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Start Date</label>
            <div className="relative">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">End Date</label>
            <div className="relative">
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <button
            onClick={handleResetFilters}
            className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear Filters
          </button>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => handleExportCsv('products')}
              className="text-xs font-bold gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export Performance
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={() => handleExportCsv('failed')}
              className="text-xs font-bold gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export Failures
            </Button>
          </div>
        </div>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Products */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Products</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{overview.products}</div>
          </div>
        </div>

        {/* Purchases */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Purchases</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{overview.purchases}</div>
          </div>
        </div>

        {/* Licenses */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Licenses</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{overview.licenses}</div>
          </div>
        </div>

        {/* Activations */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Activations</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">{overview.activations}</div>
          </div>
        </div>
      </div>

      {/* SECONDARY STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Customers */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-pink-500/10 text-pink-500">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Customers</div>
            <div className="text-lg sm:text-xl font-black mt-0.5">{overview.customers}</div>
          </div>
        </div>

        {/* Downloads */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-500">
            <HardDriveDownload className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Downloads</div>
            <div className="text-lg sm:text-xl font-black mt-0.5">{overview.downloads}</div>
          </div>
        </div>

        {/* Validation Checks */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Validation Checks</div>
            <div className="text-lg sm:text-xl font-black mt-0.5">{overview.validationChecks}</div>
          </div>
        </div>

        {/* Blocked Entities */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Blocked Entites</div>
            <div className="text-lg sm:text-xl font-black mt-0.5">{overview.blockedEntities}</div>
          </div>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Growth Timelines */}
        <div className="md:col-span-2 p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            License & Activation Growth Trends (30 Days)
          </h2>
          <div className="space-y-6">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex justify-between">
                <span>License Key Growth</span>
                <span>{chartsData.licenseGrowth.length} points logged</span>
              </div>
              <div className="h-36 bg-secondary/20 rounded-2xl p-2 border border-border">
                {renderLineChart(chartsData.licenseGrowth, 'date', 'hsl(var(--primary))')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex justify-between">
                <span>Active Activations Growth</span>
                <span>{chartsData.activationGrowth.length} points logged</span>
              </div>
              <div className="h-36 bg-secondary/20 rounded-2xl p-2 border border-border">
                {renderLineChart(chartsData.activationGrowth, 'date', '#3b82f6')}
              </div>
            </div>
          </div>
        </div>

        {/* Donut & Version Usage */}
        <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-5">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            Marketplace Distributions
          </h2>
          <div className="flex flex-col items-center justify-center py-4 space-y-5">
            <div
              className="w-32 h-32 rounded-full border-4 border-card relative shadow-inner flex items-center justify-center"
              style={{ background: getConicGradient(chartsData.marketplaceDistribution) }}
            >
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center text-[10px] uppercase font-black text-muted-foreground">
                Origins
              </div>
            </div>
            <div className="w-full grid grid-cols-2 gap-2 text-[10px] font-bold">
              {chartsData.marketplaceDistribution.map((m: any, index: number) => {
                const colors = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
                return (
                  <div key={m.name} className="flex items-center gap-1.5 p-1 bg-secondary/40 rounded-lg">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    <span className="truncate">{m.name.toUpperCase()}:</span>
                    <span className="text-foreground ml-auto">{m.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* LOWER GRIDS: PRODUCT PERFORMANCE & STATUS BLOCK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Product Performance Table */}
        <div className="md:col-span-2 p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
          <h2 className="text-sm font-bold">Product-wise Performance</h2>
          <div className="overflow-x-auto border border-border rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-right">Licenses</th>
                  <th className="px-4 py-3 text-right">Activations</th>
                  <th className="px-4 py-3 text-right">Suspended</th>
                  <th className="px-4 py-3 text-right">Revoked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {performance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No product metrics recorded.
                    </td>
                  </tr>
                ) : (
                  performance.map((row) => (
                    <tr key={row._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground">{row.productName}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{row.productSlug}</td>
                      <td className="px-4 py-3 text-right font-bold">{row.licenseCount}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-500">{row.activeActivations}</td>
                      <td className="px-4 py-3 text-right text-amber-500">{row.suspendedCount}</td>
                      <td className="px-4 py-3 text-right text-rose-500">{row.revokedCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* License status, slots usage & version distributions */}
        <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-5">
          <h2 className="text-sm font-bold">Status & Slot Distributions</h2>

          {/* Status Indicators */}
          <div className="space-y-2 text-xs font-semibold">
            {/* Active */}
            <div className="flex items-center justify-between p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <span className="text-emerald-500">Active Licenses</span>
              <span>{statusBreakdown.active}</span>
            </div>
            {/* Expired */}
            <div className="flex items-center justify-between p-2 bg-muted/40 rounded-xl border border-border">
              <span className="text-muted-foreground">Expired Licenses</span>
              <span>{statusBreakdown.expired}</span>
            </div>
            {/* Suspended */}
            <div className="flex items-center justify-between p-2 bg-amber-500/5 rounded-xl border border-amber-500/10">
              <span className="text-amber-500">Suspended Licenses</span>
              <span>{statusBreakdown.suspended}</span>
            </div>
            {/* Revoked */}
            <div className="flex items-center justify-between p-2 bg-rose-500/5 rounded-xl border border-rose-500/10">
              <span className="text-rose-500">Revoked Licenses</span>
              <span>{statusBreakdown.revoked}</span>
            </div>
            {/* Unused */}
            <div className="flex items-center justify-between p-2 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <span className="text-blue-500">Unused Licenses (0 slots)</span>
              <span>{statusBreakdown.unused}</span>
            </div>
          </div>

          {/* Activation slot limits usage preview */}
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-xs font-bold text-foreground">Slots Utilization Profile</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {limitUsage.map((row, index) => {
                const ratio = row.limit > 0 ? (row.currentCount / row.limit) * 100 : 100;
                return (
                  <div key={index} className="text-[10px] space-y-1">
                    <div className="flex justify-between font-bold text-muted-foreground">
                      <span>{row.currentCount} / {row.limit} slots</span>
                      <span>{row.licensesCount} keys ({ratio.toFixed(0)}% full)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(ratio, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM LOGS: RECENT FAILED VALIDATIONS */}
      <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-2 text-rose-500">
          <AlertTriangle className="h-4 w-4" />
          Recent Failed Validation & Activation Logs
        </h2>
        <div className="overflow-x-auto border border-border rounded-2xl text-[11px]">
          <table className="w-full text-left">
            <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">License Key</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="font-mono divide-y divide-border">
              {failedActivations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground font-sans">
                    No failed validations registered.
                  </td>
                </tr>
              ) : (
                failedActivations.map((log) => (
                  <tr key={log.id} className="hover:bg-rose-500/5 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 font-sans font-bold">{log.productName}</td>
                    <td className="px-4 py-2 font-bold">{log.licenseKey}</td>
                    <td className="px-4 py-2">{log.domain || '-'}</td>
                    <td className="px-4 py-2 text-rose-500 font-bold">{log.status}</td>
                    <td className="px-4 py-2 font-sans max-w-xs truncate" title={log.message}>{log.message}</td>
                    <td className="px-4 py-2 text-muted-foreground">{log.ip}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
