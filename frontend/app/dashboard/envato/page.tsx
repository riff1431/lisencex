'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles, CheckCircle2, AlertCircle, ArrowRight, HelpCircle,
  Copy, KeyRound, Package, ExternalLink, RefreshCw, Search,
  Shield, ArrowLeft, Info, X, Zap, Globe2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

type Step = 'idle' | 'searching' | 'found' | 'claiming' | 'success' | 'error';

const SAMPLE_CODES = [
  '8f3a9b2c-1e4d-4a6b-9c8e-7d6f5e4a3b2c',
  '3c7e9a1b-5f2d-4b8e-8a6c-2d4f6e8a2c4e',
];

export default function DashboardEnvatoPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productId, setProductId] = useState('');
  const [purchaseCode, setPurchaseCode] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [existingLicenses, setExistingLicenses] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoadingProducts(true);
      try {
        const [prodRes, licRes] = await Promise.all([
          apiRequest('/public/products'),
          apiRequest('/customer/licenses').catch(() => ({ data: [] })),
        ]);
        const items = prodRes.data?.items || [];
        setProducts(items);
        if (items.length > 0) setProductId(items[0]._id);
        setExistingLicenses(licRes.data || []);
      } catch {
        // silent
      } finally {
        setLoadingProducts(false);
      }
    }
    load();
  }, []);

  // Auto-detect product by searching for matching Envato item name in the purchase code
  const detectProduct = (code: string) => {
    // For now just take first product — in a real scenario could match by item ID
    if (products.length > 0 && !productId) setProductId(products[0]._id);
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseCode.trim() || !productId) return;
    setError('');
    setSuccessData(null);
    setStep('claiming');

    try {
      const res = await apiRequest('/customer/purchases/claim-envato', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          purchaseCode: purchaseCode.trim(),
        }),
      });
      setSuccessData(res.data);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your purchase code and selected product.');
      setStep('error');
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setPurchaseCode('');
    setStep('idle');
    setError('');
    setSuccessData(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectedProduct = products.find(p => p._id === productId);

  // Check if this purchase code already claimed
  const alreadyClaimed = existingLicenses.some(
    l => l.source === 'envato' && l.productId?._id === productId,
  );

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#79c41a]/30 bg-[#79c41a]/10 text-[11px] font-bold text-[#79c41a] uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
          Envato CodeCanyon &amp; ThemeForest
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Import Envato Purchase</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Verify your Envato purchase code, identify your product, and receive a secure license key tied to your account.
        </p>
      </div>

      {/* Already claimed notice */}
      {!loadingProducts && alreadyClaimed && step === 'idle' && (
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-3 text-xs">
          <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-600 dark:text-amber-400">You already have a license for this product</p>
            <p className="text-muted-foreground">
              If you are trying to claim a different purchase, please select the correct product below. Duplicate claims are prevented.
            </p>
            <Link href="/dashboard/licenses" className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1 mt-1">
              View your existing licenses <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Success State */}
      {step === 'success' && successData ? (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Purchase Verified!</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {successData.message || 'Your license has been created and linked to your account.'}
                </p>
              </div>
            </div>

            {/* Product Info */}
            {successData.purchase?.productId && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Package className="h-4.5 w-4.5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-bold">{selectedProduct?.name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {selectedProduct?.productType?.replace(/_/g, ' ')} · v{selectedProduct?.currentVersion}
                  </p>
                </div>
              </div>
            )}

            {/* License Key */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Your Secret License Key
              </label>
              <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-black text-foreground select-all tracking-wider">
                  {successData.license?.licenseKey}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyKey(successData.license?.licenseKey)}
                  className="h-8 text-xs font-semibold gap-1.5 shrink-0"
                >
                  {copied ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy Key</>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                Keep this key secret. Use it to activate your product installation.
              </p>
            </div>

            {/* Activation Details */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Slots', value: successData.license?.activationLimit || 1, icon: Zap },
                { label: 'Status', value: successData.license?.status || 'active', icon: CheckCircle2 },
                { label: 'Source', value: 'Envato', icon: Globe2 },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-secondary/60 border border-border text-center space-y-1">
                  <item.icon className="h-4 w-4 mx-auto text-muted-foreground" />
                  <div className="font-bold capitalize">{item.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/dashboard/licenses" className="flex-1">
                <Button className="w-full gap-2 h-11 font-semibold shadow-md shadow-primary/10">
                  <KeyRound className="h-4 w-4" />
                  Go to License Manager
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" onClick={reset} className="h-11 px-5 font-semibold gap-2">
                <ArrowLeft className="h-4 w-4" />
                Claim Another
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Form State */
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
          {/* Error Banner */}
          {step === 'error' && error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-destructive">Verification Failed</p>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <button onClick={() => { setStep('idle'); setError(''); }} className="ml-auto text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleClaim} className="space-y-5">
            {/* Product Selector */}
            <div className="space-y-2">
              <label className="text-sm font-bold block">1. Select Your Purchased Product</label>
              {loadingProducts ? (
                <div className="h-11 rounded-xl border border-border bg-secondary animate-pulse" />
              ) : products.length === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
                  No products found in marketplace
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map(p => (
                    <label
                      key={p._id}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        productId === p._id
                          ? 'border-indigo-500/40 bg-indigo-500/5 shadow-sm shadow-indigo-500/10'
                          : 'border-border hover:border-indigo-500/20 hover:bg-secondary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="product"
                        value={p._id}
                        checked={productId === p._id}
                        onChange={() => setProductId(p._id)}
                        className="accent-indigo-500"
                      />
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {p.productType?.replace(/_/g, ' ')} · v{p.currentVersion}
                        </p>
                      </div>
                      {productId === p._id && (
                        <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase Code Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold block">2. Enter Your Envato Purchase Code</label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  required
                  value={purchaseCode}
                  onChange={e => { setPurchaseCode(e.target.value); detectProduct(e.target.value); }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all"
                />
                {purchaseCode && (
                  <button
                    type="button"
                    onClick={() => setPurchaseCode('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>
                  Find your purchase code in your Envato account under{' '}
                  <a
                    href="https://codecanyon.net/downloads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:underline font-semibold"
                  >
                    Downloads <ExternalLink className="h-2.5 w-2.5 inline" />
                  </a>
                  {' '}→ "License Certificate &amp; purchase code"
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={step === 'claiming' || !purchaseCode.trim() || !productId}
              className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/15 gap-2"
            >
              {step === 'claiming' ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Verifying with Envato...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Verify &amp; Claim License Key</>
              )}
            </Button>
          </form>

          {/* Sample Code Fill */}
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Quick Test</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_CODES.map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setPurchaseCode(code)}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-indigo-500 hover:border-indigo-500/30 font-mono transition-all"
                >
                  {code.slice(0, 18)}...
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              These are sample purchase codes for development testing.
            </p>
          </div>
        </div>
      )}

      {/* How It Works Info Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              step: '1',
              title: 'Select Product',
              desc: 'Choose the product you purchased on CodeCanyon or ThemeForest.',
              color: 'text-indigo-500 bg-indigo-500/10',
            },
            {
              step: '2',
              title: 'Enter Purchase Code',
              desc: 'Paste your Envato purchase code from the download receipt.',
              color: 'text-purple-500 bg-purple-500/10',
            },
            {
              step: '3',
              title: 'Get License Key',
              desc: 'We verify with Envato and generate a secure license key instantly.',
              color: 'text-emerald-500 bg-emerald-500/10',
            },
          ].map(item => (
            <div key={item.step} className="p-4 rounded-2xl border border-border bg-card space-y-2">
              <div className={`h-7 w-7 rounded-lg ${item.color} flex items-center justify-center font-black text-sm`}>
                {item.step}
              </div>
              <p className="font-bold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
