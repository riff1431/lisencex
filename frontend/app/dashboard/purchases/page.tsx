'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Tag,
  Key,
  Download,
  Copy,
  ExternalLink,
  Sparkles,
  Package,
  Calendar,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function CustomerPurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/customer/purchases');
      const data = res.data?.data || res.data || [];
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch customer purchases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Tag className="h-6 w-6 text-indigo-500" />
            <span>My Purchases & Claims</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            All registered product purchases across your Direct Marketplace and Envato CodeCanyon accounts.
          </p>
        </div>

        <Link href="/dashboard/envato">
          <Button size="sm" variant="outline" className="rounded-xl font-semibold gap-1.5 border-border">
            <Sparkles className="h-4 w-4 text-[#79c41a]" />
            <span>Claim Envato Code</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading your purchases...</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-foreground">No Purchases Recorded</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You haven&apos;t completed any purchases or claimed any Envato licenses yet.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/store">
              <Button size="sm" className="rounded-xl font-semibold">
                Browse Store
              </Button>
            </Link>
            <Link href="/dashboard/envato">
              <Button size="sm" variant="outline" className="rounded-xl font-semibold">
                Import Envato Item
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {purchases.map((purchase) => {
            const isEnvato = purchase.source === 'envato';
            const code = isEnvato ? purchase.externalPurchaseCode : purchase.purchaseKey;

            return (
              <div
                key={purchase._id || purchase.id}
                className="p-5 rounded-2xl border border-border bg-card space-y-4 hover:border-border/80 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Source badge & Date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${
                        isEnvato
                          ? 'bg-[#79c41a]/10 text-[#79c41a] border-[#79c41a]/20'
                          : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                      }`}
                    >
                      {isEnvato ? <Sparkles className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                      <span>{isEnvato ? 'Envato CodeCanyon' : 'Direct Store'}</span>
                    </span>

                    <span className="text-[11px] text-muted-foreground">
                      {new Date(purchase.purchasedAt || purchase.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3 className="font-bold text-base text-foreground">
                    {purchase.productId?.name || 'Licensed Product'}
                  </h3>

                  {/* Purchase Code display */}
                  <div className="mt-3 p-2.5 rounded-xl bg-secondary/40 border border-border flex items-center justify-between gap-2 font-mono text-xs">
                    <span className="truncate select-all text-muted-foreground">{code}</span>
                    <button
                      onClick={() => copyToClipboard(code)}
                      className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Copy Code"
                    >
                      {copiedKey === code ? (
                        <span className="text-[10px] font-bold text-emerald-500">Copied!</span>
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <Link
                    href="/dashboard/licenses"
                    className="text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1"
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>View License Key</span>
                  </Link>

                  <Link href="/dashboard/downloads">
                    <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold gap-1">
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
