'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminRefundsPage() {
  const [refundTransactions, setRefundTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/payments/transactions?status=refunded');
      setRefundTransactions(res.data?.items || res.data || []);
    } catch (err) {
      console.error('Failed to load refunds:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // Flatten all refund records across refunded transactions
  const allRefunds: any[] = [];
  refundTransactions.forEach((txn) => {
    if (txn.refunds && txn.refunds.length > 0) {
      txn.refunds.forEach((ref: any) => {
        allRefunds.push({
          ...ref,
          orderNumber: txn.orderNumber,
          transactionId: txn.transactionId,
          customerEmail: txn.customerEmail,
          customerName: txn.customerName,
          gateway: txn.gateway,
        });
      });
    }
  });

  const filteredRefunds = allRefunds.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.refundId?.toLowerCase().includes(q) ||
      r.orderNumber?.toLowerCase().includes(q) ||
      r.transactionId?.toLowerCase().includes(q) ||
      r.customerEmail?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  const totalRefundAmount = allRefunds.reduce((acc, r) => acc + (r.amount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <RotateCcw className="h-7 w-7 text-purple-500" />
            <span>Refunds & Reversals</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Complete audit trail of all customer refund events, gateway reversal IDs, and automated license revocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/payments">
            <Button size="sm" variant="outline" className="rounded-xl font-semibold gap-2 border-border">
              <CreditCard className="h-4 w-4" />
              <span>Payments Manager</span>
            </Button>
          </Link>
          <Button size="sm" onClick={fetchRefunds} variant="outline" className="rounded-xl font-semibold gap-1.5 border-border">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Refunded Amount</div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            ${totalRefundAmount.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">Processed across all gateways</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Refund Events</div>
          <div className="text-2xl font-black text-foreground font-mono">{allRefunds.length}</div>
          <div className="text-[10px] text-muted-foreground">Discrete refund records</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Automated Revocations</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {allRefunds.filter((r) => r.revokedLicense).length}
          </div>
          <div className="text-[10px] text-muted-foreground">Licenses auto-revoked</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-3xl border border-border bg-card shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Refund ID, Order #, Txn ID, Customer Email, or Reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Refunds Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent mx-auto" />
            <p className="text-xs text-muted-foreground">Loading refund history...</p>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <RotateCcw className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <h3 className="text-base font-bold text-foreground">No Refunds Recorded</h3>
            <p className="text-xs text-muted-foreground">Refunds issued from the payments manager will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="py-3.5 px-4">Refund ID</th>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Gateway</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">License Action</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Refunded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRefunds.map((ref, idx) => (
                  <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">{ref.refundId}</td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{ref.orderNumber}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{ref.customerName || 'Customer'}</div>
                      <div className="text-[11px] text-muted-foreground">{ref.customerEmail}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-semibold capitalize">
                        {ref.gateway}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                      -${ref.amount?.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      {ref.revokedLicense ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          Revoked & Halted
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border">
                          Retained
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">{ref.reason}</td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(ref.refundedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
