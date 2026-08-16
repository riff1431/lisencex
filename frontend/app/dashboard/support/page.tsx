'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  Plus,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Context Data for Ticket Creator
  const [contextData, setContextData] = useState<any>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketDetailsLoading, setTicketDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State for Ticket Creation
  const [category, setCategory] = useState('technical_issue');
  const [priority, setPriority] = useState('medium');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLicenseId, setSelectedLicenseId] = useState('');
  const [selectedActivationId, setSelectedActivationId] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Reply State
  const [replyMessage, setReplyMessage] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Rating State
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (search) queryParams.append('search', search);

      const res = await apiRequest(`/customer/support/tickets?${queryParams.toString()}`);
      const payload = res.data?.data || res.data;
      setTickets(payload?.items || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchContext = async () => {
    try {
      const res = await apiRequest('/customer/support/context');
      const payload = res.data?.data || res.data;
      setContextData(payload);
    } catch (err) {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchContext();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleOpenCreateModal = () => {
    setSubject('');
    setMessage('');
    setCategory('technical_issue');
    setPriority('medium');
    setSelectedProductId('');
    setSelectedLicenseId('');
    setSelectedActivationId('');
    setCustomDomain('');
    setErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    setSelectedLicenseId('');
    setSelectedActivationId('');

    // Auto-select first license if available
    const prod = contextData?.products?.find((p: any) => p.productId === prodId);
    if (prod && prod.licenses?.length > 0) {
      setSelectedLicenseId(prod.licenses[0].licenseId);
      if (prod.licenses[0].activations?.length > 0) {
        setSelectedActivationId(prod.licenses[0].activations[0].activationId);
      }
    }
  };

  const handleLicenseChange = (licId: string) => {
    setSelectedLicenseId(licId);
    setSelectedActivationId('');
    const prod = contextData?.products?.find((p: any) => p.productId === selectedProductId);
    const lic = prod?.licenses?.find((l: any) => l.licenseId === licId);
    if (lic && lic.activations?.length > 0) {
      setSelectedActivationId(lic.activations[0].activationId);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        subject,
        message,
        category,
        priority,
        productId: selectedProductId || undefined,
        licenseId: selectedLicenseId || undefined,
        activationId: selectedActivationId || undefined,
        domain: customDomain || undefined,
      };

      const res = await apiRequest('/customer/support/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsCreateModalOpen(false);
      fetchTickets();

      const created = res.data?.data || res.data;
      if (created?._id) {
        handleViewTicket(created._id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewTicket = async (ticketId: string) => {
    setTicketDetailsLoading(true);
    try {
      const res = await apiRequest(`/customer/support/tickets/${ticketId}`);
      setSelectedTicket(res.data?.data || res.data);
      setRatingSubmitted(false);
    } catch (err: any) {
      alert(err.message || 'Failed to load ticket conversation');
    } finally {
      setTicketDetailsLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setReplyLoading(true);
    try {
      const res = await apiRequest(`/customer/support/tickets/${selectedTicket._id}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          message: replyMessage.trim(),
        }),
      });

      const updated = res.data?.data || res.data;
      setSelectedTicket(updated);
      setReplyMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      await apiRequest(`/customer/support/tickets/${selectedTicket._id}/rate`, {
        method: 'POST',
        body: JSON.stringify({
          rating: ratingVal,
          feedback: ratingFeedback,
        }),
      });
      setRatingSubmitted(true);
      handleViewTicket(selectedTicket._id);
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    }
  };

  // Find selected license for support expiry banner
  const currentProd = contextData?.products?.find((p: any) => p.productId === selectedProductId);
  const currentLic = currentProd?.licenses?.find((l: any) => l.licenseId === selectedLicenseId);

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
            Waiting on You
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="text-xs font-black text-rose-500 uppercase">Urgent</span>;
      case 'high':
        return <span className="text-xs font-bold text-amber-500">High</span>;
      case 'medium':
        return <span className="text-xs font-medium text-foreground">Medium</span>;
      case 'low':
        return <span className="text-xs text-muted-foreground">Low</span>;
      default:
        return <span className="text-xs">{priority}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-indigo-500" />
            <span>Support & Help Desk</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Get official assistance from our technical engineering team for your purchased software and licenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTickets}
            disabled={loading}
            className="rounded-xl border-border gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleOpenCreateModal}
            className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Open Support Ticket</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 rounded-3xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ticket #, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {status === 'all'
                ? 'All Tickets'
                : status === 'waiting_customer'
                ? 'Waiting on You'
                : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
            <span>Loading support tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-border bg-card space-y-4 shadow-xs">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/50 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-foreground">No Support Tickets Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Need help with installation, updates, or license issues? Open a ticket to connect directly with our support engineers.
              </p>
            </div>
            <Button
              onClick={handleOpenCreateModal}
              className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Ticket</span>
            </Button>
          </div>
        ) : (
          tickets.map((t) => (
            <div
              key={t._id}
              onClick={() => handleViewTicket(t._id)}
              className="p-5 rounded-3xl border border-border bg-card hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs text-foreground bg-secondary/80 px-2 py-0.5 rounded-md">
                    {t.ticketNumber}
                  </span>
                  {getStatusBadge(t.status)}
                  <span className="text-[11px] text-muted-foreground">• {getPriorityBadge(t.priority)}</span>
                  {t.productName && (
                    <span className="text-[11px] font-semibold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {t.productName}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-foreground hover:text-indigo-600 transition-colors truncate">
                  {t.subject}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="capitalize">Category: {t.category.replace('_', ' ')}</span>
                  {t.domain && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {t.domain}
                    </span>
                  )}
                  <span>Last update: {new Date(t.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{t.messagesCount || 1} messages</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.assignedAgentName ? `Agent: ${t.assignedAgentName}` : 'Unassigned'}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Open a Support Ticket</h3>
                <p className="text-xs text-muted-foreground">
                  Link your ticket directly to your verified product and active installation domain.
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                ✕
              </Button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-4">
              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Issue Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
                    required
                  >
                    <option value="technical_issue">Technical Issue / Bug</option>
                    <option value="license_activation">License & Domain Activation</option>
                    <option value="feature_request">Feature Request / Suggestion</option>
                    <option value="pre_sale">Pre-Sale Question</option>
                    <option value="billing_refund">Billing & Invoicing</option>
                    <option value="general_inquiry">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
                  >
                    <option value="low">Low (General question)</option>
                    <option value="medium">Medium (Standard issue)</option>
                    <option value="high">High (Production impact)</option>
                    <option value="urgent">Urgent (Service outage)</option>
                  </select>
                </div>
              </div>

              {/* Product & License Selectors */}
              <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <span>Linked Software & License</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Owned Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium text-foreground focus:outline-none"
                    >
                      <option value="">-- General / None --</option>
                      {contextData?.products?.map((p: any) => (
                        <option key={p.productId} value={p.productId}>
                          {p.productName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">License Key</label>
                    <select
                      value={selectedLicenseId}
                      onChange={(e) => handleLicenseChange(e.target.value)}
                      disabled={!selectedProductId || !currentProd?.licenses?.length}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none disabled:opacity-50"
                    >
                      <option value="">-- Select License --</option>
                      {currentProd?.licenses?.map((l: any) => (
                        <option key={l.licenseId} value={l.licenseId}>
                          {l.licenseKey} ({l.licenseStatus})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Installation Domain */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Active Installation Domain / URL
                  </label>
                  {currentLic?.activations?.length > 0 ? (
                    <select
                      value={selectedActivationId}
                      onChange={(e) => setSelectedActivationId(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none"
                    >
                      {currentLic.activations.map((a: any) => (
                        <option key={a.activationId} value={a.activationId}>
                          {a.domain} (v{a.installedVersion || '1.0.0'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. app.mywebsite.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-mono text-foreground focus:outline-none"
                    />
                  )}
                </div>

                {/* Support Expiry Alert Banner */}
                {currentLic && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      currentLic.isSupportActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>
                      {currentLic.isSupportActive
                        ? `Support Active ${
                            currentLic.supportExpiryDate
                              ? `until ${new Date(currentLic.supportExpiryDate).toLocaleDateString()}`
                              : '(Lifetime Support)'
                          }`
                        : `Support Expired on ${new Date(
                            currentLic.supportExpiryDate,
                          ).toLocaleDateString()}. Limited support applies.`}
                    </span>
                  </div>
                )}
              </div>

              {/* Subject & Message */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Subject *</label>
                  <input
                    type="text"
                    placeholder="e.g. Activation error on production domain"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Message Details *</label>
                  <textarea
                    placeholder="Describe what happened, error codes, environment details, or steps to reproduce..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl text-xs h-9 border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !subject.trim() || !message.trim()}
                  className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Support Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET CONVERSATION DRAWER / MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-3xl shadow-2xl space-y-5 animate-in fade-in duration-200 my-8 flex flex-col max-h-[90vh]">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-xs text-foreground bg-secondary/80 px-2 py-0.5 rounded-md">
                    {selectedTicket.ticketNumber}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  <span className="text-[11px] text-muted-foreground">• {getPriorityBadge(selectedTicket.priority)}</span>
                  {selectedTicket.productName && (
                    <span className="text-[11px] font-semibold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {selectedTicket.productName}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-foreground truncate">{selectedTicket.subject}</h2>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                  {selectedTicket.licenseKey && (
                    <span className="font-mono">License: {selectedTicket.licenseKey}</span>
                  )}
                  {selectedTicket.domain && <span>Domain: {selectedTicket.domain}</span>}
                  {selectedTicket.assignedAgentName && (
                    <span>Assigned: {selectedTicket.assignedAgentName}</span>
                  )}
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedTicket(null)}
                className="h-8 w-8 rounded-full shrink-0"
              >
                ✕
              </Button>
            </div>

            {/* Conversation Messages Thread */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[50vh]">
              {selectedTicket.messages?.map((msg: any, idx: number) => {
                const isCustomer = msg.senderRole === 'customer';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {isCustomer ? 'You' : msg.senderName || 'Support Engineer'}
                      </span>
                      {!isCustomer && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-500">
                          Staff
                        </span>
                      )}
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl max-w-xl text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-secondary/60 text-foreground border border-border/80 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rating Box (if resolved) */}
            {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>This ticket has been marked as Resolved</span>
                  </div>
                  {selectedTicket.rating && (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      <span>{selectedTicket.rating.rating}/5 Rated</span>
                    </div>
                  )}
                </div>

                {!selectedTicket.rating && !ratingSubmitted && (
                  <form onSubmit={handleSubmitRating} className="space-y-2 pt-1 border-t border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">How was our support service?</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRatingVal(star)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`h-4 w-4 ${
                                star <= ratingVal ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Optional feedback..."
                        value={ratingFeedback}
                        onChange={(e) => setRatingFeedback(e.target.value)}
                        className="flex-1 h-8 px-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none"
                      />
                      <Button size="sm" type="submit" className="h-8 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                        Submit Rating
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Reply Composer */}
            {selectedTicket.status !== 'closed' && (
              <form onSubmit={handleSendReply} className="pt-3 border-t border-border space-y-2">
                <div className="flex gap-2">
                  <textarea
                    placeholder="Type your response to support engineers..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={2}
                    className="flex-1 p-3 rounded-2xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
                  />
                  <Button
                    type="submit"
                    disabled={replyLoading || !replyMessage.trim()}
                    className="self-end h-11 px-5 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-xs text-xs"
                  >
                    {replyLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Reply</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
