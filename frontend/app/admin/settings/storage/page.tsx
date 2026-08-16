'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HardDrive,
  Cloud,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  ArrowRight,
  Shield,
  Lock,
  Globe,
  UploadCloud,
  FileCode,
  Download,
  Trash2,
  ExternalLink,
  Search,
  Sliders,
  Database,
  Server,
  Zap,
  ArrowLeftRight,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

export default function AdminStorageSettingsPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filesData, setFilesData] = useState<{ items: any[]; total: number; page: number; totalPages: number }>({
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Provider Modal State
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [providerForm, setProviderForm] = useState<any>({});
  const [savingConfig, setSavingConfig] = useState(false);

  // Migration Modal State
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [migrateSource, setMigrateSource] = useState('local');
  const [migrateTarget, setMigrateTarget] = useState('r2');
  const [migrateCategory, setMigrateCategory] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  // File Inspector Filter State
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [configsRes, statsRes, filesRes] = await Promise.all([
        apiRequest('/admin/storage/config'),
        apiRequest('/admin/storage/stats'),
        apiRequest(`/admin/storage/files?page=${page}&limit=10&search=${encodeURIComponent(search)}&provider=${providerFilter}&category=${categoryFilter}`),
      ]);

      if (configsRes.data) {
        setConfigs(Array.isArray(configsRes.data) ? configsRes.data : (configsRes.data?.data || []));
      }
      if (statsRes.data) {
        setStats(statsRes.data?.data || statsRes.data);
      }
      if (filesRes.data) {
        const d = filesRes.data?.data || filesRes.data;
        setFilesData({
          items: d.items || [],
          total: d.total || 0,
          page: d.page || 1,
          totalPages: d.totalPages || 1,
        });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load storage configurations' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [page, search, providerFilter, categoryFilter]);

  const handleTestConnection = async (providerType: string) => {
    setTestingProvider(providerType);
    setFeedback(null);

    try {
      const res = await apiRequest(`/admin/storage/test/${providerType}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const resultData = res.data?.data || res.data;
      setTestResults((prev) => ({
        ...prev,
        [providerType]: resultData,
      }));

      if (resultData?.success) {
        setFeedback({
          type: 'success',
          message: `${providerType.toUpperCase()} test succeeded (${resultData.latencyMs}ms): ${resultData.message}`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `${providerType.toUpperCase()} test failed: ${resultData?.message || 'Connection refused'}`,
        });
      }

      // Reload config to sync test timestamp
      const updatedConfigs = await apiRequest('/admin/storage/config');
      if (updatedConfigs.data) {
        setConfigs(Array.isArray(updatedConfigs.data) ? updatedConfigs.data : (updatedConfigs.data?.data || []));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Test failed: ${err.message}` });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSetDefault = async (providerType: string) => {
    try {
      const res = await apiRequest(`/admin/storage/set-default/${providerType}`, {
        method: 'POST',
      });
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Active default storage provider changed to ${providerType.toUpperCase()}`,
        });
        loadAllData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Failed to set default: ${err.message}` });
    }
  };

  const openEditModal = (provider: any) => {
    setEditingProvider(provider.provider);
    setProviderForm({
      isEnabled: provider.isEnabled,
      isDefault: provider.isDefault,
      localConfig: { ...(provider.localConfig || {}) },
      s3Config: { ...(provider.s3Config || {}) },
      r2Config: { ...(provider.r2Config || {}) },
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;
    setSavingConfig(true);
    setFeedback(null);

    try {
      const payload: any = {
        isEnabled: providerForm.isEnabled,
        isDefault: providerForm.isDefault,
      };

      if (editingProvider === 'local') {
        payload.localConfig = providerForm.localConfig;
      } else if (editingProvider === 's3') {
        payload.s3Config = providerForm.s3Config;
      } else if (editingProvider === 'r2') {
        payload.r2Config = providerForm.r2Config;
      }

      const res = await apiRequest(`/admin/storage/config/${editingProvider}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `${editingProvider.toUpperCase()} configuration saved and applied!`,
        });
        setEditingProvider(null);
        loadAllData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save configuration' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleMigrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (migrateSource === migrateTarget) {
      alert('Source and target providers must be different');
      return;
    }
    setMigrating(true);
    setMigrationResult(null);

    try {
      const res = await apiRequest('/admin/storage/migrate', {
        method: 'POST',
        body: JSON.stringify({
          fromProvider: migrateSource,
          toProvider: migrateTarget,
          category: migrateCategory || undefined,
        }),
      });

      const result = res.data?.data || res.data;
      setMigrationResult(result);
      setFeedback({
        type: 'success',
        message: `Migration completed: ${result.migratedCount} of ${result.totalSelected} files transferred successfully!`,
      });
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Migration error: ${err.message}` });
    } finally {
      setMigrating(false);
    }
  };

  const handleDeleteFile = async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}" from storage? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await apiRequest(`/admin/storage/files/${fileId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setFeedback({ type: 'success', message: `File "${filename}" deleted successfully` });
        loadAllData();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Delete failed: ${err.message}` });
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <Link href="/admin/settings" className="hover:text-foreground">
              Settings
            </Link>
            <span>/</span>
            <span className="text-foreground">Storage Providers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Database className="h-7 w-7 text-indigo-500" />
            Dynamic Media & File Storage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized storage engine for product media, private release ZIPs, documentation, and customer attachments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMigrateOpen(true)}
            className="gap-2"
          >
            <ArrowLeftRight className="h-4 w-4 text-purple-500" />
            Migrate Files
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Storage Statistics Bar */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Total Storage Used</span>
              <HardDrive className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-foreground">{formatBytes(stats.totalSizeBytes)}</div>
            <div className="text-[11px] text-muted-foreground">Across all connected storage providers</div>
          </div>

          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Total Files Tracked</span>
              <Layers className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-foreground">{stats.totalFiles}</div>
            <div className="text-[11px] text-muted-foreground">Checksum verified & indexed</div>
          </div>

          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Public Media Files</span>
              <Globe className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-foreground">{stats.publicFiles}</div>
            <div className="text-[11px] text-muted-foreground">Thumbnails, icons, banners, screenshots</div>
          </div>

          <div className="p-5 rounded-3xl border border-border bg-card shadow-xs space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Protected Private Files</span>
              <Lock className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-foreground">{stats.privateFiles}</div>
            <div className="text-[11px] text-muted-foreground">Software ZIPs, signed token URLs only</div>
          </div>
        </div>
      )}

      {/* Provider Cards */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-500" />
          Configured Storage Providers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {configs.map((provider) => {
            const isLocal = provider.provider === 'local';
            const isS3 = provider.provider === 's3';
            const isR2 = provider.provider === 'r2';

            const name = isLocal
              ? 'Local Filesystem'
              : isS3
              ? 'Amazon S3'
              : 'Cloudflare R2';

            const icon = isLocal ? HardDrive : isS3 ? Cloud : Zap;
            const IconComponent = icon;

            const isDefault = provider.isDefault;
            const isEnabled = provider.isEnabled;
            const isTesting = testingProvider === provider.provider;

            return (
              <div
                key={provider.provider}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                  isDefault
                    ? 'border-indigo-500/50 bg-gradient-to-b from-indigo-500/5 via-card to-card shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/30'
                    : 'border-border bg-card shadow-xs'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold ${
                          isDefault
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{name}</h3>
                        <div className="text-[10px] text-muted-foreground font-mono uppercase">
                          {provider.provider}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          ⭐ Active Default
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isEnabled
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 text-xs space-y-1.5 font-mono">
                    {isLocal && (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Directory:</span>
                          <span className="font-semibold text-foreground">
                            {provider.localConfig?.uploadDirectory || 'uploads/'}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Traversal Guard:</span>
                          <span className="font-semibold text-emerald-500">Active</span>
                        </div>
                      </>
                    )}

                    {isS3 && (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Bucket:</span>
                          <span className="font-semibold text-foreground truncate max-w-[140px]">
                            {provider.s3Config?.bucket || '(Not configured)'}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Region:</span>
                          <span className="font-semibold text-foreground">
                            {provider.s3Config?.region || 'us-east-1'}
                          </span>
                        </div>
                      </>
                    )}

                    {isR2 && (
                      <>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Bucket:</span>
                          <span className="font-semibold text-foreground truncate max-w-[140px]">
                            {provider.r2Config?.bucket || '(Not configured)'}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Account:</span>
                          <span className="font-semibold text-foreground truncate max-w-[140px]">
                            {provider.r2Config?.accountId ? '••••' + provider.r2Config.accountId.slice(-4) : '(None)'}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
                      <span>Health Check:</span>
                      <span
                        className={`font-semibold capitalize ${
                          provider.lastTestStatus === 'success'
                            ? 'text-emerald-500'
                            : provider.lastTestStatus === 'failed'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {provider.lastTestStatus || 'Untested'}
                        {provider.lastTestLatencyMs ? ` (${provider.lastTestLatencyMs}ms)` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(provider.provider)}
                      disabled={isTesting}
                      className="text-xs"
                    >
                      <Zap className={`h-3.5 w-3.5 mr-1 text-amber-500 ${isTesting ? 'animate-bounce' : ''}`} />
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(provider)}
                      className="text-xs"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      Configure
                    </Button>
                  </div>

                  {!isDefault && (
                    <Button
                      size="sm"
                      onClick={() => handleSetDefault(provider.provider)}
                      className="w-full text-xs font-semibold"
                    >
                      Set as Default Provider
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracked Files Inspector */}
      <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <FileCode className="h-5 w-5 text-indigo-500" />
              Tracked Storage Files Catalog
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unified file index with checksum verification, category classification, and direct serving
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs w-48 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <select
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium"
            >
              <option value="">All Providers</option>
              <option value="local">Local</option>
              <option value="s3">Amazon S3</option>
              <option value="r2">Cloudflare R2</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-medium"
            >
              <option value="">All Categories</option>
              <option value="thumbnail">Thumbnail</option>
              <option value="icon">Icon</option>
              <option value="banner">Banner</option>
              <option value="screenshot">Screenshot</option>
              <option value="package">Package ZIP</option>
              <option value="document">Document</option>
              <option value="support">Support</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Files Table */}
        <div className="overflow-x-auto border border-border rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5">Filename</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Provider</th>
                <th className="p-3.5">Size</th>
                <th className="p-3.5">Visibility</th>
                <th className="p-3.5">Checksum</th>
                <th className="p-3.5">Uploaded</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              {filesData.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No files found matching the criteria.
                  </td>
                </tr>
              ) : (
                filesData.items.map((file) => (
                  <tr key={file._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-foreground truncate max-w-[200px]" title={file.originalFilename}>
                        {file.originalFilename}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                        {file.generatedFilename}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary text-foreground uppercase">
                        {file.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          file.storageProvider === 's3'
                            ? 'bg-amber-500/10 text-amber-500'
                            : file.storageProvider === 'r2'
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-indigo-500/10 text-indigo-500'
                        }`}
                      >
                        {file.storageProvider}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">{formatBytes(file.sizeBytes)}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          file.visibility === 'public'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {file.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                        <span className="capitalize">{file.visibility}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-muted-foreground truncate max-w-[100px]" title={file.checksum}>
                      {file.checksum ? file.checksum.slice(0, 10) + '...' : '—'}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`http://localhost:5001/api/v1/public/storage/serve/${file.fileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground"
                          title="Open / Preview"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.fileId, file.originalFilename)}
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500"
                          title="Delete File"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filesData.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Showing page {filesData.page} of {filesData.totalPages} ({filesData.total} files total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= filesData.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Configure Provider Modal */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Configure {editingProvider.toUpperCase()} Storage
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Credentials are encrypted in database using AES-256-GCM
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingProvider(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-secondary/40 border border-border">
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.isEnabled}
                    onChange={(e) => setProviderForm({ ...providerForm, isEnabled: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Enable this Provider</span>
                </label>

                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={providerForm.isDefault}
                    onChange={(e) => setProviderForm({ ...providerForm, isDefault: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Set as Active Default Provider</span>
                </label>
              </div>

              {editingProvider === 'local' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Local Upload Directory</label>
                    <input
                      type="text"
                      value={providerForm.localConfig?.uploadDirectory || ''}
                      onChange={(e) =>
                        setProviderForm({
                          ...providerForm,
                          localConfig: { ...providerForm.localConfig, uploadDirectory: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                      placeholder="uploads"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">Base Public Endpoint</label>
                    <input
                      type="text"
                      value={providerForm.localConfig?.baseUrl || ''}
                      onChange={(e) =>
                        setProviderForm({
                          ...providerForm,
                          localConfig: { ...providerForm.localConfig, baseUrl: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                      placeholder="/api/v1/public/media"
                      required
                    />
                  </div>
                </div>
              )}

              {editingProvider === 's3' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">AWS Access Key ID</label>
                      <input
                        type="text"
                        value={providerForm.s3Config?.accessKeyId || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            s3Config: { ...providerForm.s3Config, accessKeyId: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground block mb-1">AWS Secret Access Key</label>
                      <input
                        type="password"
                        value={providerForm.s3Config?.secretAccessKey || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            s3Config: { ...providerForm.s3Config, secretAccessKey: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">AWS S3 Bucket Name</label>
                      <input
                        type="text"
                        value={providerForm.s3Config?.bucket || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            s3Config: { ...providerForm.s3Config, bucket: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="licensenest-assets"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground block mb-1">AWS Region</label>
                      <input
                        type="text"
                        value={providerForm.s3Config?.region || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            s3Config: { ...providerForm.s3Config, region: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="us-east-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Path Prefix (Folder)</label>
                      <input
                        type="text"
                        value={providerForm.s3Config?.pathPrefix || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            s3Config: { ...providerForm.s3Config, pathPrefix: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="licensenest"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground block mb-1">CloudFront CDN URL (Optional)</label>
                      <input
                        type="text"
                        value={providerForm.s3Config?.cdnUrl || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            s3Config: { ...providerForm.s3Config, cdnUrl: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="https://cdn.example.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingProvider === 'r2' && (
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Cloudflare Account ID</label>
                    <input
                      type="text"
                      value={providerForm.r2Config?.accountId || ''}
                      onChange={(e) =>
                        setProviderForm({
                          ...providerForm,
                          r2Config: { ...providerForm.r2Config, accountId: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                      placeholder="e.g. 5b2psoaqvp8koZZNa_BhF"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">R2 Access Key ID</label>
                      <input
                        type="text"
                        value={providerForm.r2Config?.accessKeyId || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            r2Config: { ...providerForm.r2Config, accessKeyId: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="cf_r2_access_key"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground block mb-1">R2 Secret Access Key</label>
                      <input
                        type="password"
                        value={providerForm.r2Config?.secretAccessKey || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            r2Config: { ...providerForm.r2Config, secretAccessKey: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-foreground block mb-1">R2 Bucket Name</label>
                      <input
                        type="text"
                        value={providerForm.r2Config?.bucket || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            r2Config: { ...providerForm.r2Config, bucket: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="licensenest-r2"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-foreground block mb-1">Custom Public Domain</label>
                      <input
                        type="text"
                        value={providerForm.r2Config?.customDomain || ''}
                        onChange={(e) =>
                          setProviderForm({
                            ...providerForm,
                            r2Config: { ...providerForm.r2Config, customDomain: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs font-mono"
                        placeholder="https://assets.mybrand.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingProvider(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingConfig}>
                  {savingConfig ? 'Saving Settings...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Migration Studio Modal */}
      {migrateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">File Migration Studio</h3>
                  <p className="text-xs text-muted-foreground">
                    Transfer files across storage providers while preserving URLs & metadata
                  </p>
                </div>
              </div>
              <button onClick={() => setMigrateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMigrate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Source Provider</label>
                  <select
                    value={migrateSource}
                    onChange={(e) => setMigrateSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-semibold"
                  >
                    <option value="local">Local Filesystem</option>
                    <option value="s3">Amazon S3</option>
                    <option value="r2">Cloudflare R2</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Target Destination</label>
                  <select
                    value={migrateTarget}
                    onChange={(e) => setMigrateTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-semibold"
                  >
                    <option value="r2">Cloudflare R2</option>
                    <option value="s3">Amazon S3</option>
                    <option value="local">Local Filesystem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Filter by Category</label>
                <select
                  value={migrateCategory}
                  onChange={(e) => setMigrateCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-semibold"
                >
                  <option value="">All Categories (Everything)</option>
                  <option value="package">Protected Product ZIP Packages</option>
                  <option value="thumbnail">Thumbnails</option>
                  <option value="banner">Banners</option>
                  <option value="screenshot">Screenshots</option>
                  <option value="document">Documentation</option>
                </select>
              </div>

              {migrationResult && (
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2 font-mono text-xs">
                  <div className="font-bold text-foreground">Migration Summary:</div>
                  <div className="flex justify-between">
                    <span>Total Matching:</span>
                    <span>{migrationResult.totalSelected}</span>
                  </div>
                  <div className="flex justify-between text-emerald-500">
                    <span>Transferred:</span>
                    <span>{migrationResult.migratedCount}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Failed:</span>
                    <span>{migrationResult.failedCount}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setMigrateOpen(false)}>
                  Close
                </Button>
                <Button type="submit" disabled={migrating || migrateSource === migrateTarget}>
                  {migrating ? 'Transferring Files...' : 'Execute Migration'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
