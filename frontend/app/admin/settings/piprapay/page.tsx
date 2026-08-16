'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Zap,
  Globe,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  ChevronLeft,
  Sliders,
  Sparkles,
  Server,
  Activity,
  Layers,
  ArrowRight,
  Info,
  DollarSign,
  Wallet,
  Building,
  Terminal,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

const AVAILABLE_CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)', flag: '🇺🇸' },
  { code: 'BDT', name: 'Bangladeshi Taka (৳)', flag: '🇧🇩' },
  { code: 'EUR', name: 'Euro (€)', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound (£)', flag: '🇬🇧' },
  { code: 'CAD', name: 'Canadian Dollar (C$)', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar (A$)', flag: '🇦🇺' },
  { code: 'INR', name: 'Indian Rupee (₹)', flag: '🇮🇳' },
  { code: 'AED', name: 'UAE Dirham (د.إ)', flag: '🇦🇪' },
  { code: 'MYR', name: 'Malaysian Ringgit (RM)', flag: '🇲🇾' },
  { code: 'SGD', name: 'Singapore Dollar (S$)', flag: '🇸🇬' },
];

export default function AdminPipraPaySettingsPage() {
  const [config, setConfig] = useState({
    apiUrl: 'https://pay.huipper.com/api',
    apiKey: '',
    sandboxMode: false,
    webhookSecret: '',
    checkoutEndpoint: '/checkout/redirect',
    verifyEndpoint: '/verify-payment',
    refundEndpoint: '/refund-payment',
    supportedCurrencies: ['USD', 'BDT', 'EUR', 'GBP'],
    enabled: false,
    title: 'PipraPay (Cards, Mobile Banking & Wallets)',
    description: 'Pay securely using Credit/Debit Card, bKash, Nagad, Rocket or International Cards via PipraPay',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvancedEndpoints, setShowAdvancedEndpoints] = useState(false);

  // Webhook URL
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setWebhookUrl(`${origin}/api/v1/public/payments/webhook/piprapay`);
    }
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/settings/piprapay');
      const data = res.data || res;
      if (data) {
        setConfig((prev) => ({
          ...prev,
          ...data,
          apiUrl: data.apiUrl || 'https://pay.huipper.com/api',
          checkoutEndpoint: data.checkoutEndpoint || '/checkout/redirect',
          verifyEndpoint: data.verifyEndpoint || '/verify-payment',
          refundEndpoint: data.refundEndpoint || '/refund-payment',
          supportedCurrencies: data.supportedCurrencies || prev.supportedCurrencies,
        }));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load PipraPay configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleCopyWebhook = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCurrencyToggle = (code: string) => {
    setConfig((prev) => {
      const current = prev.supportedCurrencies || [];
      if (current.includes(code)) {
        if (current.length === 1) return prev; // Keep at least one
        return { ...prev, supportedCurrencies: current.filter((c) => c !== code) };
      } else {
        return { ...prev, supportedCurrencies: [...current, code] };
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await apiRequest('/admin/settings/piprapay', {
        method: 'PATCH',
        body: JSON.stringify(config),
      });

      const data = res.data || res;
      if (data) {
        setConfig((prev) => ({ ...prev, ...data }));
      }

      setFeedback({
        type: 'success',
        message: 'PipraPay dynamic configuration saved successfully! Active status: ' + (config.enabled ? 'Enabled' : 'Disabled'),
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await apiRequest('/admin/settings/piprapay/test', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      const data = res.data || res;
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
        latencyMs: 0,
      });
    } finally {
      setTesting(false);
    }
  };

  // Clean base URL preview
  const cleanBase = (config.apiUrl || 'https://pay.huipper.com/api').trim().replace(/\/+$/, '');

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin/settings" className="hover:text-foreground flex items-center gap-1 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
              Settings
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Payment Gateways</span>
            <span>/</span>
            <span className="text-emerald-500 font-bold">PipraPay</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Zap className="h-5 w-5 fill-current" />
            </span>
            PipraPay Dynamic Payment Gateway
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dynamic integration for Self-Hosted & Cloud PipraPay instances (Cards, bKash, Nagad, Rocket & Global Wallets)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadConfig}
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing || saving}
            className="rounded-xl border border-border"
          >
            <Activity className={`h-4 w-4 mr-1.5 text-emerald-500 ${testing ? 'animate-pulse' : ''}`} />
            {testing ? 'Testing Endpoint...' : 'Test Connection'}
          </Button>
        </div>
      </div>

      {/* Alert Notifications */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span className="sr-only">Close</span>
            &times;
          </button>
        </div>
      )}

      {/* Test Connection Result Box */}
      {testResult && (
        <div
          className={`p-5 rounded-3xl border animate-in zoom-in-95 duration-200 ${
            testResult.success
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-destructive/5 border-destructive/20'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  {testResult.success ? 'PipraPay Endpoint Connected & Verified' : 'Connection Failed'}
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                      testResult.success
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}
                  >
                    {testResult.latencyMs}ms Latency
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground">{testResult.message}</p>
                {testResult.endpoints && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono text-muted-foreground">
                    <div className="p-2 rounded-xl bg-secondary/40 border border-border">
                      <span className="text-foreground font-bold block">Checkout:</span>
                      <span className="truncate block">{testResult.endpoints.checkout}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-secondary/40 border border-border">
                      <span className="text-foreground font-bold block">Verify:</span>
                      <span className="truncate block">{testResult.endpoints.verify}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-secondary/40 border border-border">
                      <span className="text-foreground font-bold block">Refund:</span>
                      <span className="truncate block">{testResult.endpoints.refund}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTestResult(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid: Settings Form & Information Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Configuration Form */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-6">
          {/* Section 1: Gateway Status & Operational Mode */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-500" />
                  Gateway Status & Operational Mode
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Activate or deactivate PipraPay on customer checkout
                </p>
              </div>

              {/* Status Indicator */}
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider border flex items-center gap-1.5 ${
                  config.enabled
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'
                  }`}
                />
                {config.enabled ? 'Active' : 'Disabled'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Enable Gateway Toggle Card */}
              <div
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  config.enabled
                    ? 'border-emerald-500/50 bg-emerald-500/5 shadow-xs'
                    : 'border-border bg-secondary/30 hover:border-border/80'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-foreground">Enable PipraPay</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Show as payment option at checkout
                  </div>
                </div>
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                    config.enabled ? 'bg-emerald-500' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                      config.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Sandbox vs Live Mode Toggle Card */}
              <div
                onClick={() => setConfig({ ...config, sandboxMode: !config.sandboxMode })}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  config.sandboxMode
                    ? 'border-amber-500/50 bg-amber-500/5 shadow-xs'
                    : 'border-emerald-500/50 bg-emerald-500/5 shadow-xs'
                }`}
              >
                <div>
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    {config.sandboxMode ? 'Sandbox Mode' : 'Live Production Mode'}
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                        config.sandboxMode
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-emerald-500/20 text-emerald-500'
                      }`}
                    >
                      {config.sandboxMode ? 'SANDBOX' : 'LIVE'}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {config.sandboxMode ? 'Test mode with sandbox simulation' : 'Process live customer payments'}
                  </div>
                </div>
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                    config.sandboxMode ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                      config.sandboxMode ? 'translate-x-0' : 'translate-x-5'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic API Connection & Credentials */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-5 shadow-xs">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                Dynamic Server & API Endpoints
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure your Self-Hosted (e.g. pay.huipper.com/api) or Cloud PipraPay API instance
              </p>
            </div>

            <div className="space-y-4">
              {/* Base URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Base API URL (Root Endpoint)</span>
                  <span className="text-[10px] text-emerald-500 font-mono font-bold">
                    e.g. https://pay.huipper.com/api
                  </span>
                </label>
                <div className="relative">
                  <Globe className="h-4 w-4 absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    placeholder="https://pay.huipper.com/api"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden font-mono"
                    required
                  />
                </div>
              </div>

              {/* API Key (MHS-PIPRAPAY-API-KEY) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span>API Key (MHS-PIPRAPAY-API-KEY)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-mono font-bold border border-emerald-500/20">
                      Header Auth
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-emerald-500 hover:text-emerald-600 font-medium"
                  >
                    {showApiKey ? 'Mask Key' : 'Reveal Key'}
                  </button>
                </div>
                <div className="relative">
                  <Key className="h-4 w-4 absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="Enter PipraPay API Key from Merchant Panel..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden font-mono"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Sent securely via <code className="font-mono text-foreground font-bold">MHS-PIPRAPAY-API-KEY</code> and <code className="font-mono text-foreground font-bold">X-API-KEY</code> headers.
                </p>
              </div>

              {/* Optional Webhook Signing Secret */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Webhook Signing Secret (Optional)</label>
                <div className="relative">
                  <ShieldCheck className="h-4 w-4 absolute left-3.5 top-3 text-muted-foreground" />
                  <input
                    type="password"
                    value={config.webhookSecret || ''}
                    onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                    placeholder="Optional HMAC webhook secret (defaults to API key if omitted)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Endpoint Paths Collapsible */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAdvancedEndpoints(!showAdvancedEndpoints)}
                className="flex items-center justify-between w-full py-2 text-xs font-bold text-foreground hover:text-emerald-500 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                  Advanced Endpoint Routing & Custom Paths
                </span>
                {showAdvancedEndpoints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showAdvancedEndpoints && (
                <div className="space-y-3 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Gateway Checkout Path</label>
                      <input
                        type="text"
                        value={config.checkoutEndpoint || '/checkout/redirect'}
                        onChange={(e) => setConfig({ ...config, checkoutEndpoint: e.target.value })}
                        placeholder="/checkout/redirect"
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-mono"
                      />
                      <span className="text-[9px] text-muted-foreground block truncate">
                        Full: {cleanBase}{config.checkoutEndpoint || '/checkout/redirect'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Verify Payment Path</label>
                      <input
                        type="text"
                        value={config.verifyEndpoint || '/verify-payment'}
                        onChange={(e) => setConfig({ ...config, verifyEndpoint: e.target.value })}
                        placeholder="/verify-payment"
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-mono"
                      />
                      <span className="text-[9px] text-muted-foreground block truncate">
                        Full: {cleanBase}{config.verifyEndpoint || '/verify-payment'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">Refund Payment Path</label>
                      <input
                        type="text"
                        value={config.refundEndpoint || '/refund-payment'}
                        onChange={(e) => setConfig({ ...config, refundEndpoint: e.target.value })}
                        placeholder="/refund-payment"
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-xs font-mono"
                      />
                      <span className="text-[9px] text-muted-foreground block truncate">
                        Full: {cleanBase}{config.refundEndpoint || '/refund-payment'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Webhook Configuration Box */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-xs">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Server className="h-4 w-4 text-teal-500" />
                Automated Webhook Callback URL
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste this into your PipraPay Merchant Dashboard Webhook settings
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-2xl bg-secondary/60 border border-border font-mono text-xs text-foreground truncate select-all">
                {webhookUrl || '/api/v1/public/payments/webhook/piprapay'}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyWebhook}
                className="rounded-xl shrink-0 h-10 px-4"
              >
                {copiedWebhook ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy URL
                  </>
                )}
              </Button>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/10 flex items-start gap-2.5 text-[11px] text-muted-foreground">
              <Info className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
              <span>
                When payments are completed, PipraPay automatically pings this endpoint. The LicenseNest engine validates the signature, performs server verification, and immediately fulfills the order and generates license keys.
              </span>
            </div>
          </div>

          {/* Section 4: Supported Currencies & UI Labels */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-5 shadow-xs">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Supported Currencies & Checkout Customization
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select which customer billing currencies route through PipraPay
              </p>
            </div>

            {/* Currency Badges Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Enabled Currencies</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {AVAILABLE_CURRENCIES.map((curr) => {
                  const isSelected = (config.supportedCurrencies || []).includes(curr.code);
                  return (
                    <button
                      type="button"
                      key={curr.code}
                      onClick={() => handleCurrencyToggle(curr.code)}
                      className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500/30'
                          : 'border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{curr.flag}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />}
                      </div>
                      <div className="mt-1">
                        <div className="font-bold text-xs">{curr.code}</div>
                        <div className="text-[9px] text-muted-foreground truncate">{curr.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Titles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Gateway Display Title</label>
                <input
                  type="text"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="PipraPay (Cards & Mobile Wallets)"
                  className="w-full px-3.5 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Checkout Subtitle Description</label>
                <input
                  type="text"
                  value={config.description || ''}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Pay with Card, bKash, Nagad, etc."
                  className="w-full px-3.5 py-2 rounded-xl bg-secondary/50 border border-border text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="rounded-2xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save PipraPay Settings
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Right Column (4 cols): Information & Dynamic API Endpoints Reference */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Endpoint Reference Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-emerald-500/5 border border-border space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Dynamic Endpoints</h4>
                <p className="text-[11px] text-muted-foreground">OpenAPI V3+ Spec Aligned</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-muted-foreground pt-1">
              <div className="p-3 rounded-2xl bg-secondary/50 border border-border space-y-1">
                <div className="font-bold text-[11px] text-foreground flex items-center justify-between">
                  <span>Root API Endpoint</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 rounded">GET/POST</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">{cleanBase}</div>
              </div>

              <div className="p-3 rounded-2xl bg-secondary/50 border border-border space-y-1">
                <div className="font-bold text-[11px] text-foreground flex items-center justify-between">
                  <span>Gateway Checkout</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-blue-500/10 text-blue-500 rounded">POST</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">
                  {cleanBase}{config.checkoutEndpoint || '/checkout/redirect'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-secondary/50 border border-border space-y-1">
                <div className="font-bold text-[11px] text-foreground flex items-center justify-between">
                  <span>Verify Payment</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-purple-500/10 text-purple-500 rounded">POST</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">
                  {cleanBase}{config.verifyEndpoint || '/verify-payment'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-secondary/50 border border-border space-y-1">
                <div className="font-bold text-[11px] text-foreground flex items-center justify-between">
                  <span>Refund Payment</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-amber-500/10 text-amber-500 rounded">POST</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">
                  {cleanBase}{config.refundEndpoint || '/refund-payment'}
                </div>
              </div>
            </div>
          </div>

          {/* Supported Methods Card */}
          <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-xs">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Supported Payment Rails
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                <span>Visa / MC</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border flex items-center gap-2">
                <Wallet className="h-4 w-4 text-pink-500" />
                <span>bKash (MFS)</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-500" />
                <span>Nagad (MFS)</span>
              </div>
              <div className="p-3 rounded-2xl bg-secondary/40 border border-border flex items-center gap-2">
                <Building className="h-4 w-4 text-indigo-500" />
                <span>Rocket / DBBL</span>
              </div>
            </div>
          </div>

          {/* Official Documentation Link */}
          <div className="p-5 rounded-3xl bg-secondary/30 border border-border text-xs space-y-2">
            <div className="font-bold text-foreground">PipraPay Documentation</div>
            <p className="text-muted-foreground text-[11px]">
              Learn more about payment charges, redirect checkout, and webhook verification on the official developer hub.
            </p>
            <a
              href="https://docs.piprapay.com/reference/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-500 hover:text-emerald-600 font-semibold pt-1"
            >
              Open PipraPay Developer Docs
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
