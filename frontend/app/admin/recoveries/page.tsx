'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Filter,
  Eye,
  Check,
  X,
  User,
  Globe2,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminRecoveriesPage() {
  const [recoveries, setRecoveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Modal
  const [selectedRecovery, setSelectedRecovery] = useState<any>(null);

  // Reject Modal
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRecoveries = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/licenses/recoveries?search=${encodeURIComponent(search)}`);
      setRecoveries(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecoveries();
  }, [search]);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Are you sure you want to approve this activation recovery request? This will deactivate the old installation and issue a new token.')) {
      return;
    }
    setActionLoadingId(id);
    try {
      await apiRequest(`/admin/licenses/recoveries/${id}/approve`, {
        method: 'POST',
      });
      alert('Recovery request approved successfully.');
      fetchRecoveries();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await apiRequest(`/admin/licenses/recoveries/${rejectTarget._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      });
      alert('Recovery request rejected.');
      setRejectTarget(null);
      setRejectionReason('');
      fetchRecoveries();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setRejectLoading(false);
    }
  };

  const filtered = recoveries.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = recoveries.filter((r) => r.status === 'pending').length;
  const approvedCount = recoveries.filter((r) => r.status === 'approved').length;
  const rejectedCount = recoveries.filter((r) => r.status === 'rejected').length;

  const STATUS_CFG: Record<string, { label: string; bg: string; color: string; icon: any }> = {
    pending: { label: 'Pending Review', bg: 'bg-amber-500/10 border-amber-500/20', color: 'text-amber-500', icon: Clock },
    approved: { label: 'Approved', bg: 'bg-emerald-500/10 border-emerald-500/20', color: 'text-emerald-500', icon: CheckCircle2 },
    rejected: { label: 'Rejected', bg: 'bg-destructive/10 border-destructive/20', color: 'text-destructive', icon: XCircle },
  };

  const formatReason = (reason: string) => {
    return reason
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <RotateCcw className="h-4 w-4 text-indigo-500" />
            </div>
            License Recoveries &amp; Reactivations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage license reactivation requests when customers lose access to their original server/website
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Review', value: pendingCount, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Approved Requests', value: approvedCount, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Rejected Requests', value: rejectedCount, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Total Requests', value: recoveries.length, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        ].map((kpi) => (
          <div key={kpi.label} className="p-4 rounded-2xl border border-border bg-card">
            <div className="text-2xl font-black text-foreground">{kpi.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by requester email, domains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-semibold min-w-[150px]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Request Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">Loading recoveries requests...</div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-border bg-card/50 space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto opacity-70">
            <RotateCcw className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">No license recovery requests found.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-muted-foreground uppercase font-bold tracking-wider">
                  <th className="p-4">Requester &amp; Date</th>
                  <th className="p-4">License Key &amp; Product</th>
                  <th className="p-4">Recovery Path</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((item) => {
                  const status = STATUS_CFG[item.status] || STATUS_CFG.pending;
                  const Icon = status.icon;

                  return (
                    <tr key={item._id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-4 space-y-1">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {item.requesterEmail}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Requested: {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="font-mono font-bold text-foreground">
                          {item.licenseId?.licenseKey || 'N/A'}
                        </div>
                        <div className="text-[10px] text-indigo-500 font-semibold">
                          {item.productId?.name}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-muted-foreground">{item.oldDomain}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">{item.newDomain}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          IP: {item.requestedIp || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase text-muted-foreground border border-border/40">
                          {formatReason(item.reason)}
                        </span>
                        {item.reasonDetail && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[150px] mt-1">
                            {item.reasonDetail}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase ${status.bg} ${status.color}`}>
                          <Icon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRecovery(item)}
                          className="h-7 w-7 p-0 rounded-lg hover:bg-secondary"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {item.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(item._id)}
                              disabled={actionLoadingId === item._id}
                              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <Check className="h-3 w-3" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectTarget(item)}
                              className="h-7 px-2.5 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" /> Reject
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedRecovery && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Info className="h-5 w-5 text-indigo-500" />
                  Recovery Request Details
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {selectedRecovery._id}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecovery(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">License Key</div>
                <div className="font-mono font-bold text-foreground text-sm">{selectedRecovery.licenseId?.licenseKey || 'N/A'}</div>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Product</div>
                <div className="font-bold text-foreground text-sm">{selectedRecovery.productId?.name}</div>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Original Installation</div>
                <div className="font-semibold text-foreground text-sm">{selectedRecovery.oldDomain}</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">ID: {selectedRecovery.oldInstallationId}</div>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">New Installation Path</div>
                <div className="font-bold text-foreground text-sm">{selectedRecovery.newDomain}</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">ID: {selectedRecovery.newInstallationId}</div>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Requester Information</div>
                <div className="font-semibold text-foreground">{selectedRecovery.requesterEmail}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">IP Address: {selectedRecovery.requestedIp || 'Unknown'}</div>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Request Time</div>
                <div className="font-semibold text-foreground">{new Date(selectedRecovery.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Recovery Reason</div>
              <div className="font-bold text-foreground">{formatReason(selectedRecovery.reason)}</div>
              {selectedRecovery.reasonDetail && (
                <p className="text-muted-foreground leading-relaxed italic bg-card p-3 rounded-xl border border-border/40 mt-1">
                  "{selectedRecovery.reasonDetail}"
                </p>
              )}
            </div>

            {selectedRecovery.status !== 'pending' && (
              <div className="p-4 rounded-2xl border border-border bg-secondary/40 space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">Resolution Details</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Approver/Resolver:</span>
                    <p className="font-semibold text-foreground">{selectedRecovery.approverEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolved At:</span>
                    <p className="font-semibold text-foreground">
                      {selectedRecovery.resolvedAt ? new Date(selectedRecovery.resolvedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
                {selectedRecovery.rejectionReason && (
                  <div className="mt-2 text-destructive">
                    <span className="font-bold">Rejection Reason:</span>
                    <p className="italic">"{selectedRecovery.rejectionReason}"</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedRecovery(null)}>
                Close
              </Button>
              {selectedRecovery.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      const id = selectedRecovery._id;
                      setSelectedRecovery(null);
                      handleApprove(id);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Approve Recovery
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectTarget(selectedRecovery);
                      setSelectedRecovery(null);
                    }}
                    className="text-destructive border-destructive/20 hover:bg-destructive/10"
                  >
                    Reject Request
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT DIALOG MODAL */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleRejectSubmit} className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Reject Recovery Request
            </h3>
            <p className="text-xs text-muted-foreground">
              Provide a clear reason why this request is being rejected. This reason will be shared with the customer.
            </p>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Rejection Reason</label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="E.g., Unable to verify purchase details or excessive recovery frequency."
                className="w-full p-3 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-destructive/20"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <Button type="button" variant="outline" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={rejectLoading}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                {rejectLoading ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
