'use client';

import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  RefreshCw,
  User,
  ShieldCheck,
  Filter,
  Download,
  Eye,
  X,
  Code2,
  Calendar,
  Layers,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Selected Log Inspector Modal State
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/audit-logs?search=${encodeURIComponent(search)}`);
      setLogs(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [search]);

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'ActorEmail', 'Action', 'TargetType', 'TargetID', 'IP', 'UserAgent', 'BeforeState', 'AfterState'];
    const rows = logs.map((l) => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.actorEmail || 'System'}"`,
      `"${l.action}"`,
      `"${l.targetType}"`,
      `"${l.targetId || ''}"`,
      `"${l.ip || ''}"`,
      `"${l.userAgent || ''}"`,
      `"${JSON.stringify(l.before || {}).replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.after || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    if (targetTypeFilter !== 'all' && log.targetType !== targetTypeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <ScrollText className="h-7 w-7 text-indigo-500" />
            Audit Log Stream & Trail
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable historical record of every administrative action, license mutation, domain transfer, and security event
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!logs.length} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV Log
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Stream
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor email, target ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Targets</option>
            <option value="license">Licenses</option>
            <option value="activation">Activations</option>
            <option value="product">Products</option>
            <option value="security">Security</option>
            <option value="purchase">Purchases</option>
            <option value="user">Users</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target Type</th>
                <th className="px-6 py-4">Payload Summary</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    Loading audit stream...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-xs text-foreground">
                      {log.actorEmail || 'System'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 capitalize text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold uppercase border border-border">
                        {log.targetType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px]">
                      <div className="max-w-xs truncate text-muted-foreground">
                        {JSON.stringify(log.after || log.before || { targetId: log.targetId })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="text-xs h-8 px-2"
                        title="View payload"
                      >
                        <Eye className="h-3.5 w-3.5 text-indigo-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUDIT LOG DETAILS MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-indigo-500" />
                  Audit Event Payload Inspector
                </h2>
                <p className="text-xs font-mono text-muted-foreground">{selectedLog.action}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Actor</span>
                <span className="font-bold text-foreground">{selectedLog.actorEmail || 'System'}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Date & Time</span>
                <span className="font-mono">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Target Type</span>
                <span className="font-bold uppercase text-indigo-500">{selectedLog.targetType}</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                <span className="text-muted-foreground font-semibold block text-[10px] uppercase">Target ID</span>
                <span className="font-mono font-bold text-foreground">{selectedLog.targetId || 'N/A'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-indigo-500" />
                Raw Event Payload & Mutation State:
              </p>
              <pre className="p-4 rounded-2xl bg-secondary font-mono text-xs text-foreground overflow-x-auto max-h-64 leading-relaxed border border-border">
                {JSON.stringify(
                  {
                    action: selectedLog.action,
                    targetType: selectedLog.targetType,
                    targetId: selectedLog.targetId,
                    beforeState: selectedLog.before || null,
                    afterState: selectedLog.after || null,
                    clientIp: selectedLog.ip || 'Recorded via API',
                    userAgent: selectedLog.userAgent || 'Web Console / SDK',
                    timestamp: selectedLog.timestamp,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button onClick={() => setSelectedLog(null)} variant="outline" size="sm">
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
