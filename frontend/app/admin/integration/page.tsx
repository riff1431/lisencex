'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Code2, Key, Shield, Copy, Check, RefreshCw, Eye, EyeOff,
  Globe, Lock, AlertTriangle, Sparkles, ExternalLink, Terminal,
  BookOpen, ChevronRight, Package, Layers, FileCode2, Server,
  CheckCircle2, XCircle, Play, ArrowRight, Download, HelpCircle,
  Cpu, Zap, ShieldCheck, Flame, Laptop, HardDrive, Wand2, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { IntegrationPackageModal } from '@/components/integration-package-modal';
import { LicenseVerificationModal } from '@/components/license-verification-modal';

interface Product {
  _id: string;
  name: string;
  slug: string;
  productType?: string;
  type?: string;
  status: string;
  integrationStatus?: 'not_integrated' | 'testing' | 'production_ready';
  currentVersion?: string;
}

interface IntegrationSettings {
  productId: string;
  productName: string;
  productSlug: string;
  productType: string;
  currentVersion: string;
  integrationStatus: 'not_integrated' | 'testing' | 'production_ready';
  integrationMetadata: Record<string, any>;
  publicClientId: string;
  apiKey: string;
  credentialName: string;
  scopes: string[];
  publicVerificationKey: string;
  endpoints: {
    activationUrl: string;
    validationUrl: string;
    deactivationUrl: string;
    updateUrl: string;
    downloadUrlTemplate: string;
  };
  licenseSettings: {
    validationIntervalHours: number;
    offlineGracePeriodDays: number;
    allowLocalhost: boolean;
    countLocalhost: boolean;
    allowStaging: boolean;
    countStaging: boolean;
    domainBinding: boolean;
    installationBinding: boolean;
    allowDeactivation: boolean;
    defaultActivationLimit: number;
  };
  templates: Record<string, {
    title: string;
    language: string;
    description: string;
    setupCode: string;
    methodsCode: string;
  }>;
  uiExamples: {
    phpHtml: string;
    reactComponent: string;
  };
}

