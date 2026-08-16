'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Package,
  Key,
  Download,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Copy,
  AlertCircle,
  Zap,
  Building2,
  Tag,
  Percent,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { apiRequest } from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, cartTotal, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<'simulator' | 'stripe' | 'paypal' | 'manual'>('simulator');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [fulfillment, setFulfillment] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponValidationLoading, setCouponValidationLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [publicOffers, setPublicOffers] = useState<any[]>([]);

  // Form states
  const [cardName, setCardName] = useState('John Doe');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');

  useEffect(() => {
    // Load public promotional offers
    const fetchOffers = async () => {
      try {
        const res = await apiRequest('/public/coupons/offers');
        setPublicOffers(res.data?.data || res.data || []);
      } catch (err) {
        // silent fallback
      }
    };
    fetchOffers();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) return;

    setCouponValidationLoading(true);
    setCouponError(null);

    try {
      const res = await apiRequest('/customer/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code,
          items: items.map((i) => ({
            productId: i.productId,
            licensePlanId: i.licensePlanId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = res.data?.data || res.data;
      if (data?.valid) {
        setAppliedCoupon(data);
        setCouponInput(code);
      } else {
        throw new Error(data?.message || 'Invalid coupon');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Coupon could not be applied');
    } finally {
      setCouponValidationLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const finalTotalDue = appliedCoupon ? appliedCoupon.finalTotal : cartTotal;
  const discountSavings = appliedCoupon ? appliedCoupon.discountAmount : 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      router.push('/store');
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      // Step 1: Create Order (with couponCode if applied)
      const orderRes = await apiRequest('/customer/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            licensePlanId: i.licensePlanId,
            quantity: i.quantity,
          })),
          couponCode: appliedCoupon?.coupon?.code || undefined,
        }),
      });

      const orderData = orderRes.data?.data || orderRes.data;
      const orderId = orderData?._id || orderData?.id;

      if (!orderId) {
        throw new Error('Failed to create order document');
      }

      // Step 2: Initiate Payment Session with Gateway
      const checkoutRes = await apiRequest('/customer/payments/initiate-checkout', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          gateway: paymentMethod,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout`,
          paymentMethodDetails: {
            brand: 'Visa',
            last4: '4242',
          },
        }),
      });

      const checkoutData = checkoutRes.data?.data || checkoutRes.data;
      const session = checkoutData?.session;
      const txnId = checkoutData?.transactionId;

      if (paymentMethod === 'simulator') {
        // Step 3: Complete Simulator with Cryptographic HMAC Token Verification
        const completeRes = await apiRequest('/customer/payments/simulator-complete', {
          method: 'POST',
          body: JSON.stringify({
            transactionId: txnId,
            simulatedToken: session.simulatedToken,
            cardBrand: 'Visa (Verified Test)',
            cardLast4: '4242',
          }),
        });

        const completeData = completeRes.data?.data || completeRes.data;
        setCompletedOrder(completeData?.order || orderData);
        setTransaction(completeData?.transaction);
        setFulfillment(completeData?.fulfillmentResults || []);
        clearCart();
      } else if (paymentMethod === 'manual') {
        // Manual Wire Transfer Order
        setCompletedOrder(orderData);
        setTransaction({ transactionId: txnId, status: 'pending', gateway: 'manual' });
        clearCart();
      } else {
        // Live Stripe / PayPal checkout redirect
        if (session?.checkoutUrl) {
          window.location.href = session.checkoutUrl;
        } else {
          throw new Error(`Checkout session URL not available for ${paymentMethod}`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed. Please check your payment details.');
    } finally {
      setProcessing(false);
    }
  };

  // SUCCESSFUL CHECKOUT STATE
  if (completedOrder) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {transaction?.status === 'paid' || completedOrder?.paymentStatus === 'paid'
                ? 'Payment Confirmed'
                : 'Order Pending Wire Transfer'}
            </span>
            <h1 className="text-3xl font-black text-foreground mt-1">Thank You for Your Order!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Order <span className="font-mono font-bold text-foreground">#{completedOrder.orderNumber}</span> • Ref:{' '}
              <span className="font-mono text-foreground">{transaction?.transactionId || 'TXN-CONFIRMED'}</span>
            </p>
            {completedOrder.discountAmount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Tag className="h-3.5 w-3.5" />
                <span>Saved ${completedOrder.discountAmount} with code {completedOrder.couponCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* FULFILLMENT: ISSUED LICENSES */}
        {fulfillment && fulfillment.length > 0 && (
          <div className="p-6 rounded-3xl border border-border bg-card space-y-4 shadow-xs">
            <div className="flex items-center gap-2 text-foreground font-black text-lg">
              <Key className="h-5 w-5 text-indigo-500" />
              <span>Your Activated License Keys</span>
            </div>
            <p className="text-xs text-muted-foreground">
              These cryptographic licenses have been instantly linked to your account. Use them to activate your software installations.
            </p>

            <div className="space-y-3 pt-2">
              {fulfillment.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-foreground">{item.productName}</div>
                    <div className="text-xs text-muted-foreground font-mono">Purchase: {item.purchaseKey}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-card border border-border text-foreground tracking-wider select-all">
                      {item.licenseKey}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(item.licenseKey)}
                      className="h-8 w-8 rounded-lg border-border"
                      title="Copy Key"
                    >
                      {copiedKey === item.licenseKey ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard/downloads" className="flex-1">
            <Button className="w-full h-11 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-xs">
              <Download className="h-4 w-4" />
              <span>Download Product ZIPs</span>
            </Button>
          </Link>
          <Link href="/dashboard/licenses" className="flex-1">
            <Button variant="outline" className="w-full h-11 rounded-2xl font-bold gap-2 border-border">
              <Key className="h-4 w-4" />
              <span>Manage Licenses</span>
            </Button>
          </Link>
          <Link href="/dashboard/orders">
            <Button variant="ghost" className="h-11 rounded-2xl font-semibold gap-2">
              <Package className="h-4 w-4" />
              <span>View Orders</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // EMPTY CART REDIRECT
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="h-16 w-16 rounded-3xl bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Your Cart is Empty</h2>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Explore our verified store catalog to select software plugins, themes, and applications.
        </p>
        <div className="pt-2">
          <Link href="/store">
            <Button className="rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Browse Products</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-indigo-500" />
          <span>Secure Checkout</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Complete your order to instantly receive cryptographic license keys and download package access.
        </p>
      </div>

      {/* Featured Public Promotional Banner */}
      {publicOffers.length > 0 && !appliedCoupon && (
        <div className="p-4 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
              <Percent className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-foreground block">
                {publicOffers[0].publicBannerText || `${publicOffers[0].name} - Special Promotion`}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Apply code <span className="font-mono font-bold text-foreground">{publicOffers[0].code}</span> at checkout for instant savings!
              </span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => handleApplyCoupon(publicOffers[0].code)}
            className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
          >
            Apply Code
          </Button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold flex items-center gap-3 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Payment Gateways & Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Gateway Selector */}
          <div className="p-6 rounded-3xl border border-border bg-card space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-500" />
              <span>Select Payment Method</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Simulator / Test Gateway */}
              <div
                onClick={() => setPaymentMethod('simulator')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  paymentMethod === 'simulator'
                    ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                    : 'border-border bg-secondary/30 hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-xs">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground">Instant Simulator</div>
                      <div className="text-[10px] text-muted-foreground">Test Card • Zero Latency</div>
                    </div>
                  </div>
                  {paymentMethod === 'simulator' && <CheckCircle2 className="h-4 w-4 text-indigo-500" />}
                </div>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  Recommended for Testing
                </span>
              </div>

              {/* Stripe Credit Card */}
              <div
                onClick={() => setPaymentMethod('stripe')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  paymentMethod === 'stripe'
                    ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                    : 'border-border bg-secondary/30 hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black text-xs">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground">Credit / Debit Card</div>
                      <div className="text-[10px] text-muted-foreground">Visa, MC, Amex (Stripe)</div>
                    </div>
                  </div>
                  {paymentMethod === 'stripe' && <CheckCircle2 className="h-4 w-4 text-indigo-500" />}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">256-bit Encrypted</span>
              </div>

              {/* PayPal */}
              <div
                onClick={() => setPaymentMethod('paypal')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  paymentMethod === 'paypal'
                    ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                    : 'border-border bg-secondary/30 hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-xs">
                      P
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground">PayPal</div>
                      <div className="text-[10px] text-muted-foreground">PayPal Balance or Cards</div>
                    </div>
                  </div>
                  {paymentMethod === 'paypal' && <CheckCircle2 className="h-4 w-4 text-indigo-500" />}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">Buyer Protection</span>
              </div>

              {/* Manual Bank Wire */}
              <div
                onClick={() => setPaymentMethod('manual')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  paymentMethod === 'manual'
                    ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                    : 'border-border bg-secondary/30 hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-xs">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground">Wire / Offline</div>
                      <div className="text-[10px] text-muted-foreground">Manual Admin Approval</div>
                    </div>
                  </div>
                  {paymentMethod === 'manual' && <CheckCircle2 className="h-4 w-4 text-indigo-500" />}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">Invoice Transfer</span>
              </div>
            </div>
          </div>

          {/* Card Info (Simulator / Card Demo) */}
          <div className="p-6 rounded-3xl border border-border bg-card space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-500" />
              <span>Billing & Card Information</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Name on Card / Account</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-secondary/40 text-xs font-mono font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Expires</label>
                  <input
                    type="text"
                    defaultValue="12/28"
                    className="w-full h-10 px-3.5 rounded-xl border border-border bg-secondary/40 text-xs font-mono font-medium text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">CVC / CVV</label>
                  <input
                    type="text"
                    defaultValue="•••"
                    className="w-full h-10 px-3.5 rounded-xl border border-border bg-secondary/40 text-xs font-mono font-medium text-foreground focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-secondary/50 border border-border/80 text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>Payments are cryptographically verified by the NestJS backend prior to license generation.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary, Coupon & Pay Button */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl border border-border bg-card space-y-5 shadow-xs sticky top-24">
            <h2 className="text-base font-bold text-foreground">Order Summary</h2>

            <div className="divide-y divide-border/60 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-foreground truncate">{item.productName}</div>
                    <div className="text-muted-foreground text-[11px]">
                      {item.licensePlanName ? item.licensePlanName : 'Standard Plan'} • Qty: {item.quantity}
                    </div>
                  </div>
                  <div className="font-bold font-mono text-foreground shrink-0">${item.price * item.quantity}</div>
                </div>
              ))}
            </div>

            {/* Coupon Application Box */}
            <div className="pt-3 border-t border-border space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-indigo-500" />
                <span>Promo Code / Coupon</span>
              </label>

              {appliedCoupon ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <div>
                      <span className="font-mono font-bold text-foreground">{appliedCoupon.coupon?.code}</span>
                      <span className="text-[11px] text-muted-foreground block">{appliedCoupon.coupon?.name}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="h-6 w-6 rounded-lg hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                    title="Remove coupon"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. SAVE25)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-mono font-bold text-foreground uppercase placeholder:normal-case placeholder:font-normal focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponValidationLoading || !couponInput.trim()}
                    className="h-9 rounded-xl font-bold bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                  >
                    {couponValidationLoading ? 'Checking...' : 'Apply'}
                  </Button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] font-semibold text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{couponError}</span>
                </p>
              )}
            </div>

            {/* Pricing Breakdown */}
            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Original Subtotal</span>
                <span className="font-mono font-semibold">${cartTotal}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    <span>Coupon ({appliedCoupon.coupon?.code})</span>
                  </span>
                  <span className="font-mono">-${discountSavings}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Taxes & Fees</span>
                <span className="font-mono font-semibold">$0.00</span>
              </div>

              <div className="pt-2 border-t border-border/60 flex justify-between text-sm font-black text-foreground">
                <span>Total Due</span>
                <div className="text-right">
                  <span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
                    ${finalTotalDue}
                  </span>
                  {appliedCoupon && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                      Saved {appliedCoupon.savingsPercentage}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={processing}
              className="w-full h-12 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md transition-all text-sm"
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Pay ${finalTotalDue} & Get Licenses</span>
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              By confirming, you agree to the software license terms and 30-day refund policy.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
