'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wand2, Code2, Layers, FileCode2, Globe, Package, Check, Copy,
  ArrowRight, ArrowLeft, RefreshCw, Shield, Key, Sparkles, CheckCircle2,
  XCircle, AlertTriangle, Terminal, Lock, Eye, EyeOff, ExternalLink,
  Zap, HardDrive, Cpu, ShieldCheck, Laptop, HelpCircle, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

type ProductTypeKey =
  | 'wordpress_plugin'
  | 'wordpress_theme'
  | 'php_script'
  | 'nextjs_app'
  | 'nextjs_theme'
  | 'nextjs_plugin';

interface WizardChecklist {
  productCreated: boolean;
  apiConfigured: boolean;
  sdkIntegrated: boolean;
  activationTested: boolean;
  validationTested: boolean;
  deactivationTested: boolean;
  updateTested: boolean;
  productionReady: boolean;
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

function CodeSnippet({ code, lang, title }: { code: string; lang: string; title?: string }) {
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

export default function ProductRegistrationWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Product Basics
  const [name, setName] = useState('WooCommerce Smart License Pro');
  const [slug, setSlug] = useState('woocommerce-smart-license-pro');
  const [sku, setSku] = useState('SKU-WOO-LIC-PRO');
  const [productType, setProductType] = useState<ProductTypeKey>('wordpress_plugin');
  const [description, setDescription] = useState('Automated licensing and update system for digital commerce.');
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [price, setPrice] = useState(59);

  // Step 2: License & Security Rules
  const [defaultActivationLimit, setDefaultActivationLimit] = useState(1);
  const [validationIntervalHours, setValidationIntervalHours] = useState(24);
  const [offlineGracePeriodDays, setOfflineGracePeriodDays] = useState(7);
  const [allowLocalhost, setAllowLocalhost] = useState(true);
  const [countLocalhost, setCountLocalhost] = useState(false);
  const [allowStaging, setAllowStaging] = useState(true);
  const [countStaging, setCountStaging] = useState(false);
  const [domainBinding, setDomainBinding] = useState(true);
  const [installationBinding, setInstallationBinding] = useState(true);
  const [allowDeactivation, setAllowDeactivation] = useState(true);
  const [automaticUpdatesEnabled, setAutomaticUpdatesEnabled] = useState(true);
  const [downloadsEnabled, setDownloadsEnabled] = useState(true);

  // Generated Product Data (from Step 3 onwards)
  const [registeredData, setRegisteredData] = useState<{
    product: any;
    credential: any;
    testLicenseKey: string;
    checklist: WizardChecklist;
    settings: any;
  } | null>(null);

  // Step 4: Template Tab
  const [templateSubTab, setTemplateSubTab] = useState<'setup' | 'methods' | 'ui'>('setup');
  const [showApiKey, setShowApiKey] = useState(false);

  // Step 5: Test Console State
  const [testingAction, setTestingAction] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [checklist, setChecklist] = useState<WizardChecklist>({
    productCreated: false,
    apiConfigured: false,
    sdkIntegrated: false,
    activationTested: false,
    validationTested: false,
    deactivationTested: false,
    updateTested: false,
    productionReady: false,
  });

  // Step 6: Finalize state
  const [finalizedSuccess, setFinalizedSuccess] = useState(false);

  // Auto-slugify product name
  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
    setSku(`SKU-${generated.slice(0, 12).toUpperCase()}`);
  };

