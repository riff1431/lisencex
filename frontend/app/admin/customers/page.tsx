'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  User,
  Sparkles,
  Calendar,
  RefreshCw,
  Mail,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/stat-card';
import { apiRequest } from '@/lib/api';

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/users?search=${encodeURIComponent(search)}${roleFilter !== 'all' ? `&role=${roleFilter}` : ''}`);
      const data = res.data?.items || res.data?.data || res.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const customerCount = users.filter((u) => u.role === 'customer').length;
  const adminCount = users.filter((u) => u.role !== 'customer').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-indigo-500" />
            <span>Customer Accounts & Users</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Registered buyer accounts, admin permissions, and marketplace identity management.
          </p>
        </div>

        <Button
          onClick={fetchUsers}
          variant="outline"
          size="sm"
          className="rounded-xl font-semibold gap-1.5"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Registered Users"
          value={users.length}
          description="Global user database"
          icon={Users}
        />
        <StatCard
          title="Marketplace Customers"
          value={customerCount}
          description="Buyer & license holders"
          icon={User}
        />
        <StatCard
          title="Administrators"
          value={adminCount}
          description="Platform managers"
          icon={ShieldCheck}
        />
      </div>

      {/* Search and Filters */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by full name, email, or Envato username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
        >
          <option value="all">All Roles</option>
          <option value="customer">Customers</option>
          <option value="admin">Admins</option>
          <option value="super_admin">Super Admins</option>
        </select>

        <Button type="submit" size="sm" className="rounded-xl font-semibold px-4">
          Search
        </Button>
      </form>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading accounts...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">No Users Found</p>
            <p className="text-xs text-muted-foreground mt-0.5">Adjust your filters to see accounts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Envato Username</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Joined Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => (
                  <tr key={u._id || u.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-foreground">{u.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">{u.email}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.role === 'super_admin'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            : u.role === 'admin'
                            ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        {u.role?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px]">
                      {u.envatoUsername ? (
                        <span className="text-[#79c41a] font-semibold flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>{u.envatoUsername}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-600 border border-red-500/20'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(u._id || u.id, u.isActive)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                          u.isActive
                            ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
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
