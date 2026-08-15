'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function CustomerEnvatoPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [purchaseCode, setPurchaseCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await apiRequest('/public/products');
        const items = res.data?.items || [];
        setProducts(items);
        if (items.length > 0) setProductId(items[0]._id);
      } catch (err) {
        console.error(err);
      }
    }
    loadProducts();
  }, []);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessData(null);
    setLoading(true);

    try {
      const res = await apiRequest('/customer/purchases/claim-envato', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          purchaseCode: purchaseCode.trim(),
        }),
      });

      setSuccessData(res.data);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your purchase code.');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fillSampleCode = () => {
    setPurchaseCode('8f3a9b2c-1e4d-4a6b-9c8e-7d6f5e4a3b2c');
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-500 mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Envato CodeCanyon & ThemeForest Claims</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Claim Your Envato License</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter the purchase code from your Envato receipt to verify ownership and issue your secret license key
        </p>
      </div>

      {successData ? (
        <div className="p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Purchase Verified Successfully!</h2>
              <p className="text-xs text-muted-foreground">
                Your license has been created and bound to your account.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Your Secret License Key</label>
            <div className="p-3.5 rounded-xl bg-secondary border border-border flex items-center justify-between">
              <span className="font-mono text-sm font-black text-foreground">
                {successData.license?.licenseKey}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyKey(successData.license?.licenseKey)}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {copied ? 'Copied!' : 'Copy Key'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link href="/customer/licenses">
              <Button className="gap-2 shadow-sm font-semibold">
                Go to License Manager
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setSuccessData(null)}>
              Claim Another Purchase
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleClaim} className="space-y-5 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Select Purchased Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium"
              >
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (v{p.currentVersion})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Envato Purchase Code</label>
              <input
                type="text"
                required
                value={purchaseCode}
                onChange={(e) => setPurchaseCode(e.target.value)}
                placeholder="e.g. 8f3a9b2c-1e4d-4a6b-9c8e-7d6f5e4a3b2c"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background font-mono text-sm focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Find your purchase code in your CodeCanyon / ThemeForest &quot;Downloads&quot; tab → &quot;License Certificate & purchase code&quot;.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !purchaseCode}
              className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20"
            >
              {loading ? 'Verifying with Envato...' : 'Verify & Issue License'}
            </Button>
          </form>

          {/* Quick sample fill */}
          <div className="pt-3 border-t border-border">
            <button
              type="button"
              onClick={fillSampleCode}
              className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Click here to fill a sample Envato Purchase Code for instant testing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
