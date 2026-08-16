'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  DollarSign,
  Receipt,
  User,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/stat-card';
import { apiRequest } from '@/lib/api';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [orderRes, statsRes] = await Promise.all([
        apiRequest(`/admin/orders?search=${encodeURIComponent(search)}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`),
        apiRequest('/admin/orders/stats'),
      ]);

      const data = orderRes.data?.items || orderRes.data?.data || orderRes.data || [];
      setOrders(Array.isArray(data) ? data : []);
      setStats(statsRes.data?.data || statsRes.data || null);
    } catch (err) {
      console.error('Failed to fetch admin orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleConfirmPayment = async (orderId: string) => {
    if (!confirm('Manually confirm payment for this order? This will immediately issue licenses to the customer.')) {
      return;
    }
    try {
      await apiRequest(`/admin/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({
          paymentReference: `MANUAL-${Date.now()}`,
          paymentMethod: 'manual',
        }),
      });
      fetchOrders();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      alert(`Error confirming payment: ${err.message}`);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }
    try {
      await apiRequest(`/admin/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      fetchOrders();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      alert(`Error cancelling order: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="h-6 w-6 text-indigo-500" />
            <span>Orders & Marketplace Sales</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time direct customer orders, instant license fulfillment, and revenue telemetry.
          </p>
        </div>

        <Button
          onClick={fetchOrders}
          variant="outline"
          size="sm"
          className="rounded-xl font-semibold gap-1.5"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || orders.length}
          description="Lifetime marketplace orders"
          icon={Receipt}
        />
        <StatCard
          title="Completed / Paid"
          value={stats?.completedOrders || 0}
          description="Successfully fulfilled"
          icon={CheckCircle2}
        />
        <StatCard
          title="Pending Payments"
          value={stats?.pendingOrders || 0}
          description="Awaiting checkout settlement"
          icon={Clock}
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats?.totalRevenue || 0}`}
          description="Gross direct marketplace sales"
          icon={DollarSign}
        />
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order number, customer name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed / Paid</option>
          <option value="pending">Pending Payment</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <Button type="submit" size="sm" className="rounded-xl font-semibold px-4">
          Search
        </Button>
      </form>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">No Orders Found</p>
            <p className="text-xs text-muted-foreground mt-0.5">Orders placed in the store will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Order Number</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Items</th>
                  <th className="px-4 py-3.5">Total</th>
                  <th className="px-4 py-3.5">Payment</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((order) => (
                  <tr key={order._id || order.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                      {order.orderNumber}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">{order.customerName || 'Customer'}</div>
                      <div className="text-[11px] text-muted-foreground">{order.customerEmail}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold">{order.items?.length || 1} item(s)</span>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                        {order.items?.map((i: any) => i.productName).join(', ')}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-black text-foreground">
                      ${order.total} <span className="text-[10px] text-muted-foreground font-semibold">USD</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.paymentStatus === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : order.paymentStatus === 'pending'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 border border-red-500/20'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                      {order.paymentStatus === 'pending' && (
                        <button
                          onClick={() => handleConfirmPayment(order._id || order.id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          Confirm Paid
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancelOrder(order._id || order.id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
