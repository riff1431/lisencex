'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
  X,
  Copy,
  SlidersHorizontal,
  FileText,
  Laptop2,
  Calendar,
  Filter,
  Check,
  User,
  ShoppingBag,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layers,
  Globe2,
  Store,
  Building2,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // User provision and Plan Assignment
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerFullName, setNewCustomerFullName] = useState('');
  const [createPlanId, setCreatePlanId] = useState('');

  // Bulk Generation Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPlans, setBulkPlans] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [generatedLicenses, setGeneratedLicenses] = useState<any[]>([]);
  const [bulkForm, setBulkForm] = useState({
    productId: '',
    licensePlanId: '',
    quantity: 10,
    source: 'bulk', // 'manual' | 'reseller' | 'bulk'
    activationLimit: 1,
    expiresAt: '',
    supportExpiresAt: '',
    notes: '',
    userId: '',
  });

  // Manual License Issue Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [createForm, setCreateForm] = useState({
    productId: '',
    userId: '',
    purchaseId: '',
    licenseType: 'regular',
    activationLimit: 1,
    expiresAt: '',
    supportExpiresAt: '',
    source: 'manual',
    notes: '',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Action Modal State
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [actionType, setActionType] = useState<string>('suspend');
  const [extendDays, setExtendDays] = useState(30);
  const [extendSupportDays, setExtendSupportDays] = useState(180);
  const [renewType, setRenewType] = useState<'both' | 'license' | 'support'>('both');
  const [newActivationLimit, setNewActivationLimit] = useState(1);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Notes Modal State
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // View Relationship & Activations Inspector Modal State
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [detailedLicense, setDetailedLicense] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Recovery Modal State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryTargetActivation, setRecoveryTargetActivation] = useState<any>(null);
  const [recoveryForm, setRecoveryForm] = useState({
    newDomain: '',
    newInstallationId: '',
    newInstallationUrl: '',
    reason: 'hosting_server_lost',
    reasonDetail: '',
  });
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/admin/licenses?search=${encodeURIComponent(search)}`);
      setLicenses(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
    // Load products list for create dropdown
    apiRequest('/admin/products').then((res) => {
      const items = res.data?.items || [];
      setProducts(items);
      if (items.length > 0 && !createForm.productId) {
        onSelectProduct(items[0]);
      }
    });
    // Load active license plans
    apiRequest('/admin/license-plans/active').then((res) => {
      setBulkPlans(res.data || []);
    });
  }, [search]);

  // Live customer search handler
  useEffect(() => {
    if (!showCreateModal) return;
    const timer = setTimeout(() => {
      setSearchingCustomers(true);
      apiRequest(`/admin/customers?search=${encodeURIComponent(customerSearch)}`)
        .then((res) => setCustomers(res.data || []))
        .catch(console.error)
        .finally(() => setSearchingCustomers(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, showCreateModal]);

  const onSelectProduct = (product: any) => {
    if (!product) return;
    const settings = product.licenseSettings || {};
    
    let defaultExp = '';
    if (settings.licenseDurationDays && settings.licenseDurationDays > 0) {
      const d = new Date(Date.now() + settings.licenseDurationDays * 86400000);
      defaultExp = d.toISOString().split('T')[0];
    }

    let defaultSupp = '';
    if (settings.supportDurationDays && settings.supportDurationDays > 0) {
      const d = new Date(Date.now() + settings.supportDurationDays * 86400000);
      defaultSupp = d.toISOString().split('T')[0];
    }

    setCreateForm((prev) => ({
      ...prev,
      productId: product._id,
      activationLimit: settings.defaultActivationLimit || 1,
      expiresAt: defaultExp,
      supportExpiresAt: defaultSupp,
    }));
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (assignMode === 'existing' && !createForm.userId) {
      setCreateError('Please select a customer user.');
      return;
    }
    if (assignMode === 'new' && !newCustomerEmail) {
      setCreateError('Please enter a customer email address.');
      return;
    }

    setCreating(true);

    try {
      await apiRequest('/admin/licenses', {
        method: 'POST',
        body: JSON.stringify({
          productId: createForm.productId,
          userId: assignMode === 'existing' ? createForm.userId : undefined,
          customerEmail: assignMode === 'new' ? newCustomerEmail : undefined,
          customerFullName: assignMode === 'new' ? newCustomerFullName : undefined,
          licensePlanId: createPlanId || undefined,
          purchaseId: createForm.purchaseId || undefined,
          licenseType: createForm.licenseType,
          activationLimit: Number(createForm.activationLimit),
          expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : undefined,
          supportExpiresAt: createForm.supportExpiresAt ? new Date(createForm.supportExpiresAt).toISOString() : undefined,
          source: createForm.source,
          notes: createForm.notes,
        }),
      });

      setShowCreateModal(false);
      setSelectedCustomer(null);
      setNewCustomerEmail('');
      setNewCustomerFullName('');
      setCreatePlanId('');
      setAssignMode('existing');
      setCreateForm({
        productId: products[0]?._id || '',
        userId: '',
        purchaseId: '',
        licenseType: 'regular',
        activationLimit: 1,
        expiresAt: '',
        supportExpiresAt: '',
        source: 'manual',
        notes: '',
      });
      fetchLicenses();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to issue manual license');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    setBulkLoading(true);

    try {
      const res = await apiRequest('/admin/licenses/bulk', {
        method: 'POST',
        body: JSON.stringify({
          productId: bulkForm.productId,
          licensePlanId: bulkForm.licensePlanId || undefined,
          quantity: Number(bulkForm.quantity),
          source: bulkForm.source,
          activationLimit: Number(bulkForm.activationLimit),
          expiresAt: bulkForm.expiresAt ? new Date(bulkForm.expiresAt).toISOString() : undefined,
          supportExpiresAt: bulkForm.supportExpiresAt ? new Date(bulkForm.supportExpiresAt).toISOString() : undefined,
          notes: bulkForm.notes,
        }),
      });

      setGeneratedLicenses(res.data || []);
    } catch (err: any) {
      console.error(err);
      setBulkError(err.message || 'Failed to generate bulk licenses.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;
    setActionLoading(true);

    try {
      await apiRequest(`/admin/licenses/${selectedLicense._id}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action: actionType,
          extendDays: (actionType === 'extend' || actionType === 'renew') ? Number(extendDays) : undefined,
          extendSupportDays: (actionType === 'extend' || actionType === 'renew') ? Number(extendSupportDays) : undefined,
          renewType: actionType === 'renew' ? renewType : undefined,
          newActivationLimit: actionType === 'change_limit' ? Number(newActivationLimit) : undefined,
          reason: actionReason,
        }),
      });

      setSelectedLicense(null);
      fetchLicenses();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense || !newNote.trim()) return;
    setAddingNote(true);

    try {
      await apiRequest(`/admin/licenses/${selectedLicense._id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote }),
      });

      setNewNote('');
      setShowNotesModal(false);
      fetchLicenses();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const openInspector = async (lic: any) => {
    setSelectedLicense(lic);
    setShowInspectorModal(true);
    setLoadingDetails(true);
    try {
      const res = await apiRequest(`/admin/licenses/${lic._id}`);
      setDetailedLicense(res.data);
    } catch (err) {
      console.error(err);
      setDetailedLicense(lic);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExecuteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryTargetActivation || !selectedLicense) return;
    setRecoveryLoading(true);

    try {
      await apiRequest('/admin/licenses/recoveries/manual', {
        method: 'POST',
        body: JSON.stringify({
          licenseId: selectedLicense._id,
          oldActivationId: recoveryTargetActivation.activationId,
          newDomain: recoveryForm.newDomain,
          newInstallationId: recoveryForm.newInstallationId,
          newInstallationUrl: recoveryForm.newInstallationUrl,
          reason: recoveryForm.reason,
          reasonDetail: recoveryForm.reasonDetail,
        }),
      });

      alert('Activation successfully recovered and replaced.');
      setShowRecoveryModal(false);
      setRecoveryTargetActivation(null);
      setRecoveryForm({
        newDomain: '',
        newInstallationId: '',
        newInstallationUrl: '',
        reason: 'hosting_server_lost',
        reasonDetail: '',
      });

      const res = await apiRequest(`/admin/licenses/${selectedLicense._id}`);
      setDetailedLicense(res.data);
      fetchLicenses();
    } catch (err: any) {
      alert(err.message || 'Manual recovery failed');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const filteredLicenses = licenses.filter((l) => {
    const statusMatch = statusFilter === 'all' || l.status === statusFilter;
    const sourceMatch = sourceFilter === 'all' || l.source === sourceFilter;
    return statusMatch && sourceMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <KeyRound className="h-7 w-7 text-primary" />
            License Creation & Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automatic entitlement verification, slot limits, Envato & Own Marketplace linking, and full relationship tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (products.length > 0) {
                setBulkForm((prev) => ({
                  ...prev,
                  productId: products[0]._id,
                  licensePlanId: '',
                }));
              }
              setGeneratedLicenses([]);
              setBulkError('');
              setShowBulkModal(true);
            }}
            variant="outline"
            className="gap-2 shadow-xs font-bold"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Generate Bulk Keys
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 shadow-xs font-bold">
            <Plus className="h-4 w-4" />
            Issue Manual License
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
            placeholder="Search by license key..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual Admin Grant</option>
            <option value="reseller">Reseller License</option>
            <option value="bulk">Bulk Generated Key</option>
            <option value="internal">Own Marketplace</option>
            <option value="envato">Envato Marketplace</option>
            <option value="custom">Custom Partnership</option>
          </select>
        </div>
      </div>

      {/* Licenses Table */}
      <div className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-6 py-4">License Key</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Marketplace Source</th>
                <th className="px-6 py-4">Slots Used</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    Loading license records...
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-xs">
                    No licenses found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((lic) => (
                  <tr key={lic._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                        <span>{lic.licenseKey}</span>
                        <button
                          onClick={() => handleCopy(lic.licenseKey)}
                          title="Copy license key"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedKey === lic.licenseKey ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase flex flex-col gap-0.5">
                        <span>Tier: {lic.licenseType}</span>
                        <span className="flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>Lic Expiry: {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'Lifetime'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>Supp Expiry: {lic.supportExpiresAt ? new Date(lic.supportExpiresAt).toLocaleDateString() : 'None'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="font-semibold">{lic.productId?.name || 'Product'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">v{lic.productId?.currentVersion || '1.0'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{lic.userId?.fullName || 'Customer'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{lic.userId?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          lic.source === 'envato'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : lic.source === 'internal'
                            ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                            : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {lic.source === 'envato' ? <Store className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                        {lic.source === 'internal' ? 'Own Marketplace' : lic.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold">
                      <button
                        onClick={() => openInspector(lic)}
                        className="hover:underline flex items-center gap-1 text-xs"
                        title="Inspect relationship & activations"
                      >
                        <span
                          className={
                            lic.currentActivationCount >= lic.activationLimit
                              ? 'text-amber-500 font-bold'
                              : 'text-emerald-500'
                          }
                        >
                          {lic.currentActivationCount}
                        </span>
                        <span className="text-muted-foreground"> / {lic.activationLimit}</span>
                        <Laptop2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isExpiringSoon =
                          lic.status === 'active' &&
                          lic.expiresAt &&
                          new Date(lic.expiresAt).getTime() - Date.now() > 0 &&
                          new Date(lic.expiresAt).getTime() - Date.now() < 30 * 86400 * 1000;

                        return (
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                lic.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : lic.status === 'revoked'
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : lic.status === 'expired'
                                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}
                            >
                              {lic.status}
                            </span>
                            {isExpiringSoon && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[9px] font-extrabold uppercase animate-pulse">
                                ⏳ Expiring Soon
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInspector(lic)}
                        className="text-xs h-8 gap-1 border-border/80"
                        title="View complete relationship flow"
                      >
                        <Layers className="h-3.5 w-3.5 text-indigo-500" />
                        Inspect
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLicense(lic);
                          setActionType('suspend');
                          setNewActivationLimit(lic.activationLimit);
                          setActionReason('');
                        }}
                        className="text-xs h-8 gap-1"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        Manage
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedLicense(lic);
                          setShowNotesModal(true);
                        }}
                        className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                        title="Admin notes"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL LICENSE ISSUE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Issue Manual License
                </h2>
                <p className="text-xs text-muted-foreground">Assign custom license to any customer account</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateLicense} className="space-y-4 text-xs">
              {/* Product Selector */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Target Product</label>
                <select
                  required
                  value={createForm.productId}
                  onChange={(e) => {
                    const p = products.find((prod) => prod._id === e.target.value);
                    if (p) onSelectProduct(p);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs font-medium"
                >
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.productType?.replace('_', ' ')}) - v{p.currentVersion}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign to Customer */}
              <div>
                <label className="font-semibold text-foreground block mb-2">Assign to Customer</label>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="assignMode"
                      checked={assignMode === 'existing'}
                      onChange={() => setAssignMode('existing')}
                      className="accent-primary"
                    />
                    <span>Existing Customer</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="assignMode"
                      checked={assignMode === 'new'}
                      onChange={() => setAssignMode('new')}
                      className="accent-primary"
                    />
                    <span>Create New Customer</span>
                  </label>
                </div>

                {assignMode === 'existing' ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customer by name, email, or Envato handle..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-xs"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background">
                      {searchingCustomers ? (
                        <div className="p-3 text-center text-muted-foreground text-[11px]">Searching customers...</div>
                      ) : customers.length === 0 ? (
                        <div className="p-3 text-center text-muted-foreground text-[11px]">
                          No matching customers found.
                        </div>
                      ) : (
                        customers.map((c) => (
                          <div
                            key={c._id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCreateForm((prev) => ({ ...prev, userId: c._id }));
                            }}
                            className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors ${
                              createForm.userId === c._id ? 'bg-primary/10 border-l-4 border-primary' : ''
                            }`}
                          >
                            <div>
                              <div className="font-bold text-foreground text-xs">{c.fullName}</div>
                              <div className="text-[11px] font-mono text-muted-foreground">{c.email}</div>
                            </div>
                            {c.envatoUsername && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                                Envato: {c.envatoUsername}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {selectedCustomer && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center justify-between">
                        <span>Selected: {selectedCustomer.fullName} ({selectedCustomer.email})</span>
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Customer Email</label>
                      <input
                        type="email"
                        required
                        value={newCustomerEmail}
                        onChange={(e) => setNewCustomerEmail(e.target.value)}
                        placeholder="customer@domain.com"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Customer Full Name (Optional)</label>
                      <input
                        type="text"
                        value={newCustomerFullName}
                        onChange={(e) => setNewCustomerFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* License Plan Assignment */}
              <div>
                <label className="font-semibold text-foreground block mb-1">License Plan Default Rules (Optional)</label>
                <select
                  value={createPlanId}
                  onChange={(e) => setCreatePlanId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                >
                  <option value="">Use Product Defaults</option>
                  {bulkPlans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Limit: {p.activationLimit}, Duration: {p.licenseDurationDays ? `${p.licenseDurationDays} days` : 'Lifetime'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Source & Tier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Marketplace Source</label>
                  <select
                    value={createForm.source}
                    onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                  >
                    <option value="manual">Manual Admin Grant</option>
                    <option value="reseller">Reseller License</option>
                    <option value="bulk">Bulk Generated Key</option>
                    <option value="internal">Own Marketplace</option>
                    <option value="envato">Envato Marketplace</option>
                    <option value="custom">Custom Partnership</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">License Tier</label>
                  <select
                    value={createForm.licenseType}
                    onChange={(e) => setCreateForm({ ...createForm, licenseType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                  >
                    <option value="regular">Regular License</option>
                    <option value="extended">Extended License</option>
                    <option value="single_site">Single Site</option>
                    <option value="multi_site">Multi Site</option>
                    <option value="unlimited">Unlimited Sites</option>
                    <option value="developer">Developer License</option>
                    <option value="agency">Agency License</option>
                    <option value="lifetime">Lifetime License</option>
                  </select>
                </div>
              </div>

              {/* Activation Limit & Expiries */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Activation Slots</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.activationLimit}
                    onChange={(e) => setCreateForm({ ...createForm, activationLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">License Expiry</label>
                  <input
                    type="date"
                    value={createForm.expiresAt}
                    onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Support Expiry</label>
                  <input
                    type="date"
                    value={createForm.supportExpiresAt}
                    onChange={(e) => setCreateForm({ ...createForm, supportExpiresAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Initial Note / Audit Record</label>
                <input
                  type="text"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="e.g. Granted direct access for custom client order"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="font-bold">
                  {creating ? 'Generating License...' : 'Issue License'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK LICENSE GENERATION MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Generate Bulk Licenses
                </h2>
                <p className="text-xs text-muted-foreground">Provision multiple keys for offline sales or resellers</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {bulkError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {bulkError}
              </div>
            )}

            {generatedLicenses.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                  Successfully generated {generatedLicenses.length} unique license keys!
                </div>

                <div className="max-h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-background font-mono text-xs">
                  {generatedLicenses.map((lic, index) => (
                    <div key={lic._id || index} className="p-2.5 flex items-center justify-between hover:bg-secondary/40">
                      <span>{lic.licenseKey}</span>
                      <span className="text-[10px] text-muted-foreground">{lic.source}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await apiRequest('/admin/licenses/export-csv', {
                          method: 'POST',
                          body: JSON.stringify({ licenseIds: generatedLicenses.map((l) => l._id) }),
                        });
                        const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(res.data.csv);
                        const link = document.createElement('a');
                        link.setAttribute('href', csvContent);
                        link.setAttribute('download', `bulk_licenses_${new Date().toISOString().slice(0, 10)}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } catch (err) {
                        console.error('CSV export failed', err);
                      }
                    }}
                    className="font-bold flex items-center gap-2 border-primary text-primary hover:bg-primary/5"
                  >
                    Export to CSV
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowBulkModal(false);
                      setGeneratedLicenses([]);
                      fetchLicenses();
                    }}
                    className="font-bold"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateBulk} className="space-y-4 text-xs">
                {/* Product Selector */}
                <div>
                  <label className="font-semibold text-foreground block mb-1">Target Product</label>
                  <select
                    required
                    value={bulkForm.productId}
                    onChange={(e) => setBulkForm({ ...bulkForm, productId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs font-medium"
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} - v{p.currentVersion}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plan Selector */}
                <div>
                  <label className="font-semibold text-foreground block mb-1">License Plan Rules Template (Optional)</label>
                  <select
                    value={bulkForm.licensePlanId}
                    onChange={(e) => setBulkForm({ ...bulkForm, licensePlanId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs font-medium"
                  >
                    <option value="">Use Product Defaults</option>
                    {bulkPlans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} (Limit: {p.activationLimit}, Duration: {p.licenseDurationDays ? `${p.licenseDurationDays} days` : 'Lifetime'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity and Source */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Quantity to Generate</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="1000"
                      value={bulkForm.quantity}
                      onChange={(e) => setBulkForm({ ...bulkForm, quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">License Source</label>
                    <select
                      value={bulkForm.source}
                      onChange={(e) => setBulkForm({ ...bulkForm, source: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                    >
                      <option value="bulk">Bulk Promotional Grant</option>
                      <option value="reseller">Reseller Distribution</option>
                      <option value="manual">Manual Admin Batch</option>
                    </select>
                  </div>
                </div>

                {/* Activation Limit & Expiries */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Activation Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={bulkForm.activationLimit}
                      onChange={(e) => setBulkForm({ ...bulkForm, activationLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">License Expiry</label>
                    <input
                      type="date"
                      value={bulkForm.expiresAt}
                      onChange={(e) => setBulkForm({ ...bulkForm, expiresAt: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Support Expiry</label>
                    <input
                      type="date"
                      value={bulkForm.supportExpiresAt}
                      onChange={(e) => setBulkForm({ ...bulkForm, supportExpiresAt: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Batch Note / Purpose</label>
                  <input
                    type="text"
                    value={bulkForm.notes}
                    onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                    placeholder="e.g. Agency discount promotional keys August 2026"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setShowBulkModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={bulkLoading} className="font-bold">
                    {bulkLoading ? 'Generating Batch...' : 'Generate Batch'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ACTION MODAL */}
      {selectedLicense && !showNotesModal && !showInspectorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold">Manage License Lifecycle</h2>
                <p className="text-xs font-mono text-muted-foreground">{selectedLicense.licenseKey}</p>
              </div>
              <button onClick={() => setSelectedLicense(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1.5">Action to Execute</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium"
                >
                  <option value="suspend">Suspend License (Temporarily Block)</option>
                  <option value="restore">Reactivate / Restore License</option>
                  <option value="revoke">Revoke License (Permanently Invalidate Tokens)</option>
                  <option value="reset_activations">Reset Active Activations (Free Slots)</option>
                  <option value="extend">Extend License/Support Duration</option>
                  <option value="renew">Renew License Subscription</option>
                  <option value="change_limit">Change Activation Limit</option>
                </select>
              </div>

              {actionType === 'extend' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Extend License Expiry by (Days)</label>
                    <input
                      type="number"
                      min="0"
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Enter 0 to skip license extension</p>
                  </div>
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Extend Support Expiry by (Days)</label>
                    <input
                      type="number"
                      min="0"
                      value={extendSupportDays}
                      onChange={(e) => setExtendSupportDays(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Enter 0 to skip support extension</p>
                  </div>
                </div>
              )}

              {actionType === 'renew' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Renewal Type</label>
                    <select
                      value={renewType}
                      onChange={(e: any) => setRenewType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-xs font-medium"
                    >
                      <option value="both">Renew License & Support Duration</option>
                      <option value="license">Renew License Only</option>
                      <option value="support">Renew Support Only</option>
                    </select>
                  </div>
                  {(renewType === 'license' || renewType === 'both') && (
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Renewal Period (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={extendDays}
                        onChange={(e) => setExtendDays(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                      />
                    </div>
                  )}
                  {(renewType === 'support' || renewType === 'both') && (
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Renewal Support Period (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={extendSupportDays}
                        onChange={(e) => setExtendSupportDays(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {actionType === 'change_limit' && (
                <div>
                  <label className="font-semibold text-foreground block mb-1">New Activation Limit (Domains)</label>
                  <input
                    type="number"
                    min="1"
                    value={newActivationLimit}
                    onChange={(e) => setNewActivationLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-foreground block mb-1">Audit Reason / Log Note</label>
                <input
                  type="text"
                  required
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Customer domain migration / limit upgrade"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setSelectedLicense(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  variant={actionType === 'revoke' ? 'destructive' : 'default'}
                >
                  {actionLoading ? 'Executing...' : 'Apply Action'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTES MODAL */}
      {showNotesModal && selectedLicense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold">Admin Notes & Logs</h2>
                <p className="text-xs font-mono text-muted-foreground">{selectedLicense.licenseKey}</p>
              </div>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setSelectedLicense(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedLicense.notes?.length > 0 ? (
                selectedLicense.notes.map((n: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-secondary/40 border border-border text-xs space-y-1">
                    <p className="text-foreground leading-relaxed">{n.note}</p>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                      <span>{n.author || 'Admin'}</span>
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No notes recorded yet.</p>
              )}
            </div>

            <form onSubmit={handleAddNote} className="space-y-3 pt-3 border-t border-border text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Add Note</label>
                <textarea
                  rows={2}
                  required
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type an administrative memo..."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedLicense(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={addingNote}>
                  {addingNote ? 'Saving...' : 'Save Note'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE RELATIONSHIP & ACTIVATIONS INSPECTOR MODAL */}
      {showInspectorModal && selectedLicense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-3xl border border-border bg-card shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  Full Relationship Mapping
                </h2>
                <p className="text-xs text-muted-foreground">
                  Product → Purchase → Customer → License → Activations
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInspectorModal(false);
                  setSelectedLicense(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Loading relationship details...</div>
            ) : (
              <div className="space-y-6">
                {/* Visual Flow Chain */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* 1. Product */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-indigo-500">
                      <span>1. Product</span>
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">
                        {detailedLicense?.productId?.name || 'Product'}
                      </h4>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        Type: {detailedLicense?.productId?.productType}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Version: v{detailedLicense?.productId?.currentVersion || '1.0'}
                      </p>
                    </div>
                  </div>

                  {/* 2. Purchase */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-500">
                      <span>2. Purchase</span>
                      <Store className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                        {detailedLicense?.purchaseId?.source || detailedLicense?.source}
                      </span>
                      <p className="text-xs font-mono font-bold text-foreground mt-1 truncate">
                        {detailedLicense?.purchaseId?.orderNumber ||
                          detailedLicense?.purchaseId?.externalPurchaseCode ||
                          'Direct Grant'}
                      </p>
                      {detailedLicense?.purchaseId?.buyerUsername && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Buyer: {detailedLicense.purchaseId.buyerUsername}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 3. Customer */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-500">
                      <span>3. Customer</span>
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-xs truncate">
                        {detailedLicense?.userId?.fullName || 'Customer'}
                      </h4>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        {detailedLicense?.userId?.email}
                      </p>
                      {detailedLicense?.userId?.envatoUsername && (
                        <p className="text-[10px] text-emerald-500 font-mono mt-0.5">
                          @{detailedLicense.userId.envatoUsername}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 4. License */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-500">
                      <span>4. License</span>
                      <KeyRound className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-black text-foreground tracking-tight truncate">
                        {detailedLicense?.licenseKey}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-semibold mt-1">
                        <span className="text-muted-foreground uppercase">{detailedLicense?.licenseType}</span>
                        <span className="text-emerald-500 font-bold">{detailedLicense?.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Activations */}
                  <div className="p-4 rounded-2xl border border-border bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-purple-500">
                      <span>5. Activations</span>
                      <Laptop2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-foreground font-mono">
                        {detailedLicense?.currentActivationCount} / {detailedLicense?.activationLimit} Slots
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {detailedLicense?.activations?.length || 0} Total Logged Domains
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expiries & Support bar */}
                <div className="p-4 rounded-2xl border border-border bg-card grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-sans">Issued Date</span>
                    <span className="font-bold text-foreground">
                      {detailedLicense?.issuedAt ? new Date(detailedLicense.issuedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-sans">License Expiration</span>
                    <span className="font-bold text-foreground">
                      {detailedLicense?.expiresAt ? new Date(detailedLicense.expiresAt).toLocaleDateString() : 'Lifetime (No Expiry)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-sans">Support Expiration</span>
                    <span className="font-bold text-foreground">
                      {detailedLicense?.supportExpiresAt
                        ? new Date(detailedLicense.supportExpiresAt).toLocaleDateString()
                        : 'Lifetime Support'}
                    </span>
                  </div>
                </div>

                {/* Detailed Domain Activations List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Globe2 className="h-4 w-4 text-primary" />
                    Activated Installations & Domains ({detailedLicense?.activations?.length || 0})
                  </h3>

                  {detailedLicense?.activations?.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                      No domains currently activated on this license key.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-2xl border border-border overflow-hidden bg-background">
                      {detailedLicense?.activations?.map((act: any) => (
                        <div key={act._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">{act.domain}</span>
                              <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold uppercase">
                                {act.environment}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  act.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-secondary text-muted-foreground'
                                }`}
                              >
                                {act.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 text-[11px] text-muted-foreground font-mono">
                              <div>Activation ID: {act.activationId}</div>
                              <div>Installation: {act.installationId}</div>
                              <div>IP: {act.ip || 'Unknown'}</div>
                              <div>Activated: {new Date(act.activatedAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          {act.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRecoveryTargetActivation(act);
                                setShowRecoveryModal(true);
                              }}
                              className="h-7 px-2.5 text-[10px] font-bold gap-1 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white"
                            >
                              <RotateCcw className="h-3 w-3" /> Recover
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Detailed Recovery History List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <RotateCcw className="h-4 w-4 text-indigo-500" />
                    License Recovery History ({detailedLicense?.recoveries?.length || 0})
                  </h3>

                  {!detailedLicense?.recoveries || detailedLicense.recoveries.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground bg-secondary/10">
                      No recoveries logged for this license.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-2xl border border-border overflow-hidden bg-background">
                      {detailedLicense.recoveries.map((rec: any) => (
                        <div key={rec._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">{rec.oldDomain}</span>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-bold text-indigo-500 text-sm">{rec.newDomain}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                rec.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                              }`}>
                                {rec.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 text-[10px] text-muted-foreground font-mono">
                              <div>Reason: {rec.reason?.replace(/_/g, ' ')}</div>
                              <div>Requester: {rec.requesterEmail}</div>
                              <div>Approver: {rec.approverEmail || 'N/A'}</div>
                              <div>Resolved: {new Date(rec.resolvedAt || rec.createdAt).toLocaleDateString()}</div>
                            </div>
                            {rec.reasonDetail && (
                              <p className="text-[11px] text-muted-foreground italic mt-1 bg-secondary/20 p-2 rounded-lg">
                                "{rec.reasonDetail}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes & Audit History */}
                {detailedLicense?.notes?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Administrative Notes ({detailedLicense.notes.length})
                    </h3>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {detailedLicense.notes.map((n: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-secondary/30 border border-border text-xs space-y-1">
                          <p className="text-foreground">{n.note}</p>
                          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                            <span>By: {n.author}</span>
                            <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-border flex justify-end">
              <Button
                onClick={() => {
                  setShowInspectorModal(false);
                  setSelectedLicense(null);
                }}
                variant="outline"
                size="sm"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL RECOVERY MODAL */}
      {showRecoveryModal && recoveryTargetActivation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleExecuteRecovery} className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-indigo-500" />
              Perform Manual Recovery
            </h3>
            <p className="text-xs text-muted-foreground">
              Directly recovery/replace activation <strong>{recoveryTargetActivation.domain}</strong> on this license.
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">New Domain</label>
                <input
                  required
                  type="text"
                  placeholder="new-site.com"
                  value={recoveryForm.newDomain}
                  onChange={(e) => setRecoveryForm(p => ({ ...p, newDomain: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">New Installation ID</label>
                <input
                  required
                  type="text"
                  placeholder="ins_XXXXX"
                  value={recoveryForm.newInstallationId}
                  onChange={(e) => setRecoveryForm(p => ({ ...p, newInstallationId: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">New Installation URL</label>
                <input
                  type="text"
                  placeholder="https://new-site.com"
                  value={recoveryForm.newInstallationUrl}
                  onChange={(e) => setRecoveryForm(p => ({ ...p, newInstallationUrl: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Recovery Reason</label>
                <select
                  value={recoveryForm.reason}
                  onChange={(e) => setRecoveryForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-semibold"
                >
                  <option value="hosting_server_lost">Hosting / Server Lost</option>
                  <option value="domain_expired">Domain Expired</option>
                  <option value="website_deleted">Website Deleted</option>
                  <option value="wordpress_reinstalled">WordPress Reinstalled</option>
                  <option value="nextjs_deployment_replaced">Next.js Deployment Replaced</option>
                  <option value="php_script_moved">PHP Script Moved</option>
                  <option value="other">Other (Custom Reason)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Additional Detail (Notes)</label>
                <textarea
                  rows={2}
                  placeholder="Detail on recovery reason..."
                  value={recoveryForm.reasonDetail}
                  onChange={(e) => setRecoveryForm(p => ({ ...p, reasonDetail: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowRecoveryModal(false); setRecoveryTargetActivation(null); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recoveryLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {recoveryLoading ? 'Recovering...' : 'Perform Recovery'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
