'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  ShoppingCart,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  Code2,
  Calendar,
  Download,
  Key,
  Globe2,
  Laptop2,
  FileText,
  Clock,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';
import { apiRequest } from '@/lib/api';
import { ProductImage } from '@/components/product-image';
import { ProductReviews } from '@/components/product-reviews';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { addItem } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addedNotification, setAddedNotification] = useState(false);
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(`/public/products/${slug}`);
        const data = res.data?.data || res.data;
        setProduct(data);

        // Populate plans
        const productPlans = data?.plans || [];
        setPlans(productPlans);
        if (productPlans.length > 0) {
          // Select default plan or first plan
          const def = productPlans.find((p: any) => p.isDefault) || productPlans[0];
          setSelectedPlan(def);
        }
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;

    const unitPrice = selectedPlan?.price || product.price || 49;

    addItem({
      productId: product._id || product.id,
      productName: product.name,
      productSlug: product.slug,
      productType: product.productType,
      logoUrl: product.logoUrl,
      price: unitPrice,
      licensePlanId: selectedPlan?._id || selectedPlan?.id,
      licensePlanName: selectedPlan?.name || 'Standard License',
    });

    setAddedNotification(true);
    setTimeout(() => setAddedNotification(false), 3000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Package className="h-12 w-12 text-muted-foreground mb-3" />
        <h2 className="text-2xl font-bold text-foreground">Product Not Found</h2>
        <p className="text-muted-foreground mt-1 max-w-md">
          The requested product slug does not exist or has been archived.
        </p>
        <Link href="/store" className="mt-6">
          <Button variant="outline">Back to Store</Button>
        </Link>
      </div>
    );
  }

  const effectivePrice = selectedPlan?.price || product.price || 49;

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Breadcrumb Header */}
      <div className="border-b border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/store" className="hover:text-foreground transition-colors">Store</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="capitalize">{product.productType?.replace('_', ' ')}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-semibold truncate">{product.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Column: Details, Features, Requirements */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Cover Banner */}
            <div className="relative rounded-3xl overflow-hidden border border-border bg-secondary/30 aspect-[21/9] shadow-md">
              <ProductImage
                src={product.bannerUrl || product.thumbnailUrl}
                alt={product.name}
                productType={product.productType}
                variant="banner"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Header Block with Icon */}
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="rounded-3xl overflow-hidden border border-border bg-card shadow-md w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                <ProductImage
                  src={product.iconUrl || product.logoUrl || product.thumbnailUrl}
                  alt={product.name}
                  productType={product.productType}
                  variant="icon"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-wide">
                    {product.productType?.replace('_', ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground">
                    Version {product.currentVersion || '1.0.0'}
                  </span>
                  {product.marketplaceSource === 'both' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Envato & Direct
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
                  {product.name}
                </h1>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {product.shortDescription || product.description}
                </p>
              </div>
            </div>

            {/* Screenshots Gallery Section (if any) */}
            {product.screenshots && product.screenshots.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Product Previews & Screenshots</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    ({product.screenshots.length} views)
                  </span>
                </h3>

                <div className="space-y-3">
                  {/* Main Active Screenshot */}
                  <div className="relative rounded-3xl overflow-hidden border border-border bg-secondary/30 aspect-video shadow-md">
                    <img
                      src={product.screenshots[activeScreenshotIdx] || product.screenshots[0]}
                      alt={`${product.name} Preview ${activeScreenshotIdx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Thumbnails Row */}
                  {product.screenshots.length > 1 && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-2">
                      {product.screenshots.map((imgUrl: string, idx: number) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setActiveScreenshotIdx(idx)}
                          className={`relative rounded-2xl overflow-hidden border-2 transition-all shrink-0 w-24 h-16 ${
                            activeScreenshotIdx === idx
                              ? 'border-indigo-500 shadow-md scale-105'
                              : 'border-border opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-border bg-card/60">
                <ShieldCheck className="h-5 w-5 text-emerald-500 mb-2" />
                <h4 className="font-bold text-sm text-foreground">Cryptographic Security</h4>
                <p className="text-xs text-muted-foreground mt-1">Signed JWT tokens with ECDSA verification and offline grace.</p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card/60">
                <Zap className="h-5 w-5 text-amber-500 mb-2" />
                <h4 className="font-bold text-sm text-foreground">Automated Updates</h4>
                <p className="text-xs text-muted-foreground mt-1">Direct repository release heartbeats and one-click in-app upgrades.</p>
              </div>

              <div className="p-4 rounded-2xl border border-border bg-card/60">
                <Key className="h-5 w-5 text-indigo-500 mb-2" />
                <h4 className="font-bold text-sm text-foreground">Instant Provisioning</h4>
                <p className="text-xs text-muted-foreground mt-1">License key generated immediately upon payment confirmation.</p>
              </div>
            </div>

            {/* Description & Technical Specs */}
            <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
              <h3 className="text-lg font-bold text-foreground">Overview & Architecture</h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description || 'Enterprise grade digital product ready for immediate integration and production deployment.'}
              </div>

              {product.requirements && (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-bold text-foreground mb-1">System Requirements</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{product.requirements}</p>
                </div>
              )}
            </div>

            {/* Release Notes */}
            {product.releaseNotes && (
              <div className="p-6 rounded-2xl border border-border bg-card">
                <h3 className="text-lg font-bold text-foreground mb-2">Latest Release Notes (v{product.latestVersion || product.currentVersion})</h3>
                <div className="p-3 rounded-xl bg-secondary/50 text-xs text-muted-foreground font-mono leading-relaxed whitespace-pre-line">
                  {product.releaseNotes}
                </div>
              </div>
            )}

            {/* Customer Reviews & Feedback */}
            <ProductReviews productId={product._id} slug={product.slug || slug} />
          </div>

          {/* Right Column: License Plans & Purchase Box */}
          <div className="space-y-6">
            <div className="sticky top-20 rounded-3xl border-2 border-indigo-500/30 bg-card p-6 shadow-xl shadow-indigo-500/5">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Plan Price</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-foreground">${effectivePrice}</span>
                    <span className="text-xs text-muted-foreground">USD / license</span>
                  </div>
                </div>

                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>

              {/* License Plan Picker */}
              <div className="mt-6 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Select License Tier
                </label>

                <div className="space-y-2.5">
                  {plans.map((plan) => {
                    const isSelected = selectedPlan?._id === plan._id || selectedPlan?.slug === plan.slug;

                    return (
                      <div
                        key={plan._id || plan.slug}
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                            : 'border-border hover:border-border/80 hover:bg-secondary/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-muted-foreground'}`}>
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <span>{plan.name}</span>
                              {plan.isFeatured && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 uppercase">
                                  Popular
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {plan.activationLimit === 0 ? 'Unlimited sites' : `${plan.activationLimit} site${plan.activationLimit > 1 ? 's' : ''}`} • {plan.licenseDurationDays === 0 ? 'Lifetime' : '1 Year'}
                            </div>
                          </div>
                        </div>

                        <span className="font-black text-sm text-foreground shrink-0">
                          ${plan.price || 49}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="mt-6 space-y-2.5">
                <Button
                  onClick={handleBuyNow}
                  className="w-full h-12 rounded-xl text-base font-bold gap-2 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <span>Buy Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  className="w-full h-11 rounded-xl text-sm font-semibold gap-2 border-border"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart</span>
                </Button>
              </div>

              {/* Added Toast */}
              {addedNotification && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Added to cart! <Link href="/cart" className="underline font-bold ml-1">View Cart →</Link></span>
                </div>
              )}

              {/* Trust Features */}
              <div className="mt-6 pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Instant digital license delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>100% verified download packages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Full customer dashboard & domain management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
