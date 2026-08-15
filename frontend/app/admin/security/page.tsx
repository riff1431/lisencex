'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  Trash2,
  Lock,
  Globe2,
  KeyRound,
  X,
  AlertTriangle,
  RefreshCw,
  Filter,
  ShieldCheck,
  Ban,
  User,
  Laptop2,
  SlidersHorizontal,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminSecurityPage() {
  const [blocked, setBlocked] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Add Block Modal State
  const [showModal, setShowModal] = useState(false);
  const [blockType, setBlockType] = useState('domain');
  const [blockValue, setBlockValue] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [adding, setAdding] = useState(false);

  // License Action Modal State (from security panel)
  const [selectedSuspicious, setSelectedSuspicious] = useState<any>(null);
  const [actionKind, setActionKind] = useState<'suspend' | 'revoke'>('suspend');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [listRes, overviewRes] = await Promise.all([
        apiRequest(`/admin/security/blocked?search=${encodeURIComponent(search)}`),
        apiRequest('/admin/security/overview'),
      ]);
      setBlocked(listRes.data?.items || []);
      setOverview(overviewRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [search]);

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      await apiRequest('/admin/security/blocked', {
        method: 'POST',
        body: JSON.stringify({
          type: blockType,
          value: blockValue,
          reason: blockReason,
        }),
      });

      setShowModal(false);
      setBlockValue('');
      setBlockReason('');
      fetchSecurityData();
    } catch (err: any) {
      alert(err.message || 'Failed to add block rule');
    } finally {
      setAdding(false);
    }
  };

  const handleUnblock = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this security block rule?')) return;

    try {
      await apiRequest(`/admin/security/blocked/${id}`, {
        method: 'DELETE',
      });
      fetchSecurityData();
    } catch (err: any) {
      alert(err.message || 'Failed to unblock entity');
    }
  };

  const handleLicenseSecurityAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspicious) return;
    setActionLoading(true);

    try {
      await apiRequest(`/admin/security/licenses/${selectedSuspicious._id}/${actionKind}`, {
        method: 'POST',
        body: JSON.stringify({
          reason: actionReason || `Security Panel ${actionKind} enforcement`,
        }),
      });

      setSelectedSuspicious(null);
      setActionReason('');
      fetchSecurityData();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionKind} license`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBlocked = blocked.filter((b) => {
    if (typeFilter !== 'all' && b.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-destructive" />
            Security & Abuse Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detect pirated license keys, rate abuse, multi-IP distribution, and manage active block rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchSecurityData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Overview
          </Button>
          <Button onClick={() => setShowModal(true)} variant="destructive" className="gap-2 shadow-xs font-bold">
            <Plus className="h-4 w-4" />
            Add Block Rule
          </Button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Active Blocked Rules</p>
          <p className="text-3xl font-black text-destructive mt-1">{overview?.blockedEntitiesCount ?? 0}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Caught Failed Validations</p>
          <p className="text-3xl font-black text-amber-500 mt-1">{overview?.failedValidationsCount ?? 0}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Flagged Suspicious Licenses</p>
          <p className="text-3xl font-black text-indigo-500 mt-1">{overview?.suspiciousLicensesCount ?? 0}</p>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Audit Records</p>
          <p className="text-3xl font-black text-foreground mt-1">{overview?.totalAuditLogsCount ?? 0}</p>
        </div>
      </div>

      {/* Flagged Suspicious Licenses & Abuse Detection Table */}
      {overview?.suspiciousLicenses?.length > 0 && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-amber-500/20 bg-amber-500/10 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Flagged Suspicious Licenses ({overview.suspiciousLicenses.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Licenses exhibiting multi-domain distribution, slot limit breaches, or excessive validation failures
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-amber-500/20 bg-amber-500/10 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">License Key</th>
                  <th className="px-6 py-4">Product & Customer</th>
                  <th className="px-6 py-4">Abuse Trigger</th>
                  <th className="px-6 py-4">Active Domains / IPs</th>
                  <th className="px-6 py-4 text-right">Direct Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {overview.suspiciousLicenses.map((lic: any) => (
                  <tr key={lic._id} className="hover:bg-amber-500/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-xs text-foreground">{lic.licenseKey}</div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-xs text-foreground">{lic.productId?.name || 'Product'}</div>
                      <div className="text-[11px] text-muted-foreground">{lic.userId?.email || 'Customer'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {lic.flagReason}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                      <div>Domains: {lic.activeDomains?.join(', ') || 'None'}</div>
                      <div className="text-[10px]">Distinct IPs: {lic.distinctIpCount || 0}</div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSuspicious(lic);
                          setActionKind('suspend');
                          setActionReason(lic.flagReason);
                        }}
                        className="text-xs h-8 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                      >
                        <Ban className="h-3 w-3" />
                        Suspend
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedSuspicious(lic);
                          setActionKind('revoke');
                          setActionReason(lic.flagReason);
                        }}
                        className="text-xs h-8"
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocked entities by value or reason..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Entity Types</option>
            <option value="domain">Domains</option>
            <option value="ip">IP Addresses</option>
            <option value="license">License Keys</option>
            <option value="user">Users</option>
            <option value="installation">Installations</option>
          </select>
        </div>
      </div>

      {/* Blocked Entities Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Security Block Rules & Blacklist
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Blocked Target</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Blocked Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    Loading security rules...
                  </td>
                </tr>
              ) : filteredBlocked.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    No security block rules matching criteria.
                  </td>
                </tr>
              ) : (
                filteredBlocked.map((item) => (
                  <tr key={item._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-destructive/10 text-destructive text-[11px] font-bold uppercase">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-xs">{item.value}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{item.reason}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.isActive ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {item.isActive ? 'Active Block' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnblock(item._id)}
                          className="text-xs h-8 text-destructive hover:bg-destructive/10 gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Deactivate Block
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Disabled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Suspicious Validation Events */}
      {overview?.recentSuspiciousEvents?.length > 0 && (
        <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recent Rejected Validations & Security Events
            </h2>
          </div>
          <div className="divide-y divide-border/60">
            {overview.recentSuspiciousEvents.map((evt: any) => (
              <div key={evt._id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground font-mono">{evt.domain || 'Unknown Domain'}</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase text-[10px]">
                      {evt.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{evt.message || 'Validation rejected'}</p>
                </div>
                <div className="text-right text-muted-foreground font-mono text-[11px]">
                  <div>IP: {evt.ip || 'Unknown'}</div>
                  <div>{new Date(evt.timestamp || evt.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD BLOCK RULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Add Security Block Rule
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddBlock} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Entity Type</label>
                <select
                  value={blockType}
                  onChange={(e) => setBlockType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                >
                  <option value="domain">Domain (e.g. warez-site.com)</option>
                  <option value="ip">IP Address (e.g. 192.168.1.1)</option>
                  <option value="license">License Key (e.g. LIC-XXXX)</option>
                  <option value="user">User Account</option>
                  <option value="installation">Installation ID</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Target Value</label>
                <input
                  type="text"
                  required
                  value={blockValue}
                  onChange={(e) => setBlockValue(e.target.value)}
                  placeholder={
                    blockType === 'domain'
                      ? 'e.g. pirate-site.com'
                      : blockType === 'ip'
                      ? 'e.g. 203.0.113.195'
                      : 'e.g. LIC-ABCD-1234'
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Reason for Block</label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Chargeback filed / pirated distribution detected"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={adding} className="font-bold">
                  {adding ? 'Applying...' : 'Enforce Block'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUSPICIOUS LICENSE ACTION MODAL */}
      {selectedSuspicious && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Security Enforcement: {actionKind.toUpperCase()}
                </h2>
                <p className="text-xs font-mono text-muted-foreground">{selectedSuspicious.licenseKey}</p>
              </div>
              <button onClick={() => setSelectedSuspicious(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLicenseSecurityAction} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Action Kind</label>
                <select
                  value={actionKind}
                  onChange={(e: any) => setActionKind(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                >
                  <option value="suspend">Suspend License (Temporarily block)</option>
                  <option value="revoke">Revoke License (Permanently invalidate)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Audit Reason</label>
                <input
                  type="text"
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setSelectedSuspicious(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={actionLoading} className="font-bold">
                  {actionLoading ? 'Enforcing...' : `Confirm ${actionKind}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