interface TestScenarioResult {
  scenario: string;
  title: string;
  status: string;
  httpStatus: number;
  request: {
    url: string;
    method: string;
    body: any;
  };
  response: any;
  developerGuideline: string;
}

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-secondary/60 ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang, title }: { code: string; lang: string; title?: string }) {
  return (
    <div className="rounded-2xl border border-border/80 overflow-hidden bg-[#0d1117] shadow-xs">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-border/40">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
            {title}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/70">{lang}</span>
            <CopyButton text={code} />
          </div>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed font-mono text-[#c9d1d9]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function AdminIntegrationCenterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [integrationData, setIntegrationData] = useState<IntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Template active tab
  const [activeTemplateTab, setActiveTemplateTab] = useState<'wordpressPlugin' | 'wordpressTheme' | 'phpScript' | 'nextjsApp' | 'nextjsPlugin'>('wordpressPlugin');
  const [templateSubView, setTemplateSubView] = useState<'setup' | 'methods' | 'ui'>('setup');

  // Test scenario runner state
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [scenarioResult, setScenarioResult] = useState<TestScenarioResult | null>(null);

  // Key masking
  const [showApiKey, setShowApiKey] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await apiRequest('/admin/products?limit=100');
      const items = res.data?.items || res.data || [];
      setProducts(items);
      if (items.length > 0) {
        setSelectedProductId(items[0]._id);
        loadIntegration(items[0]._id);
      }
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegration = async (productId: string) => {
    setDataLoading(true);
    setScenarioResult(null);
    try {
      const res = await apiRequest(`/admin/products/${productId}/integration`);
      setIntegrationData(res.data || res);
    } catch (e) {
      console.error('Failed to load integration data', e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    loadIntegration(productId);
  };

  const handleUpdateStatus = async (newStatus: 'not_integrated' | 'testing' | 'production_ready') => {
    if (!selectedProductId) return;
    setUpdatingStatus(true);
    try {
      await apiRequest(`/admin/products/${selectedProductId}/integration/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (integrationData) {
        setIntegrationData({ ...integrationData, integrationStatus: newStatus });
      }
      setProducts((prev) =>
        prev.map((p) => (p._id === selectedProductId ? { ...p, integrationStatus: newStatus } : p))
      );
    } catch (e: any) {
      alert(e.message || 'Could not update integration status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRunTestScenario = async (scenario: string) => {
    if (!selectedProductId) return;
    setRunningScenario(scenario);
    try {
      const res = await apiRequest(`/admin/products/${selectedProductId}/integration/test-scenario`, {
        method: 'POST',
        body: JSON.stringify({ scenario }),
      });
      setScenarioResult(res.data || res);
    } catch (e: any) {
      alert(e.message || 'Scenario run failed');
    } finally {
      setRunningScenario(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'production_ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Production Ready
          </span>
        );
      case 'testing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Sparkles className="h-3 w-3" /> Testing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary text-muted-foreground border border-border">
            <AlertTriangle className="h-3 w-3" /> Not Integrated
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="h-7 w-7 animate-spin text-indigo-500" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Developer Integration Center...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <Code2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight">Developer Integration Center</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                SDK v2.0
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ready-to-use licensing parameters, SDK templates, and live test scenario runner for every product.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/products/wizard">
            <Button size="sm" className="gap-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20">
              <Wand2 className="h-3.5 w-3.5" />
              Register New Product (Wizard)
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold">
              <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
              API Docs
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Button>
          </Link>
          <Link href="/playground">
            <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold">
              <Terminal className="h-3.5 w-3.5" />
              Playground
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Sidebar product selector + Center content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Product Picker */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Select Product</span>
            <span className="text-[10px] font-semibold text-muted-foreground font-mono">{products.length} Products</span>
          </div>

          <div className="space-y-1.5 max-h-[700px] overflow-y-auto pr-1">
            {products.map((p) => {
              const isSelected = p._id === selectedProductId;
              return (
                <button
                  key={p._id}
                  onClick={() => handleSelectProduct(p._id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-foreground shadow-xs'
                      : 'bg-card border-border hover:bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-600' : 'text-foreground'}`}>
                      {p.name}
                    </span>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-indigo-600' : 'text-muted-foreground/40'}`} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span className="truncate">{p.slug}</span>
                    <span className="capitalize">{p.productType?.replace(/_/g, ' ') || 'Plugin'}</span>
                  </div>
                  <div className="pt-1">
                    {getStatusBadge(p.integrationStatus)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Columns: Integration Hub for Selected Product */}
        <div className="lg:col-span-3 space-y-6">
          {dataLoading || !integrationData ? (
            <div className="p-12 border border-border rounded-3xl bg-card flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
              <p className="text-xs text-muted-foreground">Loading product integration parameters...</p>
            </div>
          ) : (
            <>
              {/* Product Header & Status Bar */}
              <div className="p-5 rounded-3xl border border-border bg-card/80 backdrop-blur-md shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-black text-foreground">{integrationData.productName}</h2>
                      {getStatusBadge(integrationData.integrationStatus)}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      ID: <span className="text-foreground">{integrationData.productId}</span> • Slug: <span className="text-foreground">{integrationData.productSlug}</span> • Version: <span className="text-foreground">{integrationData.currentVersion}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => setIsVerificationModalOpen(true)}
                      className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      <Award className="h-3.5 w-3.5" />
                      Verify & Certify (13 Tests)
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setIsPackageModalOpen(true)}
                      className="gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Generate Package (.ZIP)
                    </Button>

                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-secondary/50 border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Set Status:</span>
                      {(['not_integrated', 'testing', 'production_ready'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(st)}
                          disabled={updatingStatus}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all capitalize ${
                            integrationData.integrationStatus === st
                              ? 'bg-background text-foreground shadow-xs border border-border'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Policy Highlights Pill Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60">
                  <div className="p-2.5 rounded-2xl bg-secondary/30 border border-border text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Cache Interval</span>
                    <span className="text-xs font-black text-foreground">{integrationData.licenseSettings.validationIntervalHours} Hours</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-secondary/30 border border-border text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Offline Grace</span>
                    <span className="text-xs font-black text-foreground">{integrationData.licenseSettings.offlineGracePeriodDays} Days</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-secondary/30 border border-border text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Localhost / Dev</span>
                    <span className="text-xs font-black text-emerald-600">
                      {integrationData.licenseSettings.allowLocalhost ? 'Allowed (Free)' : 'Restricted'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-secondary/30 border border-border text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Activation Limit</span>
                    <span className="text-xs font-black text-foreground">{integrationData.licenseSettings.defaultActivationLimit} Domain(s)</span>
                  </div>
                </div>
              </div>

              {/* Ready-to-Use Integration Parameters Grid */}
              <div className="p-5 rounded-3xl border border-border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                      Product Integration Parameters
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Required for SDK initialization</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Public Client ID */}
                  <div className="p-3 rounded-2xl border border-border bg-secondary/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Public Client ID</span>
                      <CopyButton text={integrationData.publicClientId} />
                    </div>
                    <code className="text-xs font-mono font-bold text-foreground block truncate">{integrationData.publicClientId}</code>
                  </div>

                  {/* API Key */}
                  <div className="p-3 rounded-2xl border border-border bg-secondary/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client API Key</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded"
                        >
                          {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <CopyButton text={integrationData.apiKey} />
                      </div>
                    </div>
                    <code className="text-xs font-mono font-bold text-foreground block truncate">
                      {showApiKey ? integrationData.apiKey : integrationData.apiKey.slice(0, 12) + '•'.repeat(24)}
                    </code>
                  </div>

                  {/* Public Verification Key */}
                  <div className="p-3 rounded-2xl border border-border bg-secondary/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Public Verification Key</span>
                      <CopyButton text={integrationData.publicVerificationKey} />
                    </div>
                    <code className="text-xs font-mono font-bold text-foreground block truncate">{integrationData.publicVerificationKey}</code>
                  </div>

                  {/* Product Slug */}
                  <div className="p-3 rounded-2xl border border-border bg-secondary/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product Slug</span>
                      <CopyButton text={integrationData.productSlug} />
                    </div>
                    <code className="text-xs font-mono font-bold text-foreground block truncate">{integrationData.productSlug}</code>
                  </div>
                </div>

                {/* API Endpoints Accordion/List */}
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Product API Endpoints
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { name: 'Activation Endpoint', method: 'POST', url: integrationData.endpoints.activationUrl },
                      { name: 'Validation Heartbeat', method: 'POST', url: integrationData.endpoints.validationUrl },
                      { name: 'Deactivation Endpoint', method: 'POST', url: integrationData.endpoints.deactivationUrl },
                      { name: 'Update Checker', method: 'GET', url: integrationData.endpoints.updateUrl },
                    ].map((ep) => (
                      <div key={ep.name} className="p-2.5 rounded-2xl bg-secondary/30 border border-border flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${ep.method === 'POST' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-blue-500/15 text-blue-600'}`}>
                              {ep.method}
                            </span>
                            <span className="text-[10px] font-bold text-foreground">{ep.name}</span>
                          </div>
                          <code className="text-[10px] font-mono text-muted-foreground truncate block mt-0.5">{ep.url}</code>
                        </div>
                        <CopyButton text={ep.url} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Integration Templates & SDK Section */}
              <div className="p-5 rounded-3xl border border-border bg-card space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                      SDK Integration Templates
                    </h3>
                  </div>

                  {/* Sub-view toggle (Setup vs Methods vs UI) */}
                  <div className="flex items-center gap-1 p-1 rounded-2xl bg-secondary/40 border border-border text-xs">
                    <button
                      onClick={() => setTemplateSubView('setup')}
                      className={`px-3 py-1 rounded-xl font-bold transition-all ${
                        templateSubView === 'setup' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      1. Setup & Init
                    </button>
                    <button
                      onClick={() => setTemplateSubView('methods')}
                      className={`px-3 py-1 rounded-xl font-bold transition-all ${
                        templateSubView === 'methods' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      2. Methods Usage
                    </button>
                    <button
                      onClick={() => setTemplateSubView('ui')}
                      className={`px-3 py-1 rounded-xl font-bold transition-all ${
                        templateSubView === 'ui' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      3. Activation UI Example
                    </button>
                  </div>
                </div>

                {/* Product Type Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
                  {[
                    { id: 'wordpressPlugin', label: 'WordPress Plugin', icon: Code2 },
                    { id: 'wordpressTheme', label: 'WordPress Theme', icon: Layers },
                    { id: 'phpScript', label: 'PHP Script / App', icon: FileCode2 },
                    { id: 'nextjsApp', label: 'Next.js App', icon: Globe },
                    { id: 'nextjsPlugin', label: 'Next.js Plugin/Theme', icon: Package },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTemplateTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTemplateTab(tab.id as any)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                          isActive
                            ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/30'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Template Content */}
                <div className="space-y-4">
                  {templateSubView === 'setup' && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Initialize the client using your product credentials. Pass this to your application bootstrapper:
                      </p>
                      <CodeBlock
                        title={`${integrationData.templates[activeTemplateTab]?.title} — Initialization`}
                        lang={integrationData.templates[activeTemplateTab]?.language || 'php'}
                        code={integrationData.templates[activeTemplateTab]?.setupCode || ''}
                      />
                    </div>
                  )}

                  {templateSubView === 'methods' && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Standard methods implemented: <code className="text-indigo-500 font-bold">activate()</code>, <code className="text-indigo-500 font-bold">validate()</code>, <code className="text-indigo-500 font-bold">deactivate()</code>, <code className="text-indigo-500 font-bold">getLicenseStatus()</code>, and <code className="text-indigo-500 font-bold">checkForUpdates()</code>:
                      </p>
                      <CodeBlock
                        title={`${integrationData.templates[activeTemplateTab]?.title} — Standard Methods`}
                        lang={integrationData.templates[activeTemplateTab]?.language || 'php'}
                        code={integrationData.templates[activeTemplateTab]?.methodsCode || ''}
                      />
                    </div>
                  )}

                  {templateSubView === 'ui' && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Standard activation form example for customers to enter their license key or Envato purchase code:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase">PHP / HTML Form</span>
                          <CodeBlock
                            title="HTML/PHP Activation Card"
                            lang="html"
                            code={integrationData.uiExamples.phpHtml}
                          />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase">React / Next.js Component</span>
                          <CodeBlock
                            title="React Activation Modal"
                            lang="tsx"
                            code={integrationData.uiExamples.reactComponent}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Integration Mode (Interactive Scenario Runner) */}
              <div className="p-5 rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/5 via-card to-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                      Test Integration Mode (Live Sandbox Simulator)
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    Interactive Verification
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Simulate all client scenarios before releasing your product. Test activation, expiry, revocation, domain mismatches, and deactivations:
                </p>

                {/* Scenario buttons grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ACTIVATE_VALID', label: '1. Valid Activation', icon: CheckCircle2, color: 'text-emerald-500' },
                    { id: 'ACTIVATE_INVALID_KEY', label: '2. Invalid Key', icon: XCircle, color: 'text-red-500' },
                    { id: 'ACTIVATE_EXPIRED', label: '3. Expired License', icon: AlertTriangle, color: 'text-amber-500' },
                    { id: 'ACTIVATE_REVOKED', label: '4. Revoked License', icon: Lock, color: 'text-red-500' },
                    { id: 'ACTIVATE_DOMAIN_MISMATCH', label: '5. Domain Mismatch', icon: Globe, color: 'text-amber-500' },
                    { id: 'ACTIVATE_LIMIT_REACHED', label: '6. Limit Exhausted', icon: HardDrive, color: 'text-purple-500' },
                    { id: 'VALIDATE_ACTIVE', label: '7. Heartbeat Check', icon: RefreshCw, color: 'text-blue-500' },
                    { id: 'DEACTIVATE_SUCCESS', label: '8. Deactivation', icon: ArrowRight, color: 'text-indigo-500' },
                  ].map((sc) => {
                    const Icon = sc.icon;
                    const isRunning = runningScenario === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleRunTestScenario(sc.id)}
                        disabled={!!runningScenario}
                        className="p-3 rounded-2xl border border-border bg-card hover:bg-secondary/60 hover:border-indigo-500/30 transition-all text-left flex flex-col gap-1 shadow-2xs group disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`h-4 w-4 ${sc.color}`} />
                          {isRunning && <RefreshCw className="h-3 w-3 animate-spin text-indigo-500" />}
                        </div>
                        <span className="text-[11px] font-bold text-foreground group-hover:text-indigo-600 transition-colors">
                          {sc.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Scenario Result Inspection Box */}
                {scenarioResult && (
                  <div className="p-4 rounded-2xl border border-border bg-[#0d1117] space-y-3 pt-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          scenarioResult.httpStatus === 200 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          HTTP {scenarioResult.httpStatus}
                        </span>
                        <span className="text-xs font-bold text-foreground">{scenarioResult.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{scenarioResult.scenario}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Simulated Request</span>
                        <pre className="p-3 rounded-xl bg-[#161b22] text-[11px] font-mono text-[#c9d1d9] overflow-x-auto">
                          <code>{JSON.stringify(scenarioResult.request, null, 2)}</code>
                        </pre>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Server Response</span>
                        <pre className="p-3 rounded-xl bg-[#161b22] text-[11px] font-mono text-[#c9d1d9] overflow-x-auto">
                          <code>{JSON.stringify(scenarioResult.response, null, 2)}</code>
                        </pre>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-muted-foreground flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-indigo-400 block mb-0.5">Developer Guideline</span>
                        <span>{scenarioResult.developerGuideline}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Architecture & Security Checklist */}
              <div className="p-5 rounded-3xl border border-border bg-card space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                    Licensing Architecture & Security Best Practices
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border space-y-1.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-indigo-500" /> Auto-Generated Installation ID
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Each installed product generates a persistent UUID/random hash on first activation and stores it locally to bind the activation slot.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border space-y-1.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5 text-indigo-500" /> Offline Grace Period
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      If the client site temporarily loses connectivity, the product continues to function normally for {integrationData.licenseSettings.offlineGracePeriodDays} days without disruption.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border space-y-1.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-indigo-500" /> Zero Private Secrets
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Private JWT signing keys remain strictly on the backend. Distributed client code only handles signed validation tokens.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Integration Package Modal */}
      {selectedProductId && integrationData && (
        <IntegrationPackageModal
          productId={selectedProductId}
          productName={integrationData.productName}
          isOpen={isPackageModalOpen}
          onClose={() => setIsPackageModalOpen(false)}
        />
      )}

      {/* License Verification & Certification Modal */}
      {selectedProductId && integrationData && (
        <LicenseVerificationModal
          productId={selectedProductId}
          productName={integrationData.productName}
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          onStatusChanged={(newStatus: string) => {
            if (integrationData) {
              setIntegrationData({ ...integrationData, integrationStatus: newStatus as any });
            }
            setProducts((prev) =>
              prev.map((p) => (p._id === selectedProductId ? { ...p, integrationStatus: newStatus as any } : p))
            );
          }}
        />
      )}
    </div>
  );
}
