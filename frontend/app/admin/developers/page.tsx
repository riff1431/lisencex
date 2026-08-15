'use client';

import React, { useState, useEffect } from 'react';
import {
  Code2, Key, Shield, Copy, Check, RefreshCw, Eye, EyeOff,
  Plus, Trash2, ToggleLeft, ToggleRight, Globe, Lock,
  AlertTriangle, Sparkles, ExternalLink, Terminal, BookOpen,
  ChevronDown, Package, Layers, FileCode2, Server, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
}

interface Credential {
  _id: string;
  productId: string;
  clientId: string;
  apiKey: string;
  name: string;
  scopes: string[];
  status: string;
  rotatedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/50">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function MaskedValue({ value, label }: { value: string; label: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 bg-secondary/40 rounded-xl px-3 py-2 border border-border">
        <code className="text-xs font-mono flex-1 break-all">{visible ? value : value.slice(0, 12) + '•'.repeat(20)}</code>
        <button onClick={() => setVisible(!visible)} className="text-muted-foreground hover:text-foreground transition-colors">
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <CopyButton text={value} />
      </div>
    </div>
  );
}

export default function AdminDevelopersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [credLoading, setCredLoading] = useState(false);
  const [newCredName, setNewCredName] = useState('');
  const [newCredScopes, setNewCredScopes] = useState<string[]>(['activate', 'validate', 'update', 'download']);
  const [showNewCredForm, setShowNewCredForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await apiRequest('/admin/products?limit=100');
      const items = res.data?.items || res.data || [];
      setProducts(items);
      if (items.length > 0) {
        setSelectedProduct(items[0]);
        loadCredentials(items[0]._id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async (productId: string) => {
    setCredLoading(true);
    try {
      const res = await apiRequest(`/admin/products/${productId}/credentials`);
      setCredentials(Array.isArray(res.data) ? res.data : res.data || []);
    } catch (e) {
      setCredentials([]);
    } finally {
      setCredLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    loadCredentials(product._id);
    setShowNewCredForm(false);
  };

  const handleCreateCredential = async () => {
    if (!selectedProduct || !newCredName.trim()) return;
    setActionLoading('create');
    try {
      await apiRequest(`/admin/products/${selectedProduct._id}/credentials`, {
        method: 'POST',
        body: JSON.stringify({ name: newCredName, scopes: newCredScopes }),
      });
      setNewCredName('');
      setShowNewCredForm(false);
      loadCredentials(selectedProduct._id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRotate = async (credId: string) => {
    if (!selectedProduct) return;
    if (!confirm('Rotate this credential? Old key will have a 30-day grace period.')) return;
    setActionLoading(credId);
    try {
      await apiRequest(`/admin/products/${selectedProduct._id}/credentials/${credId}/rotate`, { method: 'POST' });
      loadCredentials(selectedProduct._id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (credId: string) => {
    if (!selectedProduct) return;
    setActionLoading(credId);
    try {
      await apiRequest(`/admin/products/${selectedProduct._id}/credentials/${credId}/toggle`, { method: 'POST' });
      loadCredentials(selectedProduct._id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (credId: string) => {
    if (!selectedProduct) return;
    if (!confirm('Permanently delete this credential? This cannot be undone.')) return;
    setActionLoading(credId);
    try {
      await apiRequest(`/admin/products/${selectedProduct._id}/credentials/${credId}`, { method: 'DELETE' });
      loadCredentials(selectedProduct._id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleScope = (scope: string) => {
    setNewCredScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  const getTypeIcon = (type: string) => {
    if (type?.includes('wordpress') || type?.includes('wp')) return Code2;
    if (type?.includes('next')) return Globe;
    if (type?.includes('php')) return FileCode2;
    return Package;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight">Developer Settings</h1>
              <p className="text-xs text-muted-foreground">API credentials, endpoints & integration configuration</p>
            </div>
          </div>
        </div>
        <Link href="/docs" target="_blank">
          <Button variant="outline" className="gap-2 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            API Documentation
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* API Base URL & Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Server className="h-4 w-4 text-indigo-500" />
            API Base URL
          </div>
          <div className="flex items-center gap-2 bg-secondary/40 rounded-xl px-3 py-2 border border-border">
            <code className="text-xs font-mono flex-1 break-all text-emerald-600">{API_BASE}</code>
            <CopyButton text={API_BASE} />
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Shield className="h-4 w-4 text-amber-500" />
            Auth Method
          </div>
          <p className="text-xs text-muted-foreground">
            <code className="bg-secondary/60 px-1.5 py-0.5 rounded text-[11px]">X-Client-ID</code> + <code className="bg-secondary/60 px-1.5 py-0.5 rounded text-[11px]">X-API-Key</code> headers
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Terminal className="h-4 w-4 text-purple-500" />
            Quick Links
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/admin/integration" className="text-[11px] font-semibold text-indigo-500 hover:underline flex items-center gap-1">
              <Zap className="h-3 w-3" /> Integration Center
            </Link>
            <Link href="/playground" className="text-[11px] font-semibold text-indigo-500 hover:underline flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Playground
            </Link>
            <Link href="/docs" className="text-[11px] font-semibold text-indigo-500 hover:underline flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Docs
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Product Selector */}
        <div className="lg:col-span-1 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-1">Products</p>
          <div className="space-y-1.5">
            {products.map(p => {
              const Icon = getTypeIcon(p.type);
              const isSelected = selectedProduct?._id === p._id;
              return (
                <button
                  key={p._id}
                  onClick={() => handleSelectProduct(p)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-600'
                      : 'border border-transparent hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-600' : ''}`}>{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.slug}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                    p.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>{p.status}</span>
                </button>
              );
            })}
            {products.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No products found. Create one first.
              </div>
            )}
          </div>
        </div>

        {/* Credentials Panel */}
        <div className="lg:col-span-3 space-y-5">
          {selectedProduct ? (
            <>
              {/* Product Info Header */}
              <div className="p-5 rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-foreground">{selectedProduct.name}</h2>
                    <p className="text-xs text-muted-foreground font-mono">{selectedProduct.slug}</p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => setShowNewCredForm(true)}
                  >
                    <Plus className="h-3.5 w-3.5" /> New Credential
                  </Button>
                </div>

                {/* Endpoint Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-border">
                  {[
                    { label: 'Activate', path: `${API_BASE}/public/licenses/activate`, method: 'POST' },
                    { label: 'Validate', path: `${API_BASE}/public/licenses/validate`, method: 'POST' },
                    { label: 'Deactivate', path: `${API_BASE}/public/licenses/deactivate`, method: 'POST' },
                    { label: 'Updates', path: `${API_BASE}/public/products/${selectedProduct.slug}/updates`, method: 'GET' },
                  ].map(ep => (
                    <div key={ep.label} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30 border border-border">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        ep.method === 'POST' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-blue-500/15 text-blue-600'
                      }`}>{ep.method}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-foreground">{ep.label}</p>
                        <p className="text-[9px] font-mono text-muted-foreground truncate">{ep.path}</p>
                      </div>
                      <CopyButton text={ep.path} />
                    </div>
                  ))}
                </div>
              </div>

              {/* New Credential Form */}
              {showNewCredForm && (
                <div className="p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-foreground">Create API Credential</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Credential Name</label>
                      <input
                        type="text"
                        value={newCredName}
                        onChange={e => setNewCredName(e.target.value)}
                        placeholder="e.g. Production SDK, Development Key..."
                        className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scopes</label>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {['activate', 'validate', 'update', 'download'].map(scope => (
                          <button
                            key={scope}
                            onClick={() => toggleScope(scope)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              newCredScopes.includes(scope)
                                ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                                : 'bg-secondary/30 text-muted-foreground border-border hover:border-indigo-500/20'
                            }`}
                          >
                            {scope}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleCreateCredential} disabled={actionLoading === 'create' || !newCredName.trim()} className="gap-2 text-xs">
                        {actionLoading === 'create' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Create
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowNewCredForm(false)} className="text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Credentials List */}
              {credLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : credentials.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-border bg-secondary/20 text-center space-y-3">
                  <Key className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-bold text-foreground">No API Credentials</p>
                  <p className="text-xs text-muted-foreground">Create your first credential to start integrating with this product.</p>
                  <Button size="sm" onClick={() => setShowNewCredForm(true)} className="gap-2 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Create Credential
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {credentials.map(cred => (
                    <div key={cred._id} className={`rounded-2xl border bg-card overflow-hidden ${
                      cred.status === 'disabled' ? 'border-border/50 opacity-70' :
                      cred.status === 'rotated' ? 'border-amber-500/30' : 'border-border'
                    }`}>
                      <div className="p-5 space-y-4">
                        {/* Credential Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                              cred.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                              cred.status === 'rotated' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-secondary text-muted-foreground'
                            }`}>
                              <Key className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">{cred.name}</h3>
                              <p className="text-[10px] text-muted-foreground">
                                Created {new Date(cred.createdAt).toLocaleDateString()}
                                {cred.status === 'rotated' && cred.expiresAt && (
                                  <span className="text-amber-500 ml-2">
                                    • Grace until {new Date(cred.expiresAt).toLocaleDateString()}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              cred.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                              cred.status === 'rotated' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                              'bg-secondary text-muted-foreground border border-border'
                            }`}>{cred.status}</span>
                          </div>
                        </div>

                        {/* Keys */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <MaskedValue value={cred.clientId} label="Client ID" />
                          <MaskedValue value={cred.apiKey} label="API Key" />
                        </div>

                        {/* Scopes */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scopes</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {cred.scopes.map(scope => (
                              <span key={scope} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                {scope}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => handleRotate(cred._id)}
                            disabled={actionLoading === cred._id || cred.status === 'disabled'}
                          >
                            {actionLoading === cred._id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Rotate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => handleToggle(cred._id)}
                            disabled={actionLoading === cred._id}
                          >
                            {cred.status === 'disabled' ? <ToggleLeft className="h-3 w-3" /> : <ToggleRight className="h-3 w-3" />}
                            {cred.status === 'disabled' ? 'Enable' : 'Disable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 ml-auto"
                            onClick={() => handleDelete(cred._id)}
                            disabled={actionLoading === cred._id}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Integration Quick Reference */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Quick Integration Reference
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { type: 'WordPress Plugin', desc: 'Use LicenseNest_Plugin PHP SDK class', icon: Code2 },
                    { type: 'WordPress Theme', desc: 'Use LicenseNest_Theme PHP SDK class', icon: Layers },
                    { type: 'PHP Script', desc: 'Use LicenseNest_PHP standalone SDK', icon: FileCode2 },
                    { type: 'Next.js App', desc: 'Use LicenseNestNextApp TS SDK (server-side)', icon: Globe },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.type} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                        <Icon className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.type}</p>
                          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <Link href="/docs" className="text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1">
                    View full integration guides & code examples <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <Code2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-bold">Select a product</p>
              <p className="text-xs">Choose a product from the left panel to manage its API credentials.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
