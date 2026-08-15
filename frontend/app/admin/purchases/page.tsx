'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Tag,
  Key,
  Globe2,
  X,
  Copy,
  Filter,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Create Purchase Modal
  const [showModal, setShowModal] = useState(false);
  const [productId, setProductId] = useState('');
  const [userId, setUserId] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [licenseType, setLicenseType] = useState('regular');
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<any>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/purchases?search=${encodeURIComponent(search)}`);
      setPurchases(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
    // Load products list for dropdown
    apiRequest('/admin/products').then((res) => {
      const items = res.data?.items || [];
      setProducts(items);
      if (items.length && !productId) setProductId(items[0]._id);
    });
  }, [search]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await apiRequest('/admin/purchases', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          userId,
          orderNumber: orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
          licenseType,
        }),
      });

      setCreatedResult(res.data);
      fetchPurchases();
    } catch (err: any) {
      alert(err.message || 'Failed to create internal purchase');
    } finally {
      setCreating(false);
    }
  };

  const filteredPurchases = purchases.filter((pur) => {
    if (sourceFilter !== 'all' && pur.source !== sourceFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Purchases & Orders Ledger</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Internal checkout purchases and verified Envato CodeCanyon / ThemeForest claims
          </p>
        </div>
        <Button onClick={() => { setCreatedResult(null); setShowModal(true); }} className="gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          Record Direct Purchase
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, purchase key, or buyer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Sources</option>
            <option value="envato">Envato Market</option>
            <option value="manual">Direct / Manual</option>
            <option value="stripe">Stripe</option>
          </select>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Order / Identifier</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Purchased At</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    Loading purchase records...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    No purchase records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((pur) => (
                  <tr key={pur._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">
                      <div className="font-bold text-foreground">
                        {pur.orderNumber || pur.externalPurchaseCode || 'Manual Order'}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span>{pur.purchaseKey || pur.externalPurchaseCode}</span>
                        <button
                          onClick={() => handleCopy(pur.purchaseKey || pur.externalPurchaseCode)}
                          className="hover:text-foreground"
                          title="Copy key"
                        >
                          {copiedKey === (pur.purchaseKey || pur.externalPurchaseCode) ? (
                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {pur.productId?.name || 'Product'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{pur.userId?.fullName || pur.buyerUsername || 'Customer'}</div>
                      <div className="text-xs text-muted-foreground">{pur.userId?.email || 'Envato Buyer'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                          pur.source === 'envato'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {pur.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                      {new Date(pur.purchasedAt || pur.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 capitalize">
                        {pur.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PURCHASE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold">Record Direct / Internal Purchase</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdResult ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Purchase recorded and License issued automatically!</span>
                </div>
                <div className="p-3 rounded-xl bg-background text-xs font-mono space-y-1">
                  <div>Purchase Key: {createdResult.purchase?.purchaseKey}</div>
                  <div>License Key: {createdResult.license?.licenseKey}</div>
                </div>
                <Button onClick={() => setShowModal(false)} className="w-full" size="sm">
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Select Product</label>
                  <select
                    required
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                  >
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (v{p.currentVersion})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Customer User ID</label>
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. 6a80439b... (Customer MongoDB ID)"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Order # / Invoice</label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. ORD-982314"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">License Tier</label>
                    <select
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                    >
                      <option value="regular">Regular License</option>
                      <option value="extended">Extended License</option>
                      <option value="lifetime">Lifetime License</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Recording...' : 'Record Purchase & Issue License'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
