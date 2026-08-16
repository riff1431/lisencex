'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Code2, Key, Shield, Copy, Check, RefreshCw, Eye, EyeOff,
  Globe, Lock, AlertTriangle, Sparkles, ExternalLink, Terminal,
  BookOpen, ChevronRight, Package, Layers, FileCode2, Server,
  CheckCircle2, XCircle, Play, ArrowRight, Download, HelpCircle,
  Cpu, Zap, ShieldCheck, Flame, Laptop, HardDrive, Wand2, Award,
  FlaskConical, Rocket, RotateCcw, Trash2
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
  const [outdatedCount, setOutdatedCount] = useState<number>(0);

  // Template active tab
  const [activeTemplateTab, setActiveTemplateTab] = useState<'wordpressPlugin' | 'wordpressTheme' | 'phpScript' | 'nextjsApp' | 'nextjsPlugin'>('wordpressPlugin');
  const [templateSubView, setTemplateSubView] = useState<'setup' | 'methods' | 'ui'>('setup');

  // UI Builder customizer parameters
  const [uiTitle, setUiTitle] = useState('Activate License');
  const [uiDesc, setUiDesc] = useState('Please enter your license key or Envato purchase code to activate this product.');
  const [uiColor, setUiColor] = useState('#6366f1');
  const [uiPlaceholder, setUiPlaceholder] = useState('LIC-XXXX-XXXX-XXXX-XXXX');
  const [uiLayout, setUiLayout] = useState<'card' | 'minimal' | 'inline'>('card');
  const [uiAllowEnvato, setUiAllowEnvato] = useState(true);
  const [uiAllowDeactivate, setUiAllowDeactivate] = useState(true);

  // Status simulator selection
  const [simStatus, setSimStatus] = useState<'inactive' | 'active' | 'expired' | 'suspended' | 'revoked' | 'limit_reached' | 'loading' | 'error' | 'success'>('inactive');
  const [simErrorMsg, setSimErrorMsg] = useState('Invalid activation key signature.');

  // Test scenario runner state
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [scenarioResult, setScenarioResult] = useState<TestScenarioResult | null>(null);

  // Key masking
  const [showApiKey, setShowApiKey] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Environment Mode: Sandbox vs Production
  const [environmentMode, setEnvironmentMode] = useState<'sandbox' | 'production'>('sandbox');
  const [sandboxData, setSandboxData] = useState<any | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [resettingSandbox, setResettingSandbox] = useState(false);

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
        loadSandboxData(items[0]._id);
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

      // Fetch number of outdated activations
      const actRes = await apiRequest(`/admin/activations?productId=${productId}&healthStatus=Outdated&limit=1`);
      setOutdatedCount(actRes.data?.pagination?.total || 0);
    } catch (e) {
      console.error('Failed to load integration data', e);
      setOutdatedCount(0);
    } finally {
      setDataLoading(false);
    }
  };

  const loadSandboxData = async (productId: string) => {
    setSandboxLoading(true);
    try {
      const res = await apiRequest(`/admin/products/${productId}/sandbox`);
      setSandboxData(res.data || res);
    } catch (e) {
      console.error('Failed to load sandbox data', e);
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    loadIntegration(productId);
    loadSandboxData(productId);
  };

  const handleResetSandbox = async () => {
    if (!selectedProductId) return;
    if (!confirm('Are you sure you want to reset all sandbox test activations and data for this product?')) {
      return;
    }
    setResettingSandbox(true);
    try {
      await apiRequest(`/admin/products/${selectedProductId}/sandbox/reset`, {
        method: 'POST',
      });
      await loadSandboxData(selectedProductId);
    } catch (e: any) {
      alert(e.message || 'Failed to reset sandbox data');
    } finally {
      setResettingSandbox(false);
    }
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

  const getWpPluginCode = () => {
    const apiBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api` : 'https://api.licensenest.com/api';
    const clientId = integrationData?.publicClientId || 'your_client_id';
    return `<?php
/**
 * License Activation Page for WordPress Plugin
 * Custom Generated for: ${integrationData?.productName || 'Your Product'}
 */

if (!defined('ABSPATH')) {
    exit;
}

class LicenseNest_Plugin_License_Page {
    private $api_url = '${apiBaseUrl}';
    private $client_id = '${clientId}';
    
    public function __construct() {
        add_action('admin_menu', array($this, 'add_menu_page'));
    }

    public function add_menu_page() {
        add_submenu_page(
            'options-general.php',
            '${uiTitle}',
            '${uiTitle}',
            'manage_options',
            'licensenest-activation',
            array($this, 'render_activation_page')
        );
    }

    public function render_activation_page() {
        if (!current_user_can('manage_options')) {
            wp_die('Unauthorized');
        }

        $message = '';
        $error = '';
        
        if (isset($_POST['licensenest_action'])) {
            check_admin_referer('licensenest_license_nonce');
            $action = sanitize_text_field($_POST['licensenest_action']);
            
            if ($action === 'activate') {
                $key = sanitize_text_field($_POST['license_key']);
                if (empty($key)) {
                    $error = 'License key cannot be empty.';
                } else {
                    $result = $this->call_api('activate', array('licenseKey' => $key));
                    if (is_wp_error($result)) {
                        $error = $result->get_error_message();
                    } else {
                        update_option('licensenest_license_key', $key);
                        update_option('licensenest_license_status', 'active');
                        update_option('licensenest_license_meta', $result);
                        $message = 'Product successfully activated!';
                    }
                }
            } elseif ($action === 'deactivate') {
                $result = $this->call_api('deactivate');
                if (is_wp_error($result)) {
                    $error = $result->get_error_message();
                } else {
                    delete_option('licensenest_license_key');
                    delete_option('licensenest_license_status');
                    delete_option('licensenest_license_meta');
                    $message = 'Product successfully deactivated.';
                }
            }
        }

        $status = get_option('licensenest_license_status', 'inactive');
        $key = get_option('licensenest_license_key', '');
        $meta = get_option('licensenest_license_meta', array());
        ?>
        <div class="wrap">
            <div style="max-width: 600px; margin: 40px auto; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background: #fff; border: 1px solid #ccd0d4; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 30px;">
                <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #1d2327;">${uiTitle}</h2>
                <p style="color: #646970; font-size: 13px; margin-bottom: 20px;">${uiDesc}</p>

                <?php if ($message): ?>
                    <div style="background: #edfaf1; border-left: 4px solid #10b981; color: #065f46; padding: 12px; font-size: 13px; border-radius: 6px; margin-bottom: 20px;">
                        <strong>Success:</strong> <?php echo esc_html($message); ?>
                    </div>
                <?php endif; ?>

                <?php if ($error): ?>
                    <div style="background: #fef2f2; border-left: 4px solid #ef4444; color: #991b1b; padding: 12px; font-size: 13px; border-radius: 6px; margin-bottom: 20px;">
                        <strong>Error:</strong> <?php echo esc_html($error); ?>
                    </div>
                <?php endif; ?>

                <form method="POST" action="">
                    <?php wp_nonce_field('licensenest_license_nonce'); ?>
                    
                    <?php if ($status === 'active'): ?>
                        <div style="padding: 15px; background: #f0f6fc; border-radius: 8px; border: 1px solid #d0d7de; margin-bottom: 20px;">
                            <div style="font-size: 11px; font-weight: bold; color: #57606a; text-transform: uppercase;">Status</div>
                            <div style="font-size: 14px; font-weight: bold; color: #0969da; margin-top: 2px;">✓ Active (Activated)</div>
                            
                            <div style="font-size: 11px; font-weight: bold; color: #57606a; text-transform: uppercase; margin-top: 12px;">License Key</div>
                            <div style="font-size: 12px; font-family: monospace; color: #24292f; margin-top: 2px;"><?php echo esc_html($key); ?></div>
                            
                            <?php if (isset($meta['domain'])): ?>
                                <div style="font-size: 11px; font-weight: bold; color: #57606a; text-transform: uppercase; margin-top: 12px;">Domain</div>
                                <div style="font-size: 12px; color: #24292f; margin-top: 2px;"><?php echo esc_html($meta['domain']); ?></div>
                            <?php endif; ?>
                        </div>
                        <?php if (${uiAllowDeactivate ? 'true' : 'false'}): ?>
                            <input type="hidden" name="licensenest_action" value="deactivate" />
                            <button type="submit" style="background: #ef4444; color: #fff; border: 0; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">Deactivate</button>
                        <?php endif; ?>
                    <?php else: ?>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #1d2327;">License Key ${uiAllowEnvato ? 'or Envato Purchase Code' : ''}</label>
                            <input type="text" name="license_key" placeholder="${uiPlaceholder}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #8c8f94; font-size: 13px;" />
                        </div>
                        <input type="hidden" name="licensenest_action" value="activate" />
                        <button type="submit" style="background: ${uiColor}; color: #fff; border: 0; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">Activate Product</button>
                    <?php endif; ?>
                </form>
            </div>
        </div>
        <?php
    }

    private function call_api($action, $args = array()) {
        $url = $this->api_url . '/' . $action;
        $domain = parse_url(get_site_url(), PHP_URL_HOST);
        
        $body = array_merge(array(
            'clientId' => $this->client_id,
            'domain' => $domain,
            'installationId' => get_option('licensenest_installation_id', wp_generate_uuid4()),
        ), $args);

        if (!get_option('licensenest_installation_id')) {
            update_option('licensenest_installation_id', $body['installationId']);
        }

        $response = wp_remote_post($url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-Client-ID' => $this->client_id,
            ),
            'body' => wp_json_encode($body),
            'timeout' => 15,
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        $res_body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code !== 200 && $code !== 201) {
            return new WP_Error('api_error', isset($res_body['message']) ? $res_body['message'] : 'API verification failed');
        }

        return $res_body;
    }
}
new LicenseNest_Plugin_License_Page();`;
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

                {/* Environment Mode Toggle: Sandbox vs Production */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Environment:</span>
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-background border border-border">
                      <button
                        type="button"
                        onClick={() => setEnvironmentMode('sandbox')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          environmentMode === 'sandbox'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                        🧪 Sandbox (Testing)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnvironmentMode('production')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          environmentMode === 'production'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        🚀 Production (Live)
                      </button>
                    </div>
                  </div>

                  {environmentMode === 'sandbox' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetSandbox}
                      disabled={resettingSandbox}
                      className="gap-1.5 text-xs font-semibold text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${resettingSandbox ? 'animate-spin' : ''}`} />
                      Reset Sandbox Data
                    </Button>
                  )}
                </div>

                {/* Sandbox Warning Banner */}
                {environmentMode === 'sandbox' && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2.5">
                    <FlaskConical className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>SANDBOX ENVIRONMENT:</strong> Test credentials (<code className="font-mono">{sandboxData?.credentials?.clientId || 'client_test_...'}</code>) are completely isolated. Test activations never affect real customer license counts or production analytics.
                    </span>
                  </div>
                )}

                {/* Outdated SDK Integrations Warning Banner */}
                {outdatedCount > 0 && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 shadow-sm animate-pulse">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>
                      <strong>UPGRADE WARNING:</strong> Detected <strong>{outdatedCount}</strong> active installation(s) running an outdated version of the LicenseNest SDK integration. Please upgrade your integration SDK files to the latest stable version (v1.0.0) in client deployments.
                    </span>
                  </div>
                )}

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

              {/* Sandbox Scenario Keys Table (Visible in Sandbox Mode) */}
              {environmentMode === 'sandbox' && sandboxData?.scenarios && (
                <div className="p-5 rounded-3xl border border-amber-500/30 bg-amber-500/5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                        Pre-Configured Sandbox Scenario Keys
                      </h3>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Click copy to test edge-cases in your app</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sandboxData.scenarios.map((sc: any) => (
                      <div key={sc.key} className="p-3.5 rounded-2xl border border-border bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-foreground truncate">{sc.title}</span>
                          <CopyButton text={sc.key} />
                        </div>
                        <code className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 block truncate bg-secondary/40 p-1.5 rounded-lg border border-border">
                          {sc.key}
                        </code>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{sc.description}</p>
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/60">
                          <span className="uppercase font-bold">{sc.status}</span>
                          <span>{sc.currentActivationCount}/{sc.activationLimit} used</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready-to-Use Integration Parameters Grid */}
              <div className="p-5 rounded-3xl border border-border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className={`h-4 w-4 ${environmentMode === 'sandbox' ? 'text-amber-500' : 'text-indigo-500'}`} />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                      {environmentMode === 'sandbox' ? 'Sandbox API Parameters' : 'Production API Parameters'}
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {environmentMode === 'sandbox' ? 'Isolated Test Credentials' : 'Live Production Credentials'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Public Client ID */}
                  <div className="p-3 rounded-2xl border border-border bg-secondary/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {environmentMode === 'sandbox' ? 'Sandbox Client ID' : 'Public Client ID'}
                      </span>
                      <CopyButton text={environmentMode === 'sandbox' ? (sandboxData?.credentials?.clientId || integrationData.publicClientId) : integrationData.publicClientId} />
                    </div>
                    <code className={`text-xs font-mono font-bold block truncate ${environmentMode === 'sandbox' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                      {environmentMode === 'sandbox' ? (sandboxData?.credentials?.clientId || integrationData.publicClientId) : integrationData.publicClientId}
                    </code>
                  </div>

                  {/* API Key */}
                  <div className="p-3 rounded-2xl border border-border bg-secondary/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {environmentMode === 'sandbox' ? 'Sandbox API Key' : 'Client API Key'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded"
                        >
                          {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <CopyButton text={environmentMode === 'sandbox' ? (sandboxData?.credentials?.apiKey || integrationData.apiKey) : integrationData.apiKey} />
                      </div>
                    </div>
                    <code className={`text-xs font-mono font-bold block truncate ${environmentMode === 'sandbox' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                      {showApiKey
                        ? (environmentMode === 'sandbox' ? (sandboxData?.credentials?.apiKey || integrationData.apiKey) : integrationData.apiKey)
                        : (environmentMode === 'sandbox' ? (sandboxData?.credentials?.apiKey || integrationData.apiKey).slice(0, 12) + '•'.repeat(24) : integrationData.apiKey.slice(0, 12) + '•'.repeat(24))}
                    </code>
                  </div>

                  {/* Public Verification Key */}
                  <div className="p-3 rounded-2xl border border-border bg-secondary/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Public Verification Key</span>
                      <CopyButton text={environmentMode === 'sandbox' ? (sandboxData?.credentials?.publicVerificationKey || integrationData.publicVerificationKey) : integrationData.publicVerificationKey} />
                    </div>
                    <code className="text-xs font-mono font-bold text-foreground block truncate">
                      {environmentMode === 'sandbox' ? (sandboxData?.credentials?.publicVerificationKey || integrationData.publicVerificationKey) : integrationData.publicVerificationKey}
                    </code>
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
                    <div className="space-y-6">
                      {/* Interactive Visual Builder Grid */}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Column 1: Live Brand Customizer */}
                        <div className="p-5 rounded-2xl border border-border bg-secondary/15 space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            1. Customize Branding & Labels
                          </h4>
                          
                          <div className="space-y-3 text-xs font-medium">
                            {/* Title */}
                            <div>
                              <label className="block mb-1 text-[10px] uppercase font-bold text-muted-foreground">Component Title</label>
                              <input
                                type="text"
                                value={uiTitle}
                                onChange={(e) => setUiTitle(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-semibold"
                              />
                            </div>

                            {/* Description */}
                            <div>
                              <label className="block mb-1 text-[10px] uppercase font-bold text-muted-foreground">Description / Guide</label>
                              <textarea
                                rows={2}
                                value={uiDesc}
                                onChange={(e) => setUiDesc(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-semibold"
                              />
                            </div>

                            {/* Color Selector */}
                            <div>
                              <label className="block mb-1 text-[10px] uppercase font-bold text-muted-foreground">Primary Brand Color</label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="color"
                                  value={uiColor}
                                  onChange={(e) => setUiColor(e.target.value)}
                                  className="w-10 h-8 rounded border border-border cursor-pointer bg-transparent"
                                />
                                <input
                                  type="text"
                                  value={uiColor}
                                  onChange={(e) => setUiColor(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-mono font-bold uppercase"
                                />
                              </div>
                            </div>

                            {/* Placeholder */}
                            <div>
                              <label className="block mb-1 text-[10px] uppercase font-bold text-muted-foreground">Input Placeholder</label>
                              <input
                                type="text"
                                value={uiPlaceholder}
                                onChange={(e) => setUiPlaceholder(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-mono font-semibold"
                              />
                            </div>

                            {/* Layout Mode */}
                            <div>
                              <label className="block mb-1 text-[10px] uppercase font-bold text-muted-foreground">Layout Style</label>
                              <select
                                value={uiLayout}
                                onChange={(e) => setUiLayout(e.target.value as any)}
                                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background font-semibold"
                              >
                                <option value="card">Standard Card Component</option>
                                <option value="inline">Inline Horizontal Form</option>
                                <option value="minimal">Minimal / Compact Form</option>
                              </select>
                            </div>

                            {/* Toggles */}
                            <div className="space-y-2 pt-2 border-t border-border/60">
                              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                                <input
                                  type="checkbox"
                                  checked={uiAllowEnvato}
                                  onChange={(e) => setUiAllowEnvato(e.target.checked)}
                                  className="rounded border-border bg-background"
                                />
                                Allow Envato Purchase Code
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                                <input
                                  type="checkbox"
                                  checked={uiAllowDeactivate}
                                  onChange={(e) => setUiAllowDeactivate(e.target.checked)}
                                  className="rounded border-border bg-background"
                                />
                                Allow self-deactivation
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Live Preview & State Simulator */}
                        <div className="p-5 rounded-2xl border border-border bg-card space-y-4 xl:col-span-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Laptop className="h-3.5 w-3.5 text-primary" />
                              2. Live Component Sandbox & State Simulator
                            </h4>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Interactive Preview
                            </div>
                          </div>

                          {/* State Toggles Simulator */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Simulate Activation State:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { id: 'inactive', label: 'Not Activated' },
                                { id: 'active', label: 'Active' },
                                { id: 'expired', label: 'Expired' },
                                { id: 'suspended', label: 'Suspended' },
                                { id: 'revoked', label: 'Revoked' },
                                { id: 'limit_reached', label: 'Limit Reached' },
                                { id: 'loading', label: 'API Loading' },
                                { id: 'error', label: 'API Error' },
                                { id: 'success', label: 'Success Alert' },
                              ].map((state) => (
                                <button
                                  key={state.id}
                                  type="button"
                                  onClick={() => setSimStatus(state.id as any)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    simStatus === state.id
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  {state.label}
                                </button>
                              ))}
                            </div>
                            
                            {simStatus === 'error' && (
                              <div className="pt-2">
                                <label className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">Simulated Error Msg</label>
                                <input
                                  type="text"
                                  value={simErrorMsg}
                                  onChange={(e) => setSimErrorMsg(e.target.value)}
                                  className="w-full px-2.5 py-1 rounded-lg border border-border bg-background text-[11px] font-semibold"
                                />
                              </div>
                            )}
                          </div>

                          {/* MOCKED WIDGET PREVIEW BOX */}
                          <div className="p-8 rounded-2xl bg-secondary/10 border border-border/80 flex items-center justify-center min-h-[220px]">
                            {/* Card Layout */}
                            {uiLayout === 'card' && (
                              <div className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-md p-5 space-y-4 font-sans text-left relative overflow-hidden">
                                {simStatus === 'loading' && (
                                  <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-10 flex-col gap-2">
                                    <RefreshCw className="h-6 w-6 animate-spin text-primary" style={{ color: uiColor }} />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase">Verifying License...</span>
                                  </div>
                                )}

                                <div>
                                  <h5 className="font-black text-sm text-foreground">{uiTitle}</h5>
                                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{uiDesc}</p>
                                </div>

                                {/* Banner notifications based on Simulated status */}
                                {simStatus === 'expired' && (
                                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>License Expired: Please renew to continue updates.</span>
                                  </div>
                                )}

                                {simStatus === 'suspended' && (
                                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>License Suspended: Abuse or multiple domains detected.</span>
                                  </div>
                                )}

                                {simStatus === 'revoked' && (
                                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>License Blocked / Revoked by admin.</span>
                                  </div>
                                )}

                                {simStatus === 'limit_reached' && (
                                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span>Activation Limit Reached: Active on 3/3 domains.</span>
                                  </div>
                                )}

                                {simStatus === 'error' && (
                                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                                    <XCircle className="h-4 w-4 shrink-0" />
                                    <span>{simErrorMsg}</span>
                                  </div>
                                )}

                                {simStatus === 'success' && (
                                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    <span>License successfully verified and activated!</span>
                                  </div>
                                )}

                                {/* Form fields */}
                                {simStatus === 'active' || simStatus === 'success' ? (
                                  <div className="space-y-3">
                                    <div className="p-3.5 rounded-xl border border-border bg-secondary/20 text-[11px] font-semibold space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground uppercase font-bold text-[9px]">Status</span>
                                        <span className="text-emerald-500 font-bold">✓ Activated</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground uppercase font-bold text-[9px]">Activated on</span>
                                        <span className="font-mono text-foreground">yourdomain.com</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground uppercase font-bold text-[9px]">Slots Used</span>
                                        <span className="text-foreground">1 / 3 domains</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground uppercase font-bold text-[9px]">Support Entitlement</span>
                                        <span className="text-emerald-500">Active</span>
                                      </div>
                                    </div>
                                    {uiAllowDeactivate && (
                                      <button
                                        type="button"
                                        className="w-full py-1.5 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors text-xs"
                                      >
                                        Deactivate Product
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block mb-1 text-[9px] uppercase font-bold text-muted-foreground">License Key {uiAllowEnvato ? 'or Purchase Code' : ''}</label>
                                      <input
                                        type="text"
                                        placeholder={uiPlaceholder}
                                        disabled={simStatus === 'loading'}
                                        className="w-full px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-mono font-semibold"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className="w-full py-2 rounded-xl font-bold text-white transition-all text-xs"
                                      style={{ backgroundColor: uiColor }}
                                    >
                                      Activate Product
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Inline Layout */}
                            {uiLayout === 'inline' && (
                              <div className="w-full bg-background border border-border rounded-xl shadow-xs p-4 flex flex-col sm:flex-row items-center gap-3 font-sans text-left relative overflow-hidden">
                                {simStatus === 'loading' && (
                                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 gap-1.5">
                                    <RefreshCw className="h-4 w-4 animate-spin text-primary" style={{ color: uiColor }} />
                                    <span className="text-[10px] font-bold text-muted-foreground">Connecting...</span>
                                  </div>
                                )}

                                <div className="shrink-0">
                                  <h5 className="font-bold text-xs text-foreground">{uiTitle}</h5>
                                </div>

                                {simStatus === 'active' || simStatus === 'success' ? (
                                  <div className="flex-1 flex items-center justify-between w-full gap-2">
                                    <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Activated (1/3 slots)
                                    </span>
                                    {uiAllowDeactivate && (
                                      <button type="button" className="px-3 py-1 rounded-lg text-[10px] font-bold bg-rose-500 hover:bg-rose-600 text-white">
                                        Deactivate
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                                    <input
                                      type="text"
                                      placeholder={uiPlaceholder}
                                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-mono"
                                    />
                                    <button
                                      type="button"
                                      className="px-4 py-1.5 rounded-lg font-bold text-white text-xs shrink-0"
                                      style={{ backgroundColor: uiColor }}
                                    >
                                      Activate
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Minimal Layout */}
                            {uiLayout === 'minimal' && (
                              <div className="w-full max-w-xs bg-background border border-border rounded-xl p-4 space-y-3 font-sans text-left relative overflow-hidden">
                                {simStatus === 'loading' && (
                                  <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-10">
                                    <RefreshCw className="h-5 w-5 animate-spin" style={{ color: uiColor }} />
                                  </div>
                                )}

                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-xs text-foreground">{uiTitle}</span>
                                  {simStatus === 'active' || simStatus === 'success' ? (
                                    <span className="text-[10px] font-black text-emerald-500">ACTIVE</span>
                                  ) : (
                                    <span className="text-[10px] font-black text-rose-500">LOCKED</span>
                                  )}
                                </div>

                                {simStatus === 'active' || simStatus === 'success' ? (
                                  <div className="space-y-2">
                                    <code className="text-[10px] block truncate font-mono bg-secondary/50 p-1 rounded border">LIC-ACTIVE-XXX-XXX</code>
                                    {uiAllowDeactivate && (
                                      <button type="button" className="w-full py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-bold">
                                        Deactivate License
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      placeholder={uiPlaceholder}
                                      className="flex-1 px-2 py-1 text-[11px] font-mono border rounded"
                                    />
                                    <button
                                      type="button"
                                      className="px-3 py-1 rounded text-white text-[11px] font-bold"
                                      style={{ backgroundColor: uiColor }}
                                    >
                                      Go
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Code Export Tabs */}
                      <div className="space-y-4 pt-4 border-t border-border/80">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            3. Export Customized Component & Proxy API Codes
                          </h4>
                          <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            Plug & Play Code Generator
                          </span>
                        </div>

                        {/* Custom sub-view code selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Panel code: Client side component or WordPress file */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border pb-1">
                              <span>
                                {activeTemplateTab.startsWith('wordpress')
                                  ? 'WordPress Core Page (Admin Interface)'
                                  : activeTemplateTab === 'nextjsApp'
                                  ? 'Client React Component (LicenseActivation.tsx)'
                                  : 'PHP / HTML Front Form'}
                              </span>
                              <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded uppercase">
                                {activeTemplateTab.startsWith('wordpress') || activeTemplateTab === 'phpScript' ? 'php' : 'tsx'}
                              </span>
                            </div>

                            {activeTemplateTab === 'wordpressPlugin' && (
                              <CodeBlock
                                title="class-licensenest-page.php"
                                lang="php"
                                code={getWpPluginCode()}
                              />
                            )}

                            {activeTemplateTab === 'wordpressTheme' && (
                              <CodeBlock
                                title="theme-license-customizer.php"
                                lang="php"
                                code={`<?php
/**
 * License Activation integration for WordPress Theme Customizer Options
 * Custom Generated for: ${integrationData?.productName || 'Your Theme'}
 */

if (!defined('ABSPATH')) {
    exit;
}

class LicenseNest_Theme_License_Manager {
    private $api_url = '${typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://api.licensenest.com/api'}';
    private $client_id = '${integrationData?.publicClientId || 'your_client_id'}';

    public function __construct() {
        add_action('customize_register', array($this, 'register_license_settings'));
    }

    public function register_license_settings($wp_customize) {
        $wp_customize->add_section('licensenest_theme_license_section', array(
            'title' => __('${uiTitle}', 'licensenest'),
            'priority' => 30,
            'description' => __('${uiDesc}', 'licensenest'),
        ));

        $wp_customize->add_setting('theme_license_key', array(
            'default' => '',
            'type' => 'option',
            'sanitize_callback' => 'sanitize_text_field',
        ));

        $wp_customize->add_control('theme_license_key_control', array(
            'label' => __('License Key ${uiAllowEnvato ? 'or Envato Purchase Code' : ''}', 'licensenest'),
            'section' => 'licensenest_theme_license_section',
            'settings' => 'theme_license_key',
            'type' => 'text',
            'input_attrs' => array(
                'placeholder' => '${uiPlaceholder}',
                'style' => 'border-color: ${uiColor}; border-radius: 6px;',
            )
        ));
    }
}`}
                              />
                            )}

                            {activeTemplateTab === 'phpScript' && (
                              <CodeBlock
                                title="license_activation.php"
                                lang="php"
                                code={`<?php
/**
 * Standalone PHP / HTML script License form
 * Securely communicates with LicenseNest API using Curl
 */

$api_url = '${typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://api.licensenest.com/api'}';
$client_id = '${integrationData?.publicClientId || 'your_client_id'}';
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'activate';
    $license_key = $_POST['license_key'] ?? '';
    
    if ($action === 'activate' && empty($license_key)) {
        $error = 'License key is required.';
    } else {
        $ch = curl_init($api_url . '/' . $action);
        $payload = json_encode(array(
            'clientId' => $client_id,
            'licenseKey' => $license_key,
            'domain' => $_SERVER['SERVER_NAME'],
            'installationId' => md5($_SERVER['SERVER_NAME'])
        ));
        
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/json',
            'X-Client-ID: ' . $client_id
        ));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        
        $res = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($res, true);
        if ($http_code === 200 || $http_code === 201) {
            $message = $action === 'activate' ? 'Product activated successfully!' : 'Product deactivated.';
        } else {
            $error = $data['message'] ?? 'API connection failed.';
        }
    }
}
?>
<!-- Customized HTML Form Card -->
<div style="max-width: 480px; padding: 24px; border: 1px solid #ddd; border-radius: 12px; font-family: Arial;">
    <h3>\${uiTitle}</h3>
    <p>\${uiDesc}</p>
    <form method="POST">
        <input type="text" name="license_key" placeholder="\${uiPlaceholder}" required style="width:100%; padding: 8px; border-radius:6px; border:1px solid #ccc; margin-bottom:12px;">
        <button type="submit" style="background:\${uiColor}; color:#fff; border:0; padding:10px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">Activate</button>
    </form>
</div>`}
                              />
                            )}

                            {(activeTemplateTab === 'nextjsApp' || activeTemplateTab === 'nextjsPlugin') && (
                              <CodeBlock
                                title="LicenseActivation.tsx"
                                lang="tsx"
                                code={`'use client';

import React, { useState, useEffect } from 'react';

export default function LicenseActivation() {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/license?action=status');
      const data = await res.json();
      if (data.status) setStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAction = async (action: 'activate' | 'deactivate') => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, licenseKey: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');
      setMessage(action === 'activate' ? 'Product successfully activated!' : 'Product deactivated.');
      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isActive = status?.status === 'active';

  return (
    <div style={{
      maxWidth: '480px',
      background: 'var(--card, #fff)',
      border: '1px solid var(--border, #e5e7eb)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      fontFamily: 'sans-serif'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' }}>${uiTitle}</h3>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 20px 0' }}>${uiDesc}</p>

      {message && <div style={{ padding: '10px', background: '#ecfdf5', color: '#065f46', fontSize: '12px', borderRadius: '8px', marginBottom: '12px' }}>{message}</div>}
      {error && <div style={{ padding: '10px', background: '#fef2f2', color: '#991b1b', fontSize: '12px', borderRadius: '8px', marginBottom: '12px' }}>{error}</div>}

      {isActive ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase' }}>✓ License Activated</span>
          </div>
          ${uiAllowDeactivate ? `<button onClick={() => handleAction('deactivate')} disabled={loading} style={{ background: '#ef4444', color: '#fff', border: 0, padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Deactivate</button>` : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="${uiPlaceholder}"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px' }}
          />
          <button
            onClick={() => handleAction('activate')}
            disabled={loading}
            style={{ background: '${uiColor}', color: '#fff', border: 0, padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Activating...' : 'Activate License'}
          </button>
        </div>
      )}
    </div>
  );
}`}
                              />
                            )}
                          </div>

                          {/* Right Panel code: Proxy Router endpoints (critical for Next.js security) */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-b border-border pb-1">
                              <span>
                                {activeTemplateTab.startsWith('wordpress')
                                  ? 'WordPress Helper Functions (Heartbeat Validator)'
                                  : activeTemplateTab === 'nextjsApp'
                                  ? 'Secure Backend API Proxy (app/api/license/route.ts)'
                                  : 'PHP API Handler File'}
                              </span>
                              <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 rounded uppercase font-bold text-amber-500">
                                SECURE
                              </span>
                            </div>

                            {activeTemplateTab.startsWith('wordpress') && (
                              <CodeBlock
                                title="wp-cron-heartbeat.php"
                                lang="php"
                                code={`<?php
/**
 * Daily Cron heart-beat verification checker
 * Prevents client-side bypass checks in options values
 */

if (!wp_next_scheduled('licensenest_daily_heartbeat')) {
    wp_schedule_event(time(), 'daily', 'licensenest_daily_heartbeat');
}

add_action('licensenest_daily_heartbeat', 'licensenest_run_license_validation');

function licensenest_run_license_validation() {
    $key = get_option('licensenest_license_key');
    if (empty($key)) {
        return;
    }

    $api_url = '${typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://api.licensenest.com/api'}/validate';
    $client_id = '${integrationData?.publicClientId || 'your_client_id'}';
    $domain = parse_url(get_site_url(), PHP_URL_HOST);
    $installation_id = get_option('licensenest_installation_id');

    $response = wp_remote_post($api_url, array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-Client-ID' => $client_id,
        ),
        'body' => wp_json_encode(array(
            'clientId' => $client_id,
            'licenseKey' => $key,
            'domain' => $domain,
            'installationId' => $installation_id
        )),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        return; // Temporarily offline, skip check
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        // Validation failed, suspend license status locally
        update_option('licensenest_license_status', 'suspended');
    }
}`}
                              />
                            )}

                            {activeTemplateTab === 'phpScript' && (
                              <CodeBlock
                                title="license_heartbeat.php"
                                lang="php"
                                code={`<?php
/**
 * Background Validation cron check for standalone PHP scripts
 */
function licensenest_validate_background() {
    $license_key = get_saved_license(); // Retrieve from config/DB
    if (!$license_key) return;

    $api_url = '${typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://api.licensenest.com/api'}/validate';
    $client_id = '${integrationData?.publicClientId || 'your_client_id'}';
    
    $ch = curl_init($api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json',
        'X-Client-ID: ' . $client_id
    ));
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(array(
        'clientId' => $client_id,
        'licenseKey' => $license_key,
        'domain' => $_SERVER['SERVER_NAME'],
        'installationId' => md5($_SERVER['SERVER_NAME'])
    )));
    
    $res = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code !== 200) {
        lock_script_execution(); // Set local lock flag
    }
}`}
                              />
                            )}

                            {(activeTemplateTab === 'nextjsApp' || activeTemplateTab === 'nextjsPlugin') && (
                              <CodeBlock
                                title="app/api/license/route.ts"
                                lang="typescript"
                                code={`import { NextResponse } from 'next/server';

const LICENSE_SERVER = '${typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://api.licensenest.com/api'}';
const CLIENT_ID = '${integrationData?.publicClientId || 'your_client_id'}';
const API_KEY = process.env.LICENSE_API_KEY || ''; // SECURE: Loaded on Server environment only

export async function GET(req: Request) {
  // Add server-side check of local database license status
  return NextResponse.json({ status: 'inactive' });
}

export async function POST(req: Request) {
  try {
    const { action, licenseKey } = await req.json();
    const domain = req.headers.get('host') || 'localhost';
    
    // Call LicenseNest API from secure server proxy
    const response = await fetch(\`\${LICENSE_SERVER}/\${action === 'deactivate' ? 'deactivate' : 'activate'}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': CLIENT_ID,
        'X-API-Key': API_KEY, // Secret token remains invisible to browsers
      },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        licenseKey,
        domain,
        installationId: 'nextjs_app_' + domain.replace(/\\./g, '_'),
      }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ message: data.message || 'Verification failed' }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}`}
                              />
                            )}
                          </div>
                        </div>

                        {/* Integration Quick Documentation box */}
                        <div className="p-4 rounded-xl border border-border bg-secondary/30 text-xs text-muted-foreground flex items-start gap-2.5">
                          <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-foreground block mb-0.5">Quick Integration Documentation:</span>
                            {activeTemplateTab === 'wordpressPlugin' && (
                              <span>Place the generated class file inside your plugin directory. Load it using `require_once` in your main plugin file. It will automatically add a secure "License Activation" submenu under options page. Make sure to define the API endpoint securely on your WordPress install!</span>
                            )}
                            {activeTemplateTab === 'wordpressTheme' && (
                              <span>Paste the customizer code snippet inside your theme`s `functions.php` file. This adds a custom activation text input to the standard WordPress Customizer control board which automatically disables/saves theme options values based on validation checks.</span>
                            )}
                            {activeTemplateTab === 'phpScript' && (
                              <span>Include this card layout on your settings/dashboard panel. Secure your script by calling the `validate()` curl helper check at the beginning of critical execution flows to block unlicensed server usage.</span>
                            )}
                            {activeTemplateTab === 'nextjsApp' && (
                              <span>Place `LicenseActivation.tsx` in your component path and render it in your settings dashboard. Configure `LICENSE_API_KEY` inside your server environment variables (`.env.local`) to securely proxy requests without exposing secrets.</span>
                            )}
                            {activeTemplateTab === 'nextjsPlugin' && (
                              <span>Import this component library inside your template library. It binds with customized theme modules, querying license headers dynamically from server router contexts.</span>
                            )}
                          </div>
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
