'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Key,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Zap,
  Package,
  Layers,
  Clock,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { apiRequest } from '@/lib/api';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();

  const orderNumber = searchParams.get('orderNumber') || searchParams.get('order_id') || '';
  const transactionId = searchParams.get('transactionId') || searchParams.get('pp_id') || '';
  const gateway = searchParams.get('gateway') || 'piprapay';

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }

    const fetchOrderStatus = async () => {
      try {
        setLoading(true);
        const res = await apiRequest(`/public/orders/status/${encodeURIComponent(orderNumber)}`);
        const data = res.data || res;
        if (data?.order) {
          setOrderData(data.order);
          setLicenses(data.licenses || []);
        }
      } catch (err) {
        console.warn('Could not fetch public order status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();
  }, [orderNumber]);

  const handleCopyKey = (keyString: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKey(keyString);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyOrderNumber = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber);
    setCopiedOrderNumber(true);
    setTimeout(() => setCopiedOrderNumber(false), 2000);
  };

  const downloadLicenseFile = (license: any) => {
    const textContent = `LICENSENEST LICENSE CERTIFICATE
=====================================================
License Key: ${license.licenseKey || license.key}
Status: ${license.status?.toUpperCase() || 'ACTIVE'}
Order Number: ${orderNumber}
Type: ${license.licenseType?.toUpperCase() || 'REGULAR'}
Purchased: ${new Date().toLocaleDateString()}
Domain Limits: ${license.maxDomains || 1} domains
=====================================================
Thank you for your purchase!
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `license-${orderNumber || 'licensenest'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-8 animate-in fade-in zoom-in-95 duration-300">
      {/* Top Success Banner */}
      <div className="p-8 sm:p-10 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent text-center space-y-4 shadow-xl shadow-emerald-500/5">
        <div className="h-20 w-20 rounded-3xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-500/10 animate-bounce duration-1000">
          <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            Payment Succeeded & Licenses Issued
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Thank You for Your Order!
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your payment was processed successfully via <strong className="text-foreground capitalize">{gateway}</strong>. Your license keys have been generated and activated.
          </p>
        </div>

        {orderNumber && (
          <div className="pt-2 flex items-center justify-center gap-2">
            <div className="px-4 py-2 rounded-2xl bg-secondary/80 border border-border font-mono text-xs font-bold text-foreground flex items-center gap-2">
              <span className="text-muted-foreground">Order Ref:</span>
              <span>{orderNumber}</span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy order number"
              >
                {copiedOrderNumber ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {transactionId && (
              <div className="px-4 py-2 rounded-2xl bg-secondary/40 border border-border font-mono text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
                <span>Txn:</span>
                <span className="truncate max-w-[140px]">{transactionId}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generated Licenses Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Key className="h-5 w-5 text-emerald-500" />
              Your Active License Keys
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Copy your license key to activate your software or download the key file
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {licenses.length > 0 ? `${licenses.length} Key(s) Ready` : 'Instant Delivery'}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs text-muted-foreground">Loading your generated license details...</p>
          </div>
        ) : licenses.length > 0 ? (
          <div className="space-y-4">
            {licenses.map((lic, idx) => {
              const keyVal = lic.licenseKey || lic.key || `LIC-${orderNumber}-${idx + 1}`;
              const isCopied = copiedKey === keyVal;

              return (
                <div
                  key={lic._id || idx}
                  className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-card to-card space-y-4 hover:border-emerald-500/50 transition-all shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {lic.productName || lic.planName || 'License Key'}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                          {lic.status || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span>Type: {lic.licenseType || 'Regular'}</span>
                        <span>•</span>
                        <span>Max Domains: {lic.maxDomains || 1}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadLicenseFile(lic)}
                        className="rounded-xl text-xs h-9 px-3"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download Key
                      </Button>
                    </div>
                  </div>

                  {/* License Key Box */}
                  <div className="p-3.5 rounded-xl bg-secondary/80 border border-border flex items-center justify-between gap-3 font-mono text-sm">
                    <span className="font-bold text-foreground tracking-wider select-all truncate">
                      {keyVal}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyKey(keyVal)}
                      className={`rounded-lg shrink-0 text-xs h-8 px-3 ${
                        isCopied ? 'bg-emerald-600 text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy Key
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback License Card if order query in progress */
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">Generated License Key</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-secondary/80 border border-border flex items-center justify-between gap-3 font-mono text-sm">
              <span className="font-bold text-foreground tracking-wider select-all truncate">
                {`LIC-${orderNumber ? orderNumber.replace('ORD-', '') : 'AUTO-FULFILLED'}-KEY`}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => handleCopyKey(`LIC-${orderNumber ? orderNumber.replace('ORD-', '') : 'AUTO-FULFILLED'}-KEY`)}
                className="rounded-lg shrink-0 text-xs h-8 px-3"
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy Key
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Your license has also been permanently added to your customer dashboard.
            </p>
          </div>
        )}
      </div>

      {/* Order Summary & CTA Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Link href="/dashboard/licenses" className="block">
          <div className="p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all space-y-2 group shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
              Manage Licenses
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-muted-foreground">
              Bind domains, activate installations and view license telemetry.
            </p>
          </div>
        </Link>

        <Link href="/dashboard/orders" className="block">
          <div className="p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all space-y-2 group shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
              View Order History
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-muted-foreground">
              Download invoices, receipts, and order confirmation documents.
            </p>
          </div>
        </Link>

        <Link href="/store" className="block">
          <div className="p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all space-y-2 group shadow-xs">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground flex items-center justify-between">
              Continue Shopping
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-muted-foreground">
              Browse more developer plugins, themes, and enterprise templates.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-24 text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
          <p className="text-sm text-muted-foreground">Finalizing your order and licenses...</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
