'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Package,
  ShoppingBag,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart-context';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, cartTotal, cartCount } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="h-16 w-16 rounded-3xl bg-secondary/80 flex items-center justify-center text-muted-foreground mb-4">
          <ShoppingCart className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Your Cart is Empty</h2>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          Browse our digital catalog to find plugins, themes, and scripts for your projects.
        </p>
        <Link href="/store" className="mt-6">
          <Button className="rounded-xl font-semibold gap-2">
            <ShoppingBag className="h-4 w-4" />
            <span>Browse Products</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="flex items-center justify-between pb-6 border-b border-border mb-8">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Shopping Cart</h1>
            <p className="text-sm text-muted-foreground mt-1">
              You have {cartCount} item{cartCount > 1 ? 's' : ''} in your cart.
            </p>
          </div>

          <button
            onClick={clearCart}
            className="text-xs font-semibold text-destructive hover:underline flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.licensePlanId}`}
                className="p-5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-border/80"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 font-bold text-lg">
                    {item.productName.charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <Link href={`/store/${item.productSlug}`}>
                      <h4 className="font-bold text-foreground hover:text-primary transition-colors truncate">
                        {item.productName}
                      </h4>
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        {item.licensePlanName || 'Standard'}
                      </span>
                      <span>${item.price} each</span>
                    </div>
                  </div>
                </div>

                {/* Quantity & Price */}
                <div className="flex items-center justify-between w-full sm:w-auto sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <div className="flex items-center gap-2 border border-border rounded-xl p-1 bg-secondary/30">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1, item.licensePlanId)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1, item.licensePlanId)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-foreground">
                      ${item.price * item.quantity}
                    </span>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId, item.licensePlanId)}
                    className="text-muted-foreground hover:text-destructive p-2 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <Link href="/store" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground mt-4 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Continue Shopping</span>
            </Link>
          </div>

          {/* Order Summary Box */}
          <div>
            <div className="rounded-3xl border border-border bg-card p-6 space-y-6 sticky top-20 shadow-lg shadow-black/5">
              <h3 className="text-lg font-bold text-foreground">Order Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">${cartTotal}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span className="font-semibold text-emerald-500">$0.00</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimated Tax</span>
                  <span className="font-semibold text-foreground">$0.00</span>
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-baseline">
                  <span className="text-base font-bold text-foreground">Total</span>
                  <span className="text-2xl font-black text-foreground">${cartTotal}</span>
                </div>
              </div>

              <Link href="/checkout">
                <Button className="w-full h-12 rounded-xl text-base font-bold gap-2 shadow-lg shadow-primary/20 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <div className="pt-4 border-t border-border/80 flex items-center justify-center gap-2 text-xs text-muted-foreground text-center">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Instant license provisioning upon payment.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
