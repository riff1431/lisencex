'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  X,
  Check,
  RefreshCw,
  Filter,
  ShieldCheck,
  Archive,
  Globe2,
  Laptop2,
  Clock,
  KeyRound,
  Server,
  Download,
  Zap,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminLicensePlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    activationLimit: 1,
    licenseDurationDays: 0,
    supportDurationDays: 180,
    allowLocalhost: true,
    countLocalhost: false,
    allowStaging: true,
    countStaging: false,
    allowDeactivation: true,
    deactivationCooldownHours: 0,
    periodicValidation: true,
    validationIntervalHours: 24,
    offlineGracePeriodDays: 7,
    automaticUpdatesEnabled: true,
    downloadsEnabled: true,
    blockValidationOnExpiry: true,
    blockUpdatesOnExpiry: true,
    blockDownloadsOnExpiry: true,
    blockSupportOnExpiry: true,
    blockActivationsOnExpiry: true,
    reminderThresholdDays: 30,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Detail Inspector Modal
  const [inspectorTarget, setInspectorTarget] = useState<any>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/license-plans?search=${encodeURIComponent(search)}`);
      setPlans(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [search]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const openCreateModal = () => {
    setEditingPlanId(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      activationLimit: 1,
      licenseDurationDays: 0,
      supportDurationDays: 180,
      allowLocalhost: true,
      countLocalhost: false,
      allowStaging: true,
      countStaging: false,
      allowDeactivation: true,
      deactivationCooldownHours: 0,
      periodicValidation: true,
      validationIntervalHours: 24,
      offlineGracePeriodDays: 7,
      automaticUpdatesEnabled: true,
      downloadsEnabled: true,
      blockValidationOnExpiry: true,
      blockUpdatesOnExpiry: true,
      blockDownloadsOnExpiry: true,
      blockSupportOnExpiry: true,
      blockActivationsOnExpiry: true,
      reminderThresholdDays: 30,
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlanId(plan._id);
    setForm({
      name: plan.name || '',
      slug: plan.slug || '',
      description: plan.description || '',
      activationLimit: plan.activationLimit ?? 1,
      licenseDurationDays: plan.licenseDurationDays ?? 0,
      supportDurationDays: plan.supportDurationDays ?? 180,
      allowLocalhost: plan.allowLocalhost ?? true,
      countLocalhost: plan.countLocalhost ?? false,
      allowStaging: plan.allowStaging ?? true,
      countStaging: plan.countStaging ?? false,
      allowDeactivation: plan.allowDeactivation ?? true,
      deactivationCooldownHours: plan.deactivationCooldownHours ?? 0,
      periodicValidation: plan.periodicValidation ?? true,
      validationIntervalHours: plan.validationIntervalHours ?? 24,
      offlineGracePeriodDays: plan.offlineGracePeriodDays ?? 7,
      automaticUpdatesEnabled: plan.automaticUpdatesEnabled ?? true,
      downloadsEnabled: plan.downloadsEnabled ?? true,
      blockValidationOnExpiry: plan.blockValidationOnExpiry ?? true,
      blockUpdatesOnExpiry: plan.blockUpdatesOnExpiry ?? true,
      blockDownloadsOnExpiry: plan.blockDownloadsOnExpiry ?? true,
      blockSupportOnExpiry: plan.blockSupportOnExpiry ?? true,
      blockActivationsOnExpiry: plan.blockActivationsOnExpiry ?? true,
      reminderThresholdDays: plan.reminderThresholdDays ?? 30,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      setFormError('Plan name and slug are required.');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingPlanId) {
        await apiRequest(`/admin/license-plans/${editingPlanId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/admin/license-plans', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }

      setShowModal(false);
      fetchPlans();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save license plan');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this license plan? It will no longer be assignable to new products.')) return;

    try {
      await apiRequest(`/admin/license-plans/${id}`, { method: 'DELETE' });
      fetchPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to archive plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <Layers className="h-7 w-7 text-indigo-500" />
            License Plans & Activation Rules
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create reusable license plans with activation limits, environment rules, durations, and update eligibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchPlans} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreateModal} className="gap-2 shadow-xs font-bold">
            <Plus className="h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name, slug, or description..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Plans Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Plan Name</th>
                <th className="px-6 py-4">Activation Limit</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Support</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    Loading license plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    No license plans found. Create your first plan to get started.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{plan.name}</div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mt-0.5">
                        <span>{plan.slug}</span>
                        <button onClick={() => handleCopySlug(plan.slug)} className="hover:text-foreground" title="Copy slug">
                          {copiedSlug === plan.slug ? (
                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                        </button>
                      </div>
                      {plan.isDefault && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase mt-1 inline-block">
                          System Default
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                      {plan.activationLimit === 0 ? 'Unlimited' : `${plan.activationLimit} Sites`}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {plan.licenseDurationDays === 0 ? (
                        <span className="text-emerald-500 font-bold">Lifetime</span>
                      ) : (
                        <span className="font-mono">{plan.licenseDurationDays} days</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      {plan.supportDurationDays} days
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">
                          {plan.usage?.totalProducts || 0} Products
                        </div>
                        <div className="text-muted-foreground">
                          {plan.usage?.totalLicenses || 0} Licenses
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          plan.isActive
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-secondary text-muted-foreground border border-border'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectorTarget(plan)}
                        className="text-xs h-8 gap-1"
                        title="Inspect plan rules"
                      >
                        <Layers className="h-3 w-3 text-indigo-500" />
                        Rules
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(plan)}
                        className="text-xs h-8 gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                      {plan.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(plan._id)}
                          className="text-xs h-8 gap-1 text-destructive hover:bg-destructive/10"
                        >
                          <Archive className="h-3 w-3" />
                          Archive
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PLAN RULE INSPECTOR MODAL */}
      {inspectorTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  Plan Rule Inspector: {inspectorTarget.name}
                </h2>
                <p className="text-xs font-mono text-muted-foreground">{inspectorTarget.slug}</p>
              </div>
              <button onClick={() => setInspectorTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-indigo-500 flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> Activation Limit
                </div>
                <div className="font-mono font-bold text-foreground text-base">
                  {inspectorTarget.activationLimit === 0 ? 'Unlimited' : `${inspectorTarget.activationLimit} Sites`}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-emerald-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> License Duration
                </div>
                <div className="font-mono font-bold text-foreground text-base">
                  {inspectorTarget.licenseDurationDays === 0 ? 'Lifetime' : `${inspectorTarget.licenseDurationDays} Days`}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-amber-500 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Support Duration
                </div>
                <div className="font-mono font-bold text-foreground text-base">
                  {inspectorTarget.supportDurationDays} Days
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-blue-500 flex items-center gap-1">
                  <Laptop2 className="h-3 w-3" /> Localhost
                </div>
                <div className="font-bold text-foreground">
                  {inspectorTarget.allowLocalhost ? 'Allowed' : 'Blocked'}
                  {inspectorTarget.countLocalhost && ' (Counted)'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-purple-500 flex items-center gap-1">
                  <Server className="h-3 w-3" /> Staging
                </div>
                <div className="font-bold text-foreground">
                  {inspectorTarget.allowStaging ? 'Allowed' : 'Blocked'}
                  {inspectorTarget.countStaging && ' (Counted)'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-rose-500 flex items-center gap-1">
                  <Globe2 className="h-3 w-3" /> Deactivation
                </div>
                <div className="font-bold text-foreground">
                  {inspectorTarget.allowDeactivation ? 'Enabled' : 'Disabled'}
                  {inspectorTarget.deactivationCooldownHours > 0 && ` (${inspectorTarget.deactivationCooldownHours}h cooldown)`}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-teal-500 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Updates
                </div>
                <div className="font-bold text-foreground">
                  {inspectorTarget.automaticUpdatesEnabled ? 'Auto Updates On' : 'Updates Off'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-cyan-500 flex items-center gap-1">
                  <Download className="h-3 w-3" /> Downloads
                </div>
                <div className="font-bold text-foreground">
                  {inspectorTarget.downloadsEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-orange-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Offline Grace
                </div>
                <div className="font-mono font-bold text-foreground">
                  {inspectorTarget.offlineGracePeriodDays} Days
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Expiry Rules
                </div>
                <div className="font-semibold text-foreground space-y-0.5">
                  <div>Validation: {inspectorTarget.blockValidationOnExpiry ? '🔒 Blocked' : '✅ Allowed'}</div>
                  <div>Updates: {inspectorTarget.blockUpdatesOnExpiry ? '🔒 Blocked' : '✅ Allowed'}</div>
                  <div>Downloads: {inspectorTarget.blockDownloadsOnExpiry ? '🔒 Blocked' : '✅ Allowed'}</div>
                  <div>Support: {inspectorTarget.blockSupportOnExpiry ? '🔒 Blocked' : '✅ Allowed'}</div>
                  <div>Activations: {inspectorTarget.blockActivationsOnExpiry ? '🔒 Blocked' : '✅ Allowed'}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1">
                <div className="text-[10px] font-bold uppercase text-indigo-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Reminder Threshold
                </div>
                <div className="font-mono font-bold text-foreground">
                  {inspectorTarget.reminderThresholdDays ?? 30} Days Before
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            {inspectorTarget.usage && (
              <div className="pt-4 border-t border-border space-y-2">
                <h3 className="text-xs font-bold text-foreground uppercase">Plan Usage</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-center">
                    <div className="text-2xl font-black text-indigo-500">{inspectorTarget.usage.totalProducts || 0}</div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Products Using</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                    <div className="text-2xl font-black text-emerald-500">{inspectorTarget.usage.totalLicenses || 0}</div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Licenses Issued</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                    <div className="text-2xl font-black text-amber-500">{inspectorTarget.usage.productsEnvato || 0}</div>
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Envato Products</div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-end">
              <Button onClick={() => setInspectorTarget(null)} variant="outline" size="sm">
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                {editingPlanId ? 'Edit License Plan' : 'Create New License Plan'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5 text-xs">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        name: e.target.value,
                        slug: editingPlanId ? form.slug : generateSlug(e.target.value),
                      });
                    }}
                    placeholder="e.g. Single Site, 3 Sites, Unlimited"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Slug</label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. License for a single website installation"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              {/* Core Rules */}
              <div className="pt-3 border-t border-border">
                <h3 className="text-xs font-bold text-foreground uppercase mb-3">Core Activation Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Activation Limit (0 = Unlimited)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.activationLimit}
                      onChange={(e) => setForm({ ...form, activationLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">License Duration Days (0 = Lifetime)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.licenseDurationDays}
                      onChange={(e) => setForm({ ...form, licenseDurationDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Support Duration Days</label>
                    <input
                      type="number"
                      min={0}
                      value={form.supportDurationDays}
                      onChange={(e) => setForm({ ...form, supportDurationDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Environment Rules */}
              <div className="pt-3 border-t border-border">
                <h3 className="text-xs font-bold text-foreground uppercase mb-3">Environment Rules</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'allowLocalhost', label: 'Allow Localhost' },
                    { key: 'countLocalhost', label: 'Count Localhost' },
                    { key: 'allowStaging', label: 'Allow Staging' },
                    { key: 'countStaging', label: 'Count Staging' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form as any)[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                        className="rounded"
                      />
                      <span className="font-semibold text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Deactivation & Validation */}
              <div className="pt-3 border-t border-border">
                <h3 className="text-xs font-bold text-foreground uppercase mb-3">Deactivation & Validation</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.allowDeactivation}
                      onChange={(e) => setForm({ ...form, allowDeactivation: e.target.checked })}
                      className="rounded"
                    />
                    <span className="font-semibold text-foreground">Allow Self-Deactivation</span>
                  </label>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Deactivation Cooldown (Hours)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.deactivationCooldownHours}
                      onChange={(e) => setForm({ ...form, deactivationCooldownHours: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Validation Interval (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.validationIntervalHours}
                      onChange={(e) => setForm({ ...form, validationIntervalHours: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Update & Download Eligibility */}
              <div className="pt-3 border-t border-border">
                <h3 className="text-xs font-bold text-foreground uppercase mb-3">Update & Download Eligibility</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.automaticUpdatesEnabled}
                      onChange={(e) => setForm({ ...form, automaticUpdatesEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="font-semibold text-foreground">Automatic Updates</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.downloadsEnabled}
                      onChange={(e) => setForm({ ...form, downloadsEnabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="font-semibold text-foreground">Downloads Enabled</span>
                  </label>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Offline Grace Period (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.offlineGracePeriodDays}
                      onChange={(e) => setForm({ ...form, offlineGracePeriodDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              {/* Expiry & Renewal Rules */}
              <div className="pt-3 border-t border-border">
                <h3 className="text-xs font-bold text-foreground uppercase mb-3">Expiry & Renewal Rules</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { key: 'blockValidationOnExpiry', label: 'Block Validation' },
                      { key: 'blockUpdatesOnExpiry', label: 'Block Updates' },
                      { key: 'blockDownloadsOnExpiry', label: 'Block Downloads' },
                      { key: 'blockSupportOnExpiry', label: 'Block Support' },
                      { key: 'blockActivationsOnExpiry', label: 'Block Activations' },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form as any)[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                          className="rounded"
                        />
                        <span className="font-semibold text-foreground text-xs">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Expiry Reminder Threshold (Days before expiry)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.reminderThresholdDays}
                      onChange={(e) => setForm({ ...form, reminderThresholdDays: Number(e.target.value) })}
                      className="w-32 px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="font-bold">
                  {saving ? 'Saving...' : editingPlanId ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