  // Step 1 -> 2: Next
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Please provide product name and slug');
      return;
    }
    setError(null);
    setStep(2);
  };

  // Step 2 -> 3: Create Product & Credentials
  const handleStep2Submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        slug,
        sku,
        productType,
        description,
        currentVersion,
        price,
        licenseSettings: {
          defaultActivationLimit,
          validationIntervalHours,
          offlineGracePeriodDays,
          allowLocalhost,
          countLocalhost,
          allowStaging,
          countStaging,
          domainBinding,
          installationBinding,
          allowDeactivation,
          automaticUpdatesEnabled,
          downloadsEnabled,
        },
      };

      const res = await apiRequest('/admin/products/wizard', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = res.data || res;
      setRegisteredData(data);
      setChecklist(data.checklist || {
        productCreated: true,
        apiConfigured: true,
        sdkIntegrated: false,
        activationTested: false,
        validationTested: false,
        deactivationTested: false,
        updateTested: false,
        productionReady: false,
      });
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to register product via wizard');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 5: Test Console Action
  const handleRunTest = async (testType: 'activate' | 'validate' | 'deactivate' | 'checkUpdate') => {
    if (!registeredData?.product?._id) return;
    setTestingAction(testType);
    setError(null);
    try {
      const res = await apiRequest(`/admin/products/wizard/${registeredData.product._id}/test`, {
        method: 'POST',
        body: JSON.stringify({
          testType,
          licenseKey: registeredData.testLicenseKey,
          domain: 'demo.mystore.com',
        }),
      });

      const data = res.data || res;
      setTestResult(data.testResult);
      if (data.checklist) {
        setChecklist(data.checklist);
      }
    } catch (err: any) {
      setError(err.message || `Test ${testType} failed`);
    } finally {
      setTestingAction(null);
    }
  };

  // Step 6: Finalize
  const handleFinalize = async () => {
    if (!registeredData?.product?._id) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest(`/admin/products/wizard/${registeredData.product._id}/finalize`, {
        method: 'POST',
      });
      const data = res.data || res;
      setFinalizedSuccess(true);
      setChecklist((prev) => ({ ...prev, productionReady: true }));
    } catch (err: any) {
      setError(err.message || 'Cannot finalize product. Required tests must pass first.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Product Details' },
    { num: 2, label: 'License Rules' },
    { num: 3, label: 'API Credentials' },
    { num: 4, label: 'SDK Integration' },
    { num: 5, label: 'API Test Console' },
    { num: 6, label: 'Production Launch' },
  ];

  const productTypeCards = [
    { key: 'wordpress_plugin', label: 'WordPress Plugin', icon: Code2, desc: 'Hook into WP admin & auto-updates' },
    { key: 'wordpress_theme', label: 'WordPress Theme', icon: Layers, desc: 'functions.php licensing & notices' },
    { key: 'php_script', label: 'PHP Script / App', icon: FileCode2, desc: 'Universal standalone PHP integration' },
    { key: 'nextjs_app', label: 'Next.js App', icon: Globe, desc: 'Server-side route & middleware gating' },
    { key: 'nextjs_theme', label: 'Next.js Theme', icon: Layers, desc: 'Distributable UI theme for Next.js' },
    { key: 'nextjs_plugin', label: 'Next.js Plugin', icon: Package, desc: 'Reusable package licensing layer' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Product Registration & Integration Wizard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step-by-step setup to connect, configure, test, and release a licensed product into the ecosystem.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/integration">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <Zap className="h-3.5 w-3.5 text-indigo-500" />
              Integration Center
            </Button>
          </Link>
          <Link href="/admin/products">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <Package className="h-3.5 w-3.5" />
              Products List
            </Button>
          </Link>
        </div>
      </div>

      {/* Wizard Step Progression Bar */}
      <div className="p-4 rounded-3xl border border-border bg-card shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {stepsList.map((s) => {
            const isCompleted = step > s.num || (step === 6 && finalizedSuccess);
            const isCurrent = step === s.num;
            return (
              <div
                key={s.num}
                className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-600 shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                    : 'bg-secondary/20 border-transparent text-muted-foreground'
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.num}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold truncate leading-tight">{s.label}</p>
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">
                    {isCurrent ? 'Current' : isCompleted ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* STEP 1: Product Basics */}
      {step === 1 && (
        <form onSubmit={handleStep1Next} className="p-6 rounded-3xl border border-border bg-card space-y-6">
          <div>
            <h2 className="text-base font-black text-foreground">Step 1: Product Details & Platform Type</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter your product information. We will generate the required unique slug and API bindings.
            </p>
          </div>

          {/* Product Type Selector Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Select Product Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {productTypeCards.map((pt) => {
                const Icon = pt.icon;
                const isSelected = productType === pt.key;
                return (
                  <button
                    key={pt.key}
                    type="button"
                    onClick={() => setProductType(pt.key as ProductTypeKey)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-foreground shadow-xs'
                        : 'bg-secondary/20 border-border hover:bg-secondary/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-indigo-600' : 'text-muted-foreground'}`} />
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isSelected ? 'text-indigo-600' : 'text-foreground'}`}>{pt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{pt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Product Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. WooCommerce Smart License Pro"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-indigo-500/30 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Product Slug (Auto-Generated)</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="woocommerce-smart-license-pro"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-border bg-background focus:ring-2 focus:ring-indigo-500/30 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Internal SKU / Product Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-WOO-LIC-PRO"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-border bg-background focus:ring-2 focus:ring-indigo-500/30 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current Version</label>
              <input
                type="text"
                value={currentVersion}
                onChange={(e) => setCurrentVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-border bg-background focus:ring-2 focus:ring-indigo-500/30 outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of the software product..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-border">
            <Button type="submit" className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700">
              Continue to License Rules <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* STEP 2: License Rules & Security Behavior */}
      {step === 2 && (
        <div className="p-6 rounded-3xl border border-border bg-card space-y-6">
          <div>
            <h2 className="text-base font-black text-foreground">Step 2: License Rules & Security Configuration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure activation limits, periodic validation intervals, offline grace periods, and localhost behavior.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Default Activation Limit</label>
              <select
                value={defaultActivationLimit}
                onChange={(e) => setDefaultActivationLimit(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background font-semibold"
              >
                <option value={1}>1 Domain (Single Site)</option>
                <option value={3}>3 Domains (Multi Site)</option>
                <option value={5}>5 Domains (Developer)</option>
                <option value={25}>25 Domains (Agency)</option>
                <option value={999}>Unlimited Domains</option>
              </select>
              <p className="text-[10px] text-muted-foreground">Max authorized active domain slots.</p>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Validation Interval</label>
              <select
                value={validationIntervalHours}
                onChange={(e) => setValidationIntervalHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background font-semibold"
              >
                <option value={6}>Every 6 Hours</option>
                <option value={12}>Every 12 Hours</option>
                <option value={24}>Every 24 Hours (Standard)</option>
                <option value={48}>Every 48 Hours</option>
                <option value={72}>Every 3 Days</option>
                <option value={168}>Every 7 Days</option>
              </select>
              <p className="text-[10px] text-muted-foreground">Cached token validity window before server heartbeat.</p>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Offline Grace Period</label>
              <select
                value={offlineGracePeriodDays}
                onChange={(e) => setOfflineGracePeriodDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background font-semibold"
              >
                <option value={3}>3 Days</option>
                <option value={7}>7 Days (Standard)</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days (Extended)</option>
              </select>
              <p className="text-[10px] text-muted-foreground">Allows product to function if server is unreachable.</p>
            </div>
          </div>

          {/* Feature & Security Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              {
                title: 'Allow Localhost / Dev Domains',
                desc: 'Permit activations on localhost, 127.0.0.1, and .local without restriction.',
                checked: allowLocalhost,
                onChange: setAllowLocalhost,
              },
              {
                title: 'Count Localhost Against Limit',
                desc: 'If false, localhost activations are completely free and do not consume slots.',
                checked: countLocalhost,
                onChange: setCountLocalhost,
              },
              {
                title: 'Allow Staging Domains',
                desc: 'Permit staging/test domains (*.staging.*, *.stage.*).',
                checked: allowStaging,
                onChange: setAllowStaging,
              },
              {
                title: 'Domain & Hardware Binding',
                desc: 'Cryptographically bind activation token to domain and installation ID.',
                checked: domainBinding,
                onChange: setDomainBinding,
              },
              {
                title: 'Allow Self-Deactivation',
                desc: 'Allow customer to deactivate an installation and transfer slot.',
                checked: allowDeactivation,
                onChange: setAllowDeactivation,
              },
              {
                title: 'Automatic Updates & ZIP Delivery',
                desc: 'Serve protected update packages via signed temporary download URLs.',
                checked: automaticUpdatesEnabled,
                onChange: setAutomaticUpdatesEnabled,
              },
            ].map((tog) => (
              <div key={tog.title} className="p-3.5 rounded-2xl border border-border bg-card flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground">{tog.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{tog.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={tog.checked}
                  onChange={(e) => tog.onChange(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2 text-xs font-semibold">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleStep2Submit}
              disabled={submitting}
              className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate API Credentials & Initialize Product
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: API & Credentials Auto-Generated */}
      {step === 3 && registeredData && (
        <div className="p-6 rounded-3xl border border-border bg-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h2 className="text-base font-black text-foreground">Step 3: Product Registered & API Configured</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Product record and secure API client credentials have been automatically provisioned.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              API Active
            </span>
          </div>

          {/* Credentials Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product ID</span>
                <CopyButton text={registeredData.product._id} />
              </div>
              <code className="text-xs font-mono font-bold text-foreground block truncate">{registeredData.product._id}</code>
            </div>

            <div className="p-3.5 rounded-2xl border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product Slug</span>
                <CopyButton text={registeredData.product.slug} />
              </div>
              <code className="text-xs font-mono font-bold text-foreground block truncate">{registeredData.product.slug}</code>
            </div>

            <div className="p-3.5 rounded-2xl border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Public Client ID</span>
                <CopyButton text={registeredData.credential.clientId} />
              </div>
              <code className="text-xs font-mono font-bold text-foreground block truncate">{registeredData.credential.clientId}</code>
            </div>

            <div className="p-3.5 rounded-2xl border border-border bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">API Secret Key</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="p-1 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <CopyButton text={registeredData.credential.apiKey} />
                </div>
              </div>
              <code className="text-xs font-mono font-bold text-foreground block truncate">
                {showApiKey ? registeredData.credential.apiKey : registeredData.credential.apiKey.slice(0, 12) + '•'.repeat(24)}
              </code>
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Pre-Generated Sandbox License Key (For Testing)
                </span>
                <CopyButton text={registeredData.testLicenseKey} />
              </div>
              <code className="text-sm font-mono font-black text-indigo-600 block">{registeredData.testLicenseKey}</code>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2 text-xs font-semibold">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(4)} className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700">
              View Generated SDK Integration Code <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: SDK Code Generation */}
      {step === 4 && registeredData && (
        <div className="p-6 rounded-3xl border border-border bg-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-foreground">Step 4: Tailored SDK Integration Code</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drop this code into your {registeredData.product.name} repository. Variables are pre-injected.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-2xl bg-secondary/40 border border-border text-xs">
              <button
                type="button"
                onClick={() => setTemplateSubTab('setup')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  templateSubTab === 'setup' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                1. Setup Code
              </button>
              <button
                type="button"
                onClick={() => setTemplateSubTab('methods')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  templateSubTab === 'methods' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                2. Standard Methods
              </button>
              <button
                type="button"
                onClick={() => setTemplateSubTab('ui')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  templateSubTab === 'ui' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                3. Activation UI Form
              </button>
            </div>
          </div>

          {templateSubTab === 'setup' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Main Entry Point & Initialization</span>
              <CodeSnippet
                title="SDK Initialization & Pro Feature Gating"
                lang="php"
                code={registeredData.settings.templates[
                  productType.includes('wordpress') ? 'wordpressPlugin' : productType.includes('php') ? 'phpScript' : 'nextjsApp'
                ]?.setupCode || ''}
              />
            </div>
          )}

          {templateSubTab === 'methods' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Standard Methods Implementation</span>
              <CodeSnippet
                title="Standard Methods (activate, validate, deactivate, checkUpdate)"
                lang="php"
                code={registeredData.settings.templates[
                  productType.includes('wordpress') ? 'wordpressPlugin' : productType.includes('php') ? 'phpScript' : 'nextjsApp'
                ]?.methodsCode || ''}
              />
            </div>
          )}

          {templateSubTab === 'ui' && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Activation UI Form Example</span>
              <CodeSnippet
                title="End-User License Entry Card"
                lang="html"
                code={registeredData.settings.uiExamples.phpHtml}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setStep(3)} className="gap-2 text-xs font-semibold">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(5)} className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700">
              Proceed to Built-In API Test Console <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: Built-in API Test Console (Interactive Verification) */}
      {step === 5 && registeredData && (
        <div className="p-6 rounded-3xl border border-border bg-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-indigo-500" />
                <h2 className="text-base font-black text-foreground">Step 5: Built-in API Test Console & Verification Gate</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Execute live integration checks. Both <strong>Activation</strong> and <strong>Validation</strong> tests must pass to unlock production readiness.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                checklist.activationTested && checklist.validationTested
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              }`}>
                {checklist.activationTested && checklist.validationTested ? 'Tests Passed (Ready)' : 'Tests Incomplete'}
              </span>
            </div>
          </div>

          {/* Checklist Visualization Strip */}
          <div className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Integration Readiness Checklist
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {[
                { label: '1. Product Created', pass: checklist.productCreated },
                { label: '2. API Configured', pass: checklist.apiConfigured },
                { label: '3. SDK Integrated', pass: checklist.sdkIntegrated },
                { label: '4. Activation Tested', pass: checklist.activationTested, required: true },
                { label: '5. Validation Tested', pass: checklist.validationTested, required: true },
                { label: '6. Production Ready', pass: checklist.productionReady },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    item.pass
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                      : item.required
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {item.pass ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 opacity-50" />
                  )}
                  <span className="text-[10px] font-bold leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Test Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleRunTest('activate')}
              disabled={!!testingAction}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                checklist.activationTested
                  ? 'bg-emerald-500/5 border-emerald-500/30 text-foreground'
                  : 'bg-card border-border hover:border-indigo-500/40 hover:bg-secondary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Test 1 (Required)</span>
                {testingAction === 'activate' ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                ) : checklist.activationTested ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Play className="h-4 w-4 text-indigo-500" />
                )}
              </div>
              <p className="text-xs font-black text-foreground">Activate License</p>
              <p className="text-[10px] text-muted-foreground">Executes activation with sandbox key</p>
            </button>

            <button
              type="button"
              onClick={() => handleRunTest('validate')}
              disabled={!!testingAction}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                checklist.validationTested
                  ? 'bg-emerald-500/5 border-emerald-500/30 text-foreground'
                  : 'bg-card border-border hover:border-indigo-500/40 hover:bg-secondary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Test 2 (Required)</span>
                {testingAction === 'validate' ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                ) : checklist.validationTested ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Play className="h-4 w-4 text-indigo-500" />
                )}
              </div>
              <p className="text-xs font-black text-foreground">Validate Heartbeat</p>
              <p className="text-[10px] text-muted-foreground">Validates cached token against server</p>
            </button>

            <button
              type="button"
              onClick={() => handleRunTest('checkUpdate')}
              disabled={!!testingAction}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                checklist.updateTested
                  ? 'bg-emerald-500/5 border-emerald-500/30 text-foreground'
                  : 'bg-card border-border hover:border-indigo-500/40 hover:bg-secondary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Test 3 (Optional)</span>
                {testingAction === 'checkUpdate' ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                ) : checklist.updateTested ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Play className="h-4 w-4 text-indigo-500" />
                )}
              </div>
              <p className="text-xs font-black text-foreground">Check For Updates</p>
              <p className="text-[10px] text-muted-foreground">Verifies update channel & download URL</p>
            </button>

            <button
              type="button"
              onClick={() => handleRunTest('deactivate')}
              disabled={!!testingAction}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                checklist.deactivationTested
                  ? 'bg-emerald-500/5 border-emerald-500/30 text-foreground'
                  : 'bg-card border-border hover:border-indigo-500/40 hover:bg-secondary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Test 4 (Optional)</span>
                {testingAction === 'deactivate' ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                ) : checklist.deactivationTested ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Play className="h-4 w-4 text-indigo-500" />
                )}
              </div>
              <p className="text-xs font-black text-foreground">Deactivate Installation</p>
              <p className="text-[10px] text-muted-foreground">Releases activation domain slot</p>
            </button>
          </div>

          {/* Test Result Inspector */}
          {testResult && (
            <div className="p-4 rounded-2xl border border-border bg-[#0d1117] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    testResult.httpStatus === 200 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    HTTP {testResult.httpStatus}
                  </span>
                  <span className="text-xs font-bold text-foreground">{testResult.title || testResult.scenario}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Test Passed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Sent Request</span>
                  <pre className="p-3 rounded-xl bg-[#161b22] text-[11px] font-mono text-[#c9d1d9] overflow-x-auto">
                    <code>{JSON.stringify(testResult.request, null, 2)}</code>
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">API Response</span>
                  <pre className="p-3 rounded-xl bg-[#161b22] text-[11px] font-mono text-[#c9d1d9] overflow-x-auto">
                    <code>{JSON.stringify(testResult.response, null, 2)}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setStep(4)} className="gap-2 text-xs font-semibold">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => setStep(6)}
              disabled={!checklist.activationTested || !checklist.validationTested}
              className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Continue to Production Launch <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6: Finalize & Production Launch */}
      {step === 6 && registeredData && (
        <div className="p-6 rounded-3xl border border-border bg-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <h2 className="text-base font-black text-foreground">Step 6: Production Launch & Verification Gate</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review integration verification before marking this product as Production Ready.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
              finalizedSuccess
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
            }`}>
              {finalizedSuccess ? 'Production Ready' : 'Pending Final Launch'}
            </span>
          </div>

          {/* Verification Status Card */}
          <div className="p-5 rounded-3xl border border-border bg-secondary/20 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Verification Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Product Name</span>
                <span className="font-bold text-foreground truncate block">{registeredData.product.name}</span>
              </div>
              <div className="p-3 rounded-2xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Slug</span>
                <span className="font-mono font-bold text-foreground truncate block">{registeredData.product.slug}</span>
              </div>
              <div className="p-3 rounded-2xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Client ID</span>
                <span className="font-mono font-bold text-foreground truncate block">{registeredData.credential.clientId}</span>
              </div>
              <div className="p-3 rounded-2xl bg-card border border-border">
                <span className="text-[10px] text-muted-foreground uppercase block">Integration Tests</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> All Tests Passed
                </span>
              </div>
            </div>
          </div>

          {finalizedSuccess ? (
            <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">{registeredData.product.name} is Production Ready!</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  The product is now active in the license manager. Customers can purchase, activate, and validate licenses seamlessly.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Link href="/admin/integration">
                  <Button variant="default" className="gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700">
                    <Zap className="h-3.5 w-3.5" /> Open Integration Center
                  </Button>
                </Link>
                <Link href="/admin/products">
                  <Button variant="outline" className="gap-2 text-xs font-semibold">
                    <Package className="h-3.5 w-3.5" /> View Products Catalog
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setStep(5)} className="gap-2 text-xs font-semibold">
                <ArrowLeft className="h-4 w-4" /> Back to Test Console
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={submitting}
                className="gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Finalize & Mark Production Ready
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
