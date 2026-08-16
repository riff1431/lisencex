'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Percent,
  DollarSign,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Eye,
  Users,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [selectedCouponDetails, setSelectedCouponDetails] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscountAmount: '',
    minOrderAmount: 0,
    isFirstPurchaseOnly: false,
    usageLimit: '',
    perCustomerLimit: 1,
    startDate: '',
    endDate: '',
    isActive: true,
    campaignName: '',
    offerType: 'standard',
    isFeaturedPublicOffer: false,
    publicBannerText: '',
  });

  const fetchCouponsAndStats = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (discountTypeFilter !== 'all') queryParams.append('discountType', discountTypeFilter);

      const [couponsRes, statsRes] = await Promise.all([
        apiRequest(`/admin/coupons?${queryParams.toString()}`),
        apiRequest('/admin/coupons/stats'),
      ]);

      const couponsPayload = couponsRes.data?.data || couponsRes.data;
      setCoupons(couponsPayload?.items || []);

      const statsPayload = statsRes.data?.data || statsRes.data;
      setStats(statsPayload);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load coupon data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponsAndStats();
  }, [statusFilter, discountTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCouponsAndStats();
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscountAmount: '',
      minOrderAmount: 0,
      isFirstPurchaseOnly: false,
      usageLimit: '',
      perCustomerLimit: 1,
      startDate: '',
      endDate: '',
      isActive: true,
      campaignName: '',
      offerType: 'standard',
      isFeaturedPublicOffer: false,
      publicBannerText: '',
    });
    setErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue || 0,
      maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '',
      minOrderAmount: coupon.minOrderAmount || 0,
      isFirstPurchaseOnly: !!coupon.isFirstPurchaseOnly,
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      perCustomerLimit: coupon.perCustomerLimit || 1,
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().slice(0, 10) : '',
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().slice(0, 10) : '',
      isActive: coupon.isActive !== false,
      campaignName: coupon.campaignName || '',
      offerType: coupon.offerType || 'standard',
      isFeaturedPublicOffer: !!coupon.isFeaturedPublicOffer,
      publicBannerText: coupon.publicBannerText || '',
    });
    setErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : undefined,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        isFirstPurchaseOnly: Boolean(formData.isFirstPurchaseOnly),
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
        perCustomerLimit: Number(formData.perCustomerLimit) || 1,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        isActive: Boolean(formData.isActive),
        campaignName: formData.campaignName || undefined,
        offerType: formData.offerType,
        isFeaturedPublicOffer: Boolean(formData.isFeaturedPublicOffer),
        publicBannerText: formData.publicBannerText || undefined,
      };

      if (!editingCoupon) {
        payload.code = formData.code.trim().toUpperCase();
        await apiRequest('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/admin/coupons/${editingCoupon._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      setIsCreateModalOpen(false);
      fetchCouponsAndStats();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save coupon');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (coupon: any) => {
    try {
      await apiRequest(`/admin/coupons/${coupon._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      fetchCouponsAndStats();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDeleteCoupon = async (coupon: any) => {
    if (!confirm(`Are you sure you want to permanently delete coupon "${coupon.code}"?`)) {
      return;
    }

    try {
      await apiRequest(`/admin/coupons/${coupon._id}`, {
        method: 'DELETE',
      });
      fetchCouponsAndStats();
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  const handleViewDetails = async (couponId: string) => {
    try {
      const res = await apiRequest(`/admin/coupons/${couponId}`);
      setSelectedCouponDetails(res.data?.data || res.data);
    } catch (err: any) {
      alert(err.message || 'Failed to load coupon details');
    }
  };

  const getStatusBadge = (coupon: any) => {
    const now = new Date();
    const isExpired = coupon.endDate && new Date(coupon.endDate) < now;

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Clock className="h-3 w-3" />
          Expired
        </span>
      );
    }

    if (!coupon.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
          <XCircle className="h-3 w-3" />
          Inactive
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Tag className="h-8 w-8 text-indigo-500" />
            <span>Coupons & Promotion Offers</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage promotional campaigns, discount thresholds, plan upgrades, and live store banners.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCouponsAndStats}
            disabled={loading}
            className="rounded-xl border-border gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleOpenCreateModal}
            className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Coupon</span>
          </Button>
        </div>
      </div>

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Campaigns</span>
            <Tag className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-foreground">{stats?.totalCoupons || 0}</div>
          <div className="text-[11px] text-muted-foreground">All time created</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Active Promos</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {stats?.activeCoupons || 0}
          </div>
          <div className="text-[11px] text-muted-foreground">Currently redeemable</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Redemptions</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-foreground">{stats?.totalRedemptions || 0}</div>
          <div className="text-[11px] text-muted-foreground">Orders with coupon</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Discounts</span>
            <Percent className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
            ${stats?.totalDiscountsGiven?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-muted-foreground">Savings delivered</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Attributed Sales</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ${stats?.totalAttributedRevenue?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-muted-foreground">Gross promo revenue</div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 rounded-3xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search code, campaign..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="expired">Expired Only</option>
          </select>

          {/* Type Filter */}
          <select
            value={discountTypeFilter}
            onChange={(e: any) => setDiscountTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Discount Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Coupon & Campaign</th>
                <th className="py-3 px-4">Discount Value</th>
                <th className="py-3 px-4">Rules & Conditions</th>
                <th className="py-3 px-4">Usage / Redemptions</th>
                <th className="py-3 px-4">Validity Window</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    <span>Loading coupon campaigns...</span>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground space-y-2">
                    <Tag className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No coupons found</p>
                    <p className="text-xs">Create promotional codes to attract and reward buyers.</p>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const percentVal = coupon.discountType === 'percentage';
                  return (
                    <tr key={coupon._id} className="hover:bg-secondary/20 transition-colors">
                      {/* Code & Campaign */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 font-bold">
                            {percentVal ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-mono font-bold text-foreground text-xs">{coupon.code}</div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {coupon.name}
                            </div>
                            {coupon.campaignName && (
                              <span className="text-[10px] text-indigo-500 font-semibold block">
                                {coupon.campaignName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground font-mono">
                          {percentVal ? `${coupon.discountValue}% OFF` : `$${coupon.discountValue} OFF`}
                        </div>
                        {coupon.maxDiscountAmount > 0 && percentVal && (
                          <div className="text-[10px] text-muted-foreground">Max cap: ${coupon.maxDiscountAmount}</div>
                        )}
                      </td>

                      {/* Rules */}
                      <td className="py-3.5 px-4 space-y-1">
                        {coupon.minOrderAmount > 0 && (
                          <div className="text-[11px] text-muted-foreground">Min Order: ${coupon.minOrderAmount}</div>
                        )}
                        {coupon.isFirstPurchaseOnly && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                            First Order Only
                          </span>
                        )}
                        {coupon.isFeaturedPublicOffer && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold ml-1">
                            Public Banner
                          </span>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-foreground">
                          {coupon.usedCount || 0}
                          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ' (Unlimited)'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Max {coupon.perCustomerLimit || 1}/customer
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="py-3.5 px-4 text-[11px] text-muted-foreground space-y-0.5">
                        {coupon.startDate && (
                          <div>From: {new Date(coupon.startDate).toLocaleDateString()}</div>
                        )}
                        <div>
                          {coupon.endDate
                            ? `Until: ${new Date(coupon.endDate).toLocaleDateString()}`
                            : 'No Expiration'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{getStatusBadge(coupon)}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewDetails(coupon._id)}
                            className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                            title="View Redemptions"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(coupon)}
                            className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                            title="Edit Coupon"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleStatus(coupon)}
                            className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                            title={coupon.isActive ? 'Disable' : 'Enable'}
                          >
                            {coupon.isActive ? (
                              <XCircle className="h-3.5 w-3.5 text-amber-500" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteCoupon(coupon)}
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT COUPON MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Promotional Coupon'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure discount formula, eligibility bounds, and campaign metadata.
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                ✕
              </Button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coupon Code */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. SUMMER25"
                    value={formData.code}
                    disabled={!!editingCoupon}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-mono font-bold text-foreground uppercase focus:outline-none"
                    required
                  />
                </div>

                {/* Campaign Name */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Campaign Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Launch 2026"
                    value={formData.campaignName}
                    onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Coupon Name & Description */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Display Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. 25% Off Storewide"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Description / Notes</label>
                  <textarea
                    placeholder="Optional details for internal tracking or promotion terms..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full p-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Discount Rules */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-4">
                <h4 className="text-xs font-bold text-foreground">Discount Formula</h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Discount Type</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      {formData.discountType === 'percentage' ? 'Percent Value (%)' : 'Amount Off ($)'} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-mono font-bold text-foreground focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Max Discount Cap ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 50.00"
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Min Order Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 30.00"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Global Usage Limit</label>
                    <input
                      type="number"
                      placeholder="Unlimited if blank"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Per-Customer Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.perCustomerLimit}
                      onChange={(e) => setFormData({ ...formData, perCustomerLimit: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="firstPurchase"
                    checked={formData.isFirstPurchaseOnly}
                    onChange={(e) => setFormData({ ...formData, isFirstPurchaseOnly: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="firstPurchase" className="text-xs font-medium text-foreground cursor-pointer">
                    First Purchase Only (Restricted to new customers with zero prior paid orders)
                  </label>
                </div>
              </div>

              {/* Schedule & Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">End Date (Expiration)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Public Banner Option */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-bold text-foreground">Featured Store Banner</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isFeaturedPublicOffer}
                    onChange={(e) => setFormData({ ...formData, isFeaturedPublicOffer: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-0 cursor-pointer"
                  />
                </div>

                {formData.isFeaturedPublicOffer && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Banner Announcement Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Summer Launch Deal: Get 25% off all developer plugins!"
                      value={formData.publicBannerText}
                      onChange={(e) => setFormData({ ...formData, publicBannerText: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-foreground cursor-pointer">
                    Coupon is Active and Redeemable
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl text-xs h-9 border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
                  >
                    {actionLoading ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW REDEMPTIONS DRAWER / MODAL */}
      {selectedCouponDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Redemptions for {selectedCouponDetails.coupon?.code}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedCouponDetails.coupon?.name} • Total used: {selectedCouponDetails.coupon?.usedCount || 0} times
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedCouponDetails(null)}
                className="h-8 w-8 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
              {selectedCouponDetails.recentUsages && selectedCouponDetails.recentUsages.length > 0 ? (
                selectedCouponDetails.recentUsages.map((usage: any) => (
                  <div key={usage._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-mono font-bold text-foreground">{usage.orderNumber}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(usage.usedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        -${usage.discountAmount}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Order total: ${usage.orderTotal}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No redemptions recorded for this coupon yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
