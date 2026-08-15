'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Check,
  RefreshCw,
  Filter,
  Trash2,
  Send,
  Calendar,
  Clock,
  Laptop2,
  KeyRound,
  ShieldCheck,
  X,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Expanded metadata viewer
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Test Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testForm, setTestForm] = useState({
    target: 'admin',
    type: 'system_alert',
    severity: 'info',
    title: 'Test Notification from Admin Center',
    message: 'This is a test notification generated manually by the administrator.',
  });
  const [sendingTest, setSendingTest] = useState(false);

  // Expiry check action
  const [runningExpiryCheck, setRunningExpiryCheck] = useState(false);
  const [expiryStats, setExpiryStats] = useState<any | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '25',
        ...(severityFilter !== 'all' && { severity: severityFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(statusFilter !== 'all' && { isRead: statusFilter === 'read' ? 'true' : 'false' }),
        ...(search.trim() && { search: search.trim() }),
      });

      const res = await apiRequest(`/notifications?${queryParams.toString()}`);
      const data = res.data || res;
      setNotifications(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, severityFilter, typeFilter, statusFilter, search]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err: any) {
      alert(err.message || 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert(err.message || 'Failed to delete notification');
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    try {
      await apiRequest('/notifications/admin/test', {
        method: 'POST',
        body: JSON.stringify(testForm),
      });
      setShowTestModal(false);
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch test notification');
    } finally {
      setSendingTest(false);
    }
  };

  const handleRunExpiryCheck = async () => {
    setRunningExpiryCheck(true);
    setExpiryStats(null);
    try {
      const res = await apiRequest('/notifications/admin/run-expiry-check', {
        method: 'POST',
      });
      setExpiryStats(res.data || res);
      fetchNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to trigger expiry reminders check');
    } finally {
      setRunningExpiryCheck(false);
    }
  };

  // Severity Stats
  const criticalCount = notifications.filter((n) => n.severity === 'critical' || n.severity === 'error').length;
  const warningCount = notifications.filter((n) => n.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Bell className="h-5 w-5" />
            </div>
            <span>Admin Notification Center</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time security alerts, activation violations, expiry reminders, and system notifications
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunExpiryCheck}
            disabled={runningExpiryCheck}
            className="text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${runningExpiryCheck ? 'animate-spin' : ''}`} />
            <span>{runningExpiryCheck ? 'Checking Expiries...' : 'Check Expiries (30d/7d/1d)'}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowTestModal(true)}
            className="text-xs font-semibold gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send Test Alert</span>
          </Button>
        </div>
      </div>

      {/* Expiry Check Result Banner */}
      {expiryStats && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
            <div>
              <p className="font-bold text-foreground">Expiry Check Engine Complete</p>
              <p className="text-muted-foreground text-[11px]">
                {expiryStats.licenseExpiringCount} license(s) alerted for upcoming expiry &bull; {expiryStats.licenseExpiredCount} transitioned to expired &bull; {expiryStats.supportExpiringCount} support alerts sent
              </p>
            </div>
          </div>
          <button onClick={() => setExpiryStats(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">Total Logged Alerts</div>
          <div className="text-2xl font-black mt-1 text-foreground">{totalCount}</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">Unread Alerts</div>
          <div className="text-2xl font-black mt-1 text-indigo-500">{unreadCount}</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">Critical / Errors</div>
          <div className="text-2xl font-black mt-1 text-destructive">{criticalCount}</div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">Warnings</div>
          <div className="text-2xl font-black mt-1 text-amber-500">{warningCount}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-3xl border border-border bg-card shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search alerts, keys, domains, titles..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-xs"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="all">All Event Types</option>
              <option value="activation_limit_reached">Activation Limit Reached</option>
              <option value="entity_blocked">Entity Blocked</option>
              <option value="invalid_key_attempt">Invalid Key Attempt</option>
              <option value="activation_failed">Activation Failed</option>
              <option value="suspicious_license">Suspicious License</option>
              <option value="envato_claim_failed">Envato Claim Failed</option>
              <option value="license_expiring_soon">License Expiring Soon</option>
              <option value="license_expired">License Expired</option>
              <option value="system_alert">System Alert</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs font-semibold gap-1"
              >
                <Check className="h-3 w-3" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-border bg-card/40 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">No alerts match your filter</h3>
            <p className="text-xs text-muted-foreground">Adjust your filter parameters or send a test notification.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isCrit = notif.severity === 'critical' || notif.severity === 'error';
            const isWarn = notif.severity === 'warning';
            const isExpanded = expandedId === notif._id;

            return (
              <div
                key={notif._id}
                className={`p-5 rounded-3xl border transition-all space-y-3 ${
                  !notif.isRead
                    ? 'bg-secondary/40 border-indigo-500/30 shadow-xs'
                    : 'bg-card border-border/80 hover:bg-secondary/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                        isCrit
                          ? 'bg-destructive/15 text-destructive'
                          : isWarn
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-indigo-500/15 text-indigo-500'
                      }`}
                    >
                      {isCrit ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : isWarn ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground">{notif.title}</h3>

                        {/* Severity Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isCrit
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : isWarn
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                          }`}
                        >
                          {notif.severity}
                        </span>

                        {/* Event Type Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-secondary text-muted-foreground">
                          {notif.type}
                        </span>

                        {/* Channel Badges */}
                        {notif.channelsSent?.map((ch: string) => (
                          <span
                            key={ch}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-background border border-border text-muted-foreground"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {!notif.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(notif._id)}
                        className="h-7 text-[11px] font-semibold text-indigo-500 hover:bg-indigo-500/10 px-2"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark Read
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(notif._id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Data Payload Toggle */}
                {notif.data && Object.keys(notif.data).length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : notif._id)}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Code2 className="h-3 w-3" />
                      <span>{isExpanded ? 'Hide Event Payload' : 'Inspect Event Payload'}</span>
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {isExpanded && (
                      <pre className="mt-2 p-3 rounded-2xl bg-background border border-border font-mono text-[11px] text-foreground overflow-x-auto select-all">
                        {JSON.stringify(notif.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} total alerts)
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs h-8"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-xs h-8"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* SEND TEST NOTIFICATION MODAL */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Send className="h-4 w-4 text-indigo-500" />
                  Dispatch Test Alert
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Test real-time alert routing &amp; notification channels</p>
              </div>
              <button onClick={() => setShowTestModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendTest} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Target Audience</label>
                <select
                  value={testForm.target}
                  onChange={(e) => setTestForm({ ...testForm, target: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                >
                  <option value="admin">All Administrators (Admin Center)</option>
                  <option value="customer">Test Customer Inbox</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Event Type</label>
                  <select
                    value={testForm.type}
                    onChange={(e) => setTestForm({ ...testForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                  >
                    <option value="system_alert">System Alert</option>
                    <option value="activation_limit_reached">Activation Limit Reached</option>
                    <option value="entity_blocked">Entity Blocked</option>
                    <option value="invalid_key_attempt">Invalid Key Attempt</option>
                    <option value="license_expiring_soon">License Expiring Soon</option>
                    <option value="product_update_available">Product Update</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Severity</label>
                  <select
                    value={testForm.severity}
                    onChange={(e) => setTestForm({ ...testForm, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-semibold"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Alert Title *</label>
                <input
                  type="text"
                  required
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Alert Message *</label>
                <textarea
                  rows={3}
                  required
                  value={testForm.message}
                  onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowTestModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sendingTest}>
                  {sendingTest ? 'Dispatching...' : 'Dispatch Alert'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
