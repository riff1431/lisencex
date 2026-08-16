'use client';

import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  RefreshCw,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Key,
  Globe,
  Tag,
  Star,
  Layers,
  ChevronRight,
  Sparkles,
  Paperclip,
  ExternalLink,
  User,
  ShieldAlert,
  Lock,
  Zap,
  RotateCcw,
  Users,
  Eye,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminSupportDeskPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected Ticket Workspace
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<any>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Composer
  const [composerTab, setComposerTab] = useState<'public' | 'internal'>('public');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusTransition, setStatusTransition] = useState<string>('waiting_customer');

  const fetchTicketsAndStats = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (priorityFilter !== 'all') queryParams.append('priority', priorityFilter);
      if (categoryFilter !== 'all') queryParams.append('category', categoryFilter);
      if (search) queryParams.append('search', search);

      const [ticketsRes, statsRes] = await Promise.all([
        apiRequest(`/admin/support/tickets?${queryParams.toString()}`),
        apiRequest('/admin/support/tickets/stats'),
      ]);

      const ticketsPayload = ticketsRes.data?.data || ticketsRes.data;
      setTickets(ticketsPayload?.items || []);

      const statsPayload = statsRes.data?.data || statsRes.data;
      setStats(statsPayload);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketsAndStats();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTicketsAndStats();
  };

  const handleOpenTicketWorkspace = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setDetailLoading(true);
    try {
      const [detailRes, verifyRes] = await Promise.all([
        apiRequest(`/admin/support/tickets/${ticketId}`),
        apiRequest(`/admin/support/tickets/${ticketId}/verification`),
      ]);

      setTicketDetail(detailRes.data?.data || detailRes.data);
      setVerificationData(verifyRes.data?.data || verifyRes.data);
    } catch (err: any) {
      alert(err.message || 'Failed to load ticket workspace');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicketId) return;

    setReplyLoading(true);
    try {
      const isInternal = composerTab === 'internal';
      const payload: any = {
        message: replyMessage.trim(),
        isInternalNote: isInternal,
        statusTransition: isInternal ? undefined : statusTransition || undefined,
      };

      await apiRequest(`/admin/support/tickets/${selectedTicketId}/reply`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setReplyMessage('');
      // Reload workspace
      handleOpenTicketWorkspace(selectedTicketId);
      fetchTicketsAndStats();
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!selectedTicketId) return;
    try {
      await apiRequest(`/admin/support/tickets/${selectedTicketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      handleOpenTicketWorkspace(selectedTicketId);
      fetchTicketsAndStats();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            In Progress
          </span>
        );
      case 'waiting_customer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Waiting on Customer
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
            Closed
          </span>
        );
      default:
        return <span className="text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-indigo-500" />
            <span>Support Desk & License Verification</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Resolve customer inquiries, review live domain heartbeats, check support validity, and post internal notes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchTicketsAndStats}
          disabled={loading}
          className="rounded-xl border-border gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Open Tickets</span>
            <LifeBuoy className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {stats?.openTickets || 0}
          </div>
          <div className="text-[11px] text-muted-foreground">Requires assignment/triage</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">In Progress</span>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
            {stats?.inProgressTickets || 0}
          </div>
          <div className="text-[11px] text-muted-foreground">Under active investigation</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Waiting Customer</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {stats?.waitingCustomerTickets || 0}
          </div>
          <div className="text-[11px] text-muted-foreground">Awaiting buyer response</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {stats?.resolvedTickets || 0}
          </div>
          <div className="text-[11px] text-muted-foreground">Successfully answered</div>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Customer CSAT</span>
            <Star className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-foreground flex items-center gap-1">
            <span>{stats?.averageRating || '5.0'}</span>
            <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
          </div>
          <div className="text-[11px] text-muted-foreground">{stats?.totalRatings || 0} reviews</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-3xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ticket #, email, license key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open Only</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_customer">Waiting on Customer</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Ticket & Subject</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Linked Product & License</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Update</th>
                <th className="py-3 px-4 text-right">Workspace</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    <span>Loading tickets...</span>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground space-y-2">
                    <LifeBuoy className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="font-semibold text-foreground">No support tickets match filters</p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-secondary/20 transition-colors">
                    {/* Ticket & Subject */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground text-xs">{t.ticketNumber}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            ({t.category.replace('_', ' ')})
                          </span>
                        </div>
                        <div className="font-bold text-foreground truncate max-w-xs">{t.subject}</div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{t.customerName}</div>
                      <div className="text-[11px] text-muted-foreground">{t.customerEmail}</div>
                    </td>

                    {/* Product & License */}
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-semibold text-indigo-500 truncate max-w-[180px]">
                        {t.productName || 'General'}
                      </div>
                      {t.licenseKey && (
                        <div className="text-[10px] font-mono text-muted-foreground">{t.licenseKey}</div>
                      )}
                      {t.domain && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span>{t.domain}</span>
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-bold capitalize ${
                          t.priority === 'urgent'
                            ? 'text-rose-500'
                            : t.priority === 'high'
                            ? 'text-amber-500'
                            : 'text-foreground'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(t.status)}</td>

                    {/* Last Update */}
                    <td className="py-3.5 px-4 text-[11px] text-muted-foreground">
                      {new Date(t.updatedAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleOpenTicketWorkspace(t._id)}
                        className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Open Desk</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUPPORT DESK WORKSPACE MODAL (Split View) */}
      {selectedTicketId && ticketDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-6xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs text-foreground bg-secondary px-2 py-0.5 rounded-md">
                    {ticketDetail.ticketNumber}
                  </span>
                  {getStatusBadge(ticketDetail.status)}
                  <span className="text-xs font-bold text-amber-500 capitalize">
                    {ticketDetail.priority} Priority
                  </span>
                  <span className="text-xs text-muted-foreground">• {ticketDetail.category.replace('_', ' ')}</span>
                </div>
                <h2 className="text-lg font-bold text-foreground">{ticketDetail.subject}</h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Transitions */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickStatusChange('in_progress')}
                  className="rounded-xl text-xs h-8 border-border"
                >
                  In Progress
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickStatusChange('resolved')}
                  className="rounded-xl text-xs h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10"
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickStatusChange('closed')}
                  className="rounded-xl text-xs h-8 border-border text-muted-foreground"
                >
                  Close
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedTicketId(null)}
                  className="h-8 w-8 rounded-full ml-2"
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Split Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
              {/* Left/Center Column: Message Thread & Composer (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4 max-h-[60vh] overflow-hidden">
                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
                  {ticketDetail.messages?.map((msg: any, idx: number) => {
                    const isInternal = msg.isInternalNote;
                    const isCustomer = msg.senderRole === 'customer';

                    if (isInternal) {
                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs text-amber-900 dark:text-amber-200"
                        >
                          <div className="flex items-center justify-between font-bold text-[11px] text-amber-600 dark:text-amber-400">
                            <span className="flex items-center gap-1.5">
                              <Lock className="h-3.5 w-3.5" />
                              <span>Internal Staff Note (Invisible to Customer)</span>
                            </span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          <div className="text-[10px] text-amber-600/80">Posted by {msg.senderName}</div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground">
                          <span className="font-bold text-foreground">
                            {isCustomer ? `${ticketDetail.customerName} (Customer)` : `${msg.senderName} (Support Agent)`}
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`p-4 rounded-2xl max-w-lg text-xs leading-relaxed ${
                            isCustomer
                              ? 'bg-secondary/60 text-foreground border border-border/80 rounded-tl-none'
                              : 'bg-indigo-600 text-white rounded-tr-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Response Composer */}
                <form onSubmit={handleSendResponse} className="pt-3 border-t border-border space-y-3">
                  {/* Tab Selector */}
                  <div className="flex items-center justify-between">
                    <div className="flex rounded-xl bg-secondary/50 p-1 border border-border">
                      <button
                        type="button"
                        onClick={() => setComposerTab('public')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          composerTab === 'public'
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Public Customer Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerTab('internal')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          composerTab === 'internal'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Lock className="h-3 w-3" />
                        <span>Internal Note</span>
                      </button>
                    </div>

                    {composerTab === 'public' && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Status after reply:</span>
                        <select
                          value={statusTransition}
                          onChange={(e) => setStatusTransition(e.target.value)}
                          className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground focus:outline-none"
                        >
                          <option value="waiting_customer">Waiting on Customer</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      placeholder={
                        composerTab === 'public'
                          ? 'Compose official public reply to customer...'
                          : 'Add confidential internal note for support engineering team...'
                      }
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={2}
                      className={`flex-1 p-3 rounded-2xl border text-xs font-medium text-foreground focus:outline-none ${
                        composerTab === 'internal'
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-secondary/40 border-border'
                      }`}
                    />
                    <Button
                      type="submit"
                      disabled={replyLoading || !replyMessage.trim()}
                      className={`self-end h-11 px-5 rounded-2xl font-bold gap-2 text-xs shadow-xs ${
                        composerTab === 'internal'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {replyLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>{composerTab === 'internal' ? 'Add Note' : 'Send Reply'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Right Column: Live License Verification Telemetry Stream (5 cols) */}
              <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border pl-0 lg:pl-6 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <span>Live License Verification Telemetry</span>
                </div>

                {verificationData ? (
                  <div className="space-y-3.5 text-xs">
                    {/* Support Expiry Card */}
                    <div
                      className={`p-3.5 rounded-2xl border ${
                        verificationData.support?.isSupportActive
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-amber-500/5 border-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Support Entitlement</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            verificationData.support?.isSupportActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {verificationData.support?.isSupportActive ? 'Active Support' : 'Expired Support'}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {verificationData.support?.supportExpiryDate
                          ? `Valid until: ${new Date(
                              verificationData.support.supportExpiryDate,
                            ).toLocaleDateString()} (${verificationData.support.daysRemaining} days)`
                          : 'Lifetime Included Support'}
                      </div>
                    </div>

                    {/* License Details */}
                    {verificationData.license ? (
                      <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">License Key</span>
                          <span className="font-mono font-bold text-foreground select-all">
                            {verificationData.license.licenseKey}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">License Status</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                            {verificationData.license.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Activation Slots</span>
                          <span className="font-mono font-bold text-foreground">
                            {verificationData.license.activeCount} / {verificationData.license.activationLimit} active
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Marketplace</span>
                          <span className="capitalize font-semibold text-foreground">
                            {verificationData.marketplace?.source?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-secondary/20 border border-border text-center text-muted-foreground">
                        No active license key attached to this ticket.
                      </div>
                    )}

                    {/* Active Installations / Domains */}
                    <div className="space-y-2">
                      <span className="font-bold text-foreground text-xs block">
                        Registered Installations ({verificationData.activations?.length || 0})
                      </span>

                      {verificationData.activations && verificationData.activations.length > 0 ? (
                        <div className="space-y-2">
                          {verificationData.activations.map((act: any) => (
                            <div key={act.id} className="p-3 rounded-2xl bg-card border border-border space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-foreground flex items-center gap-1 truncate max-w-[180px]">
                                  <Globe className="h-3 w-3 text-indigo-500 shrink-0" />
                                  <span>{act.domain}</span>
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold capitalize">
                                  {act.status}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>v{act.clientVersion || '1.0.0'}</span>
                                <span>Last seen: {new Date(act.lastHeartbeat).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-secondary/20 border border-border text-center text-[11px] text-muted-foreground">
                          Zero active domain activations on this license.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                    <span>Loading license telemetry...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
