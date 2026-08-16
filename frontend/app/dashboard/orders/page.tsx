'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Receipt,
  Download,
  Calendar,
  Layers,
  Key,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/customer/orders');
      const data = res.data?.data || res.data || [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch customer orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="h-6 w-6 text-indigo-500" />
            <span>My Orders & Invoices</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Complete transaction history, receipts, and order fulfillment records.
          </p>
        </div>

        <Link href="/store">
          <Button size="sm" className="rounded-xl font-semibold gap-1.5 shadow-sm">
            <ShoppingBag className="h-4 w-4" />
            <span>Browse Store</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-foreground">No Orders Placed Yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            You haven&apos;t purchased any digital items through our marketplace yet.
          </p>
          <Link href="/store" className="mt-5 inline-block">
            <Button size="sm" className="rounded-xl font-semibold">
              Explore Store
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id || order.id}
              className="p-5 rounded-2xl border border-border bg-card space-y-4 hover:border-border/80 transition-all"
            >
              {/* Top row: Order Number, Date, Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-foreground">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        order.paymentStatus === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : order.paymentStatus === 'refunded'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          : order.paymentStatus === 'failed'
                          ? 'bg-red-500/10 text-red-600 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                    {order.transactionId && (
                      <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                        • Txn: {order.transactionId}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Total Amount</span>
                  <span className="text-lg font-black text-foreground">
                    ${order.total} <span className="text-xs font-semibold text-muted-foreground">{order.currency || 'USD'}</span>
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {order.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-secondary/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                        {item.productName?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <span className="font-bold text-foreground">{item.productName}</span>
                        <span className="text-muted-foreground block text-[11px]">
                          {item.licensePlanName || 'Standard'} • Qty: {item.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-foreground">${item.totalPrice}</span>
                      <div className="flex items-center gap-2">
                        <Link
                          href="/dashboard/licenses"
                          className="text-[11px] font-semibold text-indigo-500 hover:underline flex items-center gap-0.5"
                        >
                          <Key className="h-3 w-3" />
                          <span>License</span>
                        </Link>
                        <Link
                          href="/dashboard/downloads"
                          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
