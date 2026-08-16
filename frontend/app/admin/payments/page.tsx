'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  Building2,
  Eye,
  RefreshCw,
  X,
  FileText,
  User,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  processing: { label: 'Processing', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  failed: { label: 'Failed', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
  refunded: { label: 'Refunded', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  partially_refunded: { label: 'Partially Refunded', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
};

const GATEWAY_ICONS: Record<string, any> = {
  simulator: Zap,
  stripe: CreditCard,
  paypal: CreditCard,
  manual: Building2,
  piprapay: Zap,
};

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gatewayFilter, setGatewayFilter] = useState('all');
  const [selectedTxn, setSelectedTxn] = useState<any>(null);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [revokeLicenseOnRefund, setRevokeLicenseOnRefund] = useState(true);
  const [refundProcessing, setRefundProcessing] = useState(false);

  // Manual Verify Modal State
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualReason, setManualReason] = useState('');
  const [manualRef, setManualRef] = useState('');
  const [manualProcessing, setManualProcessing] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (gatewayFilter !== 'all') params.append('gateway', gatewayFilter);
      if (search) params.append('search', search);

      const [txRes, statsRes] = await Promise.all([
        apiRequest(`/admin/payments/transactions?${params.toString()}`),
        apiRequest('/admin/payments/stats'),
      ]);

      setTransactions(txRes.data?.items || txRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, gatewayFilter, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleOpenRefund = (txn: any) => {
    setSelectedTxn(txn);
    setRefundAmount(txn.amount - (txn.refundedAmount || 0));
    setRefundReason('Customer requested refund');
    setRevokeLicenseOnRefund(true);
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn) return;
    setRefundProcessing(true);
    try {
      await apiRequest('/admin/payments/refund', {
        method: 'POST',
        body: JSON.stringify({
          transactionId: selectedTxn.transactionId,
          amount: Number(refundAmount),
          reason: refundReason,
          revokeLicense: revokeLicenseOnRefund,
          suspendActivations: true,
        }),
      });
      setRefundModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      alert(err.message || 'Refund failed');
    } finally {
      setRefundProcessing(false);
    }
  };

  const handleOpenManualVerify = (txn: any) => {
    setSelectedTxn(txn);
    setManualReason('Bank statement wire reference verified');
    setManualRef(`WIRE-CONF-${Date.now().toString().slice(-6)}`);
    setManualModalOpen(true);
  };

  const handleProcessManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn) return;
    setManualProcessing(true);
    try {
      await apiRequest(`/admin/payments/manual-verify/${selectedTxn.transactionId}`, {
        method: 'POST',
        body: JSON.stringify({
          reason: manualReason,
          externalReference: manualRef,
        }),
      });
      setManualModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      alert(err.message || 'Manual verification failed');
    } finally {
      setManualProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-indigo-500" />
            <span>Payments & Transactions</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time payment gateway telemetry, automated webhook logs, manual approvals, and refund controls.
          </p>
        </div>

        <Button
          onClick={fetchPayments}
          size="sm"
          variant="outline"
          className="rounded-xl font-semibold gap-2 border-border"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Gross Volume</div>
            <div className="text-2xl font-black text-foreground font-mono">${stats.grossVolume?.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">{stats.totalTransactions} transactions</div>
          </div>

          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Net Revenue</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ${stats.netVolume?.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">{stats.paidCount} paid orders</div>
          </div>

          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Refunded</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              ${stats.totalRefunded?.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">{stats.refundedCount} refund events</div>
          </div>

          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Failed Attempts</div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">{stats.failedCount}</div>
            <div className="text-[10px] text-muted-foreground">Declined or aborted</div>
          </div>

          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Success Rate</div>
            <div className="text-2xl font-black text-indigo-500 font-mono">{stats.successRate}%</div>
            <div className="text-[10px] text-muted-foreground">Gateway authorization</div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="p-4 rounded-3xl border border-border bg-card shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Transaction ID, Order #, Email, or External Reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
          </select>

          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">All Gateways</option>
            <option value="simulator">Simulator</option>
            <option value="piprapay">PipraPay</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="manual">Manual Wire</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
            <p className="text-xs text-muted-foreground">Loading payment transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <CreditCard className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <h3 className="text-base font-bold text-foreground">No Transactions Found</h3>
            <p className="text-xs text-muted-foreground">No payment transactions match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground font-bold border-b border-border">
                <tr>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Gateway</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((txn) => {
                  const statusConf = STATUS_CONFIG[txn.status] || {
                    label: txn.status,
                    color: 'text-foreground',
                    bg: 'bg-secondary',
                  };
                  const Icon = GATEWAY_ICONS[txn.gateway] || CreditCard;

                  return (
                    <tr key={txn._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">{txn.transactionId}</td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">{txn.orderNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{txn.customerName || 'Customer'}</div>
                        <div className="text-[11px] text-muted-foreground">{txn.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border text-[11px] font-semibold capitalize text-foreground">
                          <Icon className="h-3 w-3 text-indigo-500" />
                          <span>{txn.gateway}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        ${txn.amount?.toFixed(2)}
                        {txn.refundedAmount > 0 && (
                          <span className="text-[10px] text-purple-500 block font-normal">
                            (-${txn.refundedAmount})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${statusConf.bg} ${statusConf.color}`}
                        >
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(txn.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Manual Verify action for pending manual orders */}
                          {txn.gateway === 'manual' && txn.status === 'pending' && (
                            <Button
                              onClick={() => handleOpenManualVerify(txn)}
                              size="sm"
                              className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Verify
                            </Button>
                          )}

                          {/* Refund action for paid transactions */}
                          {(txn.status === 'paid' || txn.status === 'partially_refunded') && (
                            <Button
                              onClick={() => handleOpenRefund(txn)}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 rounded-lg text-[11px] font-semibold border-border gap-1 text-purple-600 dark:text-purple-400"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Refund</span>
                            </Button>
                          )}

                          <Button
                            onClick={() => setSelectedTxn(txn)}
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            title="View Transaction Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTxn && !refundModalOpen && !manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Transaction Record</span>
                <h3 className="text-xl font-black text-foreground font-mono">{selectedTxn.transactionId}</h3>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedTxn(null)} className="h-8 w-8 rounded-lg">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground block text-[10px]">Order Number</span>
                <span className="font-bold font-mono text-foreground">{selectedTxn.orderNumber}</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground block text-[10px]">Amount & Currency</span>
                <span className="font-bold font-mono text-foreground">${selectedTxn.amount} {selectedTxn.currency}</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground block text-[10px]">Gateway</span>
                <span className="font-bold capitalize text-foreground">{selectedTxn.gateway}</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground block text-[10px]">Status</span>
                <span className="font-bold capitalize text-foreground">{selectedTxn.status}</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground block text-[10px]">Customer</span>
                <span className="font-semibold text-foreground truncate block">{selectedTxn.customerEmail}</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-muted-foreground block text-[10px]">Paid At</span>
                <span className="font-semibold text-foreground">
                  {selectedTxn.paidAt ? new Date(selectedTxn.paidAt).toLocaleString() : 'Not Paid'}
                </span>
              </div>
            </div>

            {/* Refunds History */}
            {selectedTxn.refunds && selectedTxn.refunds.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-foreground">Refund History</h4>
                <div className="space-y-2">
                  {selectedTxn.refunds.map((ref: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs flex justify-between">
                      <div>
                        <div className="font-bold text-purple-600 dark:text-purple-400">-${ref.amount} ({ref.reason})</div>
                        <div className="text-[10px] text-muted-foreground">By: {ref.actorEmail} • {new Date(ref.refundedAt).toLocaleString()}</div>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{ref.refundId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Webhook Events */}
            {selectedTxn.webhookEvents && selectedTxn.webhookEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-foreground">Webhook Events Trail</h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedTxn.webhookEvents.map((evt: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-secondary/30 border border-border/80 text-[11px] flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-foreground">{evt.eventType}</span>
                        <span className="text-[10px] text-muted-foreground block font-mono">{evt.eventId}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(evt.receivedAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {refundModalOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <form onSubmit={handleProcessRefund} className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Process Refund</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Order <span className="font-mono font-bold text-foreground">#{selectedTxn.orderNumber}</span> • Txn:{' '}
                  <span className="font-mono">{selectedTxn.transactionId}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Refund Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedTxn.amount - (selectedTxn.refundedAmount || 0)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-secondary/40 font-mono font-bold text-foreground focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Refund Reason</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-secondary/40 font-medium text-foreground focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={revokeLicenseOnRefund}
                    onChange={(e) => setRevokeLicenseOnRefund(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Revoke license keys & deactivate installations immediately</span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-5">
                  Affected installations will receive REVOKED status and lose access to software updates and downloads.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setRefundModalOpen(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={refundProcessing}
                className="flex-1 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white"
              >
                {refundProcessing ? 'Refunding...' : `Refund $${refundAmount}`}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MANUAL VERIFY MODAL */}
      {manualModalOpen && selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <form onSubmit={handleProcessManualVerify} className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Manually Verify Payment</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm receipt of funds for order <span className="font-mono font-bold text-foreground">#{selectedTxn.orderNumber}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Bank Statement Reference</label>
                <input
                  type="text"
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-secondary/40 font-mono font-semibold text-foreground focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Verification Note / Audit Reason</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-border bg-secondary/40 font-medium text-foreground focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setManualModalOpen(false)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={manualProcessing}
                className="flex-1 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {manualProcessing ? 'Confirming...' : 'Confirm & Issue Licenses'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
