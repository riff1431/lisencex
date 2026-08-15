'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Code2, Terminal, Key, Shield, Zap, Globe,
  ChevronDown, ChevronRight, Copy, Check, ExternalLink,
  Layers, Lock, AlertTriangle, Server, FileCode2, Sparkles,
  ArrowRight, Hash, Clock, CheckCircle2, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Code Block Component ──────────────────────────────────────────────
function CodeBlock({ lang, title, code }: { lang: string; title?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-[#0d1117]">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">{lang}</span>
            <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed font-mono text-[#c9d1d9]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Collapsible Section ────────────────────────────────────────────────
function DocSection({ id, title, icon: Icon, defaultOpen, children }: {
  id: string; title: string; icon: any; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);
  return (
    <div id={id} className="rounded-3xl border border-border bg-card shadow-xs overflow-hidden scroll-mt-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">{title}</h2>
        </div>
        {isOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-5 sm:px-6 pb-6 space-y-5 border-t border-border pt-5">{children}</div>}
    </div>
  );
}

// ─── Endpoint Card ──────────────────────────────────────────────────────
function EndpointCard({ method, path, description, auth, scopes, body, response, errorCodes }: {
  method: string; path: string; description: string; auth: string; scopes?: string[];
  body?: string; response?: string; errorCodes?: { code: string; desc: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const methodColor = method === 'POST' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
    : method === 'GET' ? 'bg-blue-500/15 text-blue-600 border-blue-500/20'
    : method === 'PATCH' ? 'bg-amber-500/15 text-amber-600 border-amber-500/20'
    : 'bg-red-500/15 text-red-600 border-red-500/20';

  return (
    <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${methodColor}`}>{method}</span>
            <code className="text-xs font-mono font-bold text-foreground bg-secondary/60 px-2 py-0.5 rounded-md">{path}</code>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" /> {auth}
            </span>
            {scopes?.map(s => (
              <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">{s}</span>
            ))}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs font-semibold text-indigo-500 hover:underline shrink-0">
          {expanded ? 'Collapse' : 'Details'}
        </button>
      </div>
      {expanded && (
        <div className="space-y-3 pt-2 border-t border-border">
          {body && <CodeBlock lang="json" title="Request Body" code={body} />}
          {response && <CodeBlock lang="json" title="Response (200 OK)" code={response} />}
          {errorCodes && errorCodes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-foreground">Error Codes</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {errorCodes.map(ec => (
                  <div key={ec.code} className="flex items-start gap-2 text-[11px]">
                    <code className="font-mono font-bold text-destructive shrink-0">{ec.code}</code>
                    <span className="text-muted-foreground">{ec.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function DocsPage() {
  const [activeNav, setActiveNav] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'auth', label: 'Authentication', icon: Key },
    { id: 'endpoints', label: 'API Endpoints', icon: Terminal },
    { id: 'errors', label: 'Error Codes', icon: AlertTriangle },
    { id: 'rate-limits', label: 'Rate Limits', icon: Clock },
    { id: 'wordpress-plugin', label: 'WordPress Plugin', icon: Code2 },
    { id: 'wordpress-theme', label: 'WordPress Theme', icon: Layers },
    { id: 'php-script', label: 'PHP Script', icon: FileCode2 },
    { id: 'nextjs-app', label: 'Next.js App', icon: Globe },
    { id: 'nextjs-plugin', label: 'Next.js Plugin', icon: Package },
    { id: 'sandbox', label: 'Testing & Sandbox', icon: Zap },
    { id: 'versioning', label: 'API Versioning', icon: Hash },
  ];

  const scrollTo = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="border-b border-border bg-gradient-to-b from-indigo-500/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                API Documentation <span className="text-indigo-500">v1</span>
              </h1>
              <p className="text-sm text-muted-foreground">LicenseNest Developer Integration Reference</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Complete API reference and integration guides for activating, validating, and managing software licenses
            across WordPress, PHP, and Next.js products. All endpoints use JSON and require product client credentials.
          </p>
          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Base URL: /api/v1</span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">Content-Type: application/json</span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">Rate Limit: 60 req/min</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sticky Sidebar Nav */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground px-3 pb-2">Navigation</p>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all text-left ${
                    activeNav === item.id
                      ? 'bg-indigo-500/10 text-indigo-600 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-4 border-t border-border mt-4">
              <Link href="/playground" className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-indigo-500 hover:underline">
                <Sparkles className="h-3.5 w-3.5" /> API Playground
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-6">

          {/* ── OVERVIEW ─────────────────────────────────────────────── */}
          <DocSection id="overview" title="Overview & Quick Start" icon={BookOpen} defaultOpen={true}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              LicenseNest provides a unified API for managing software licensing across all product types.
              The typical integration lifecycle is:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {['1. Setup Credentials', '2. Activate License', '3. Validate Periodically', '4. Check for Updates', '5. Deactivate on Uninstall'].map((step, i) => (
                <div key={i} className="p-3 rounded-2xl border border-border bg-secondary/30 text-center space-y-1">
                  <div className="text-lg font-black text-indigo-500">{i + 1}</div>
                  <p className="text-[11px] font-semibold text-foreground">{step.split('. ')[1]}</p>
                </div>
              ))}
            </div>
            <CodeBlock lang="bash" title="Quick Start – Activate via cURL" code={`curl -X POST https://your-server.com/api/v1/public/licenses/activate \\
  -H "Content-Type: application/json" \\
  -H "X-Client-ID: client_xxxxxxxxxxxx" \\
  -H "X-API-Key: pk_live_xxxxxxxxxxxx" \\
  -d '{
    "productSlug": "my-awesome-plugin",
    "licenseKey": "LIC-XXXX-XXXX-XXXX-XXXX",
    "installationId": "ins_unique_id",
    "domain": "example.com",
    "productVersion": "2.0.0"
  }'`} />
          </DocSection>

          {/* ── AUTHENTICATION ────────────────────────────────────────── */}
          <DocSection id="auth" title="Authentication & Security" icon={Key}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All public/client SDK endpoints require <strong>Product Client Credentials</strong> sent as HTTP headers.
              These credentials are generated per product in the Admin Panel under <strong>Products → API Credentials</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl border border-border bg-background space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-foreground">Required Headers</h3>
                </div>
                <CodeBlock lang="http" code={`X-Client-ID: client_xxxxxxxxxxxxxxxxxxxx
X-API-Key: pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} />
              </div>
              <div className="p-4 rounded-2xl border border-border bg-background space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-foreground">Security Rules</h3>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li>Never embed API keys in client-side JavaScript or browser-accessible code.</li>
                  <li>Credentials are scoped per product with granular permissions.</li>
                  <li>Rotate keys periodically via <code>POST /admin/products/:id/credentials/:id/rotate</code>.</li>
                  <li>Old keys receive a 30-day grace period after rotation.</li>
                  <li>Disabled or expired credentials are immediately rejected.</li>
                </ul>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-bold text-foreground">Important: Credential Scopes</p>
                  <p>Each API key has assigned scopes: <code>activate</code>, <code>validate</code>, <code>update</code>, <code>download</code>. Requests to endpoints outside the key&apos;s scope will return <code>403 Forbidden</code>.</p>
                </div>
              </div>
            </div>
          </DocSection>

          {/* ── API ENDPOINTS ─────────────────────────────────────────── */}
          <DocSection id="endpoints" title="API Endpoints Reference" icon={Terminal}>
            <div className="space-y-4">
              <EndpointCard
                method="POST"
                path="/api/v1/public/licenses/activate"
                description="Activate a license key on a new domain/installation. Returns a signed activation token for subsequent validations."
                auth="Product Client Credentials (X-Client-ID, X-API-Key)"
                scopes={['activate']}
                body={`{
  "productSlug": "my-plugin",          // required
  "licenseKey": "LIC-XXXX-XXXX-...",   // required (or purchaseCode)
  "purchaseCode": "envato-code",       // alternative to licenseKey
  "installationId": "ins_unique_id",   // required, unique per installation
  "domain": "example.com",            // required
  "installationUrl": "https://example.com", // optional
  "environment": "production",         // optional: production|staging|localhost
  "productVersion": "2.0.0",          // optional
  "serverFingerprint": "sha256:..."    // optional
}`}
                response={`{
  "status": "ACTIVE",
  "valid": true,
  "activation": {
    "activationId": "ACT-A1B2C3D4E5F6",
    "installationId": "ins_unique_id",
    "domain": "example.com",
    "environment": "production",
    "productVersion": "2.0.0"
  },
  "license": {
    "licenseKey": "LIC-XXXX-...",
    "status": "active",
    "licenseType": "single_site",
    "activationLimit": 3,
    "currentActivationCount": 1,
    "expiresAt": "2027-08-15T00:00:00.000Z",
    "supportExpiresAt": "2027-02-15T00:00:00.000Z"
  },
  "product": { "name": "My Plugin", "slug": "my-plugin", "currentVersion": "2.1.0" },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "validationIntervalHours": 24,
  "offlineGracePeriodDays": 7,
  "cachedUntil": "2026-08-17T00:00:00.000Z",
  "gracePeriodUntil": "2026-08-24T00:00:00.000Z"
}`}
                errorCodes={[
                  { code: 'LICENSE_NOT_FOUND', desc: 'License key does not exist' },
                  { code: 'LICENSE_EXPIRED', desc: 'License has expired' },
                  { code: 'LICENSE_SUSPENDED', desc: 'License has been suspended by admin' },
                  { code: 'LICENSE_REVOKED', desc: 'License permanently revoked' },
                  { code: 'ACTIVATION_LIMIT_REACHED', desc: 'Max activations exceeded' },
                  { code: 'DOMAIN_MISMATCH', desc: 'Localhost/staging not allowed for this product' },
                  { code: 'BLOCKED', desc: 'Domain, IP, or license blocked by security policy' },
                ]}
              />

              <EndpointCard
                method="POST"
                path="/api/v1/public/licenses/validate"
                description="Periodic heartbeat validation. Verifies the activation is still valid. Call this at the configured validationIntervalHours."
                auth="Product Client Credentials"
                scopes={['validate']}
                body={`{
  "productSlug": "my-plugin",          // required
  "installationId": "ins_unique_id",   // required
  "token": "eyJhbGciOiJIUzI1NiIs...", // required (activation token)
  "domain": "example.com",            // required
  "productVersion": "2.0.1"           // optional
}`}
                response={`{
  "valid": true,
  "status": "ACTIVE",
  "license": { "licenseKey": "LIC-...", "status": "active", ... },
  "product": { "name": "My Plugin", "currentVersion": "2.1.0" },
  "validationIntervalHours": 24,
  "cachedUntil": "2026-08-17T00:00:00.000Z",
  "gracePeriodUntil": "2026-08-24T00:00:00.000Z"
}`}
                errorCodes={[
                  { code: 'REVOKED', desc: 'License revoked by admin' },
                  { code: 'EXPIRED', desc: 'License has expired since last check' },
                  { code: 'SUSPENDED', desc: 'License suspended' },
                  { code: 'BLOCKED', desc: 'Security block active' },
                  { code: 'DOMAIN_MISMATCH', desc: 'Domain differs from original activation' },
                  { code: 'ACTIVATION_DEACTIVATED', desc: 'Activation was deactivated or transferred' },
                ]}
              />

              <EndpointCard
                method="POST"
                path="/api/v1/public/licenses/deactivate"
                description="Deactivate an installation, freeing up the activation slot for reuse on another domain."
                auth="Product Client Credentials"
                scopes={['activate']}
                body={`{
  "installationId": "ins_unique_id",   // required
  "token": "eyJhbGciOiJIUzI1NiIs...", // optional (activation token)
  "licenseKey": "LIC-XXXX-...",        // optional
  "domain": "example.com",            // optional
  "reason": "User uninstalled plugin"  // optional
}`}
                response={`{
  "success": true,
  "message": "License successfully deactivated. Activation slot has been freed."
}`}
                errorCodes={[
                  { code: 'ACTIVATION_NOT_FOUND', desc: 'No active activation for this installation' },
                  { code: 'PRODUCT_MISMATCH', desc: 'Credentials do not match activation product' },
                ]}
              />

              <EndpointCard
                method="GET"
                path="/api/v1/public/products/:slug/updates"
                description="Check if a newer version of the product is available. Returns download URL if licensed."
                auth="Product Client Credentials"
                scopes={['update']}
                body={`Query parameters:
  ?currentVersion=1.0.0    // required – installed version
  &token=eyJhbGci...       // required – activation token
  &domain=example.com      // required – activated domain`}
                response={`{
  "updateAvailable": true,
  "currentVersion": "1.0.0",
  "latestVersion": "2.1.0",
  "releaseName": "Performance Release",
  "releaseNotes": "Bug fixes and performance improvements...",
  "releaseDate": "2026-08-10T00:00:00.000Z",
  "downloadUrl": "/api/v1/public/downloads/eyJhbGci...",
  "fileChecksum": "sha256:abc123..."
}`}
                errorCodes={[
                  { code: 'UPDATE_NOT_ALLOWED', desc: 'License inactive or revoked' },
                  { code: 'TOKEN_INVALID', desc: 'Invalid or expired activation token' },
                ]}
              />

              <EndpointCard
                method="GET"
                path="/api/v1/public/downloads/:token"
                description="Stream download a package file using a temporary signed download token. Returns binary ZIP file."
                auth="Product Client Credentials"
                scopes={['download']}
                response={`Binary ZIP file stream with headers:
  Content-Type: application/zip
  Content-Disposition: attachment; filename="plugin-2.1.0.zip"
  X-Package-Version: 2.1.0
  X-Package-Checksum: sha256:abc123...
  Cache-Control: no-store`}
                errorCodes={[
                  { code: 'DOWNLOAD_NOT_ALLOWED', desc: 'Token expired or invalid' },
                ]}
              />
            </div>
          </DocSection>

          {/* ── ERROR CODES ───────────────────────────────────────────── */}
          <DocSection id="errors" title="Error Codes Reference" icon={AlertTriangle}>
            <p className="text-sm text-muted-foreground mb-3">All error responses follow a consistent format:</p>
            <CodeBlock lang="json" title="Error Response Format" code={`{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable description of the error",
  "details": null,
  "requestId": "uuid-v4",
  "timestamp": "2026-08-15T12:00:00.000Z"
}`} />
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 px-3 font-bold text-foreground">Code</th>
                    <th className="py-2 px-3 font-bold text-foreground">HTTP</th>
                    <th className="py-2 px-3 font-bold text-foreground">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ['UNAUTHORIZED', '401', 'Missing or invalid client credentials'],
                    ['FORBIDDEN', '403', 'Valid credentials but insufficient scope/permissions'],
                    ['PRODUCT_NOT_FOUND', '404', 'Product slug does not exist or is inactive'],
                    ['LICENSE_NOT_FOUND', '404', 'License key does not exist in the system'],
                    ['LICENSE_EXPIRED', '400', 'License term has expired'],
                    ['LICENSE_SUSPENDED', '400', 'License suspended by administrator'],
                    ['LICENSE_REVOKED', '400', 'License permanently revoked'],
                    ['LICENSE_BLOCKED', '403', 'License blocked by security policy'],
                    ['ACTIVATION_LIMIT_REACHED', '400', 'Maximum activation slots exhausted'],
                    ['ACTIVATION_NOT_FOUND', '404', 'No active activation for the given installation'],
                    ['DOMAIN_MISMATCH', '400', 'Domain/environment not allowed for this product'],
                    ['TOKEN_INVALID', '401', 'Activation token is invalid or malformed'],
                    ['TOKEN_EXPIRED', '401', 'Activation token has expired'],
                    ['BLOCKED', '403', 'IP, domain, or license blocked by firewall'],
                    ['RATE_LIMITED', '429', 'Too many requests – slow down'],
                    ['INTERNAL_ERROR', '500', 'Server-side error – contact support'],
                  ].map(([code, http, desc]) => (
                    <tr key={code} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="py-2 px-3 font-mono font-bold text-destructive">{code}</td>
                      <td className="py-2 px-3 font-mono">{http}</td>
                      <td className="py-2 px-3">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocSection>

          {/* ── RATE LIMITS ───────────────────────────────────────────── */}
          <DocSection id="rate-limits" title="Rate Limits & Throttling" icon={Clock}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
                <p className="text-2xl font-black text-indigo-500">60</p>
                <p className="text-xs font-bold text-foreground">Requests per minute</p>
                <p className="text-[11px] text-muted-foreground">Per IP address, across all endpoints</p>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
                <p className="text-2xl font-black text-indigo-500">24h</p>
                <p className="text-xs font-bold text-foreground">Recommended Validation Interval</p>
                <p className="text-[11px] text-muted-foreground">Cache activation tokens locally</p>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
                <p className="text-2xl font-black text-indigo-500">7 days</p>
                <p className="text-xs font-bold text-foreground">Default Offline Grace</p>
                <p className="text-[11px] text-muted-foreground">Product continues working without server</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-background text-xs text-muted-foreground space-y-1">
              <p className="font-bold text-foreground">Rate Limit Headers</p>
              <CodeBlock lang="http" code={`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1686825600
Retry-After: 30`} />
            </div>
          </DocSection>

          {/* ── WORDPRESS PLUGIN GUIDE ──────────────────────────────── */}
          <DocSection id="wordpress-plugin" title="Integration: WordPress Plugin" icon={Code2}>
            <p className="text-sm text-muted-foreground">Drop-in integration for WordPress plugins using the LicenseNest PHP SDK.</p>
            <CodeBlock lang="php" title="1. Include SDK & Initialize" code={`// In your main plugin file: my-plugin.php
require_once __DIR__ . '/licensing/class-licensenest-plugin.php';

$license_client = new LicenseNest_Plugin([
    'api_url'         => 'https://your-server.com/api/v1',
    'product_slug'    => 'my-awesome-plugin',
    'product_version' => MY_PLUGIN_VERSION,
    'client_id'       => 'client_xxxxxxxxxxxx',
    'api_key'         => 'pk_live_xxxxxxxxxxxx',
    'storage_key'     => 'my_plugin_license',
]);`} />
            <CodeBlock lang="php" title="2. Activation (License Settings Page)" code={`// Handle form submission in admin settings
if (isset($_POST['license_key']) && isset($_POST['license_action'])) {
    $key = sanitize_text_field($_POST['license_key']);

    if ($_POST['license_action'] === 'activate') {
        $result = $license_client->activate($key);
        if ($result['valid']) {
            update_option('my_plugin_license_key', $key);
            add_settings_error('license', 'activated', 'License activated!', 'success');
        } else {
            add_settings_error('license', 'error', $result['message'], 'error');
        }
    }

    if ($_POST['license_action'] === 'deactivate') {
        $result = $license_client->deactivate();
        delete_option('my_plugin_license_key');
        add_settings_error('license', 'deactivated', 'License deactivated.', 'info');
    }
}`} />
            <CodeBlock lang="php" title="3. Periodic Validation (Admin Init Hook)" code={`add_action('admin_init', function() use ($license_client) {
    $status = $license_client->get_license_status();

    // Skip if recently validated (respects interval)
    if ($status['valid'] && !$license_client->needs_revalidation()) {
        return;
    }

    $validation = $license_client->validate();

    if (!$validation['valid']) {
        add_action('admin_notices', function() use ($validation) {
            echo '<div class="notice notice-warning"><p>';
            echo 'License issue: ' . esc_html($validation['message']);
            echo '</p></div>';
        });
    }
});`} />
            <CodeBlock lang="php" title="4. Auto-Update Integration" code={`// Hook into WordPress update system
add_filter('pre_set_site_transient_update_plugins', function($transient) use ($license_client) {
    $update = $license_client->check_update();

    if ($update && $update['updateAvailable']) {
        $plugin_file = plugin_basename(__FILE__);
        $transient->response[$plugin_file] = (object) [
            'slug'        => 'my-awesome-plugin',
            'new_version' => $update['latestVersion'],
            'package'     => $update['downloadUrl'],
            'url'         => 'https://your-site.com/changelog',
        ];
    }

    return $transient;
});`} />
          </DocSection>

          {/* ── WORDPRESS THEME GUIDE ─────────────────────────────────── */}
          <DocSection id="wordpress-theme" title="Integration: WordPress Theme" icon={Layers}>
            <p className="text-sm text-muted-foreground">Similar to plugins but uses the Theme SDK class with <code>wp_get_theme()</code> for version detection.</p>
            <CodeBlock lang="php" title="Theme functions.php Setup" code={`// In functions.php
require_once get_template_directory() . '/licensing/class-licensenest-theme.php';

$theme_license = new LicenseNest_Theme([
    'api_url'      => 'https://your-server.com/api/v1',
    'product_slug' => 'my-premium-theme',
    'client_id'    => 'client_xxxxxxxxxxxx',
    'api_key'      => 'pk_live_xxxxxxxxxxxx',
    'storage_key'  => 'my_theme_license',
]);

// Theme auto-updates via pre_set_site_transient_update_themes
add_filter('pre_set_site_transient_update_themes', function($transient) use ($theme_license) {
    $update = $theme_license->check_update();
    if ($update && $update['updateAvailable']) {
        $theme_slug = get_template();
        $transient->response[$theme_slug] = [
            'theme'       => $theme_slug,
            'new_version' => $update['latestVersion'],
            'package'     => $update['downloadUrl'],
            'url'         => 'https://your-site.com/changelog',
        ];
    }
    return $transient;
});`} />
          </DocSection>

          {/* ── PHP SCRIPT GUIDE ──────────────────────────────────────── */}
          <DocSection id="php-script" title="Integration: PHP Script" icon={FileCode2}>
            <p className="text-sm text-muted-foreground">For standalone PHP applications, SaaS dashboards, or custom CMS platforms.</p>
            <CodeBlock lang="php" title="PHP Script Integration" code={`require_once __DIR__ . '/licensing/LicenseNest_PHP.php';

$license = new LicenseNest_PHP([
    'api_url'         => 'https://your-server.com/api/v1',
    'product_slug'    => 'my-php-app',
    'product_version' => '3.0.0',
    'client_id'       => 'client_xxxxxxxxxxxx',
    'api_key'         => 'pk_live_xxxxxxxxxxxx',
    'storage_path'    => __DIR__ . '/.license_data',
]);

// On first setup or license page
$result = $license->activate($licenseKey);
if (!$result['valid']) {
    die('License activation failed: ' . $result['message']);
}

// On every page load (cached – skips server if interval not reached)
$status = $license->validate();
if (!$status['valid']) {
    // Show license warning or restrict features
    header('HTTP/1.1 403 Forbidden');
    echo 'Invalid license. Please renew at: https://your-store.com';
    exit;
}`} />
          </DocSection>

          {/* ── NEXT.JS APP GUIDE ─────────────────────────────────────── */}
          <DocSection id="nextjs-app" title="Integration: Next.js App" icon={Globe}>
            <p className="text-sm text-muted-foreground">Server-side license validation using the TypeScript SDK. Never expose secrets in client bundles.</p>
            <CodeBlock lang="typescript" title="1. Initialize Client (Server-Side Only)" code={`// lib/license.ts (server-side only – never import in client components)
import { LicenseNestNextApp } from './licensing/LicenseNestNextApp';

export const licenseClient = new LicenseNestNextApp({
  apiUrl: process.env.LICENSENEST_API_URL!,
  productSlug: process.env.LICENSENEST_PRODUCT_SLUG!,
  productVersion: process.env.npm_package_version || '1.0.0',
  clientId: process.env.LICENSENEST_CLIENT_ID!,
  apiKey: process.env.LICENSENEST_API_KEY!,
  storagePath: './.license_data',
});`} />
            <CodeBlock lang="typescript" title="2. API Route for Activation" code={`// app/api/license/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { licenseClient } from '@/lib/license';

export async function POST(req: NextRequest) {
  const { licenseKey } = await req.json();
  const result = await licenseClient.activate(licenseKey);
  return NextResponse.json(result);
}`} />
            <CodeBlock lang="typescript" title="3. Middleware Route Guard" code={`// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { licenseClient } from '@/lib/license';

export async function middleware(req: NextRequest) {
  // Skip public routes
  if (req.nextUrl.pathname.startsWith('/api/license')) {
    return NextResponse.next();
  }

  const status = await licenseClient.getLicenseStatus();
  if (!status.valid) {
    return NextResponse.redirect(new URL('/license', req.url));
  }

  return NextResponse.next();
}`} />
            <CodeBlock lang="typescript" title="4. React Hook (Client-Safe)" code={`// hooks/useLicense.ts
'use client';
import { useState, useEffect } from 'react';

export function useLicense() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/license/status')
      .then(res => res.json())
      .then(data => { setStatus(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activate = async (key: string) => {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: key }),
    });
    return res.json();
  };

  return { status, loading, activate };
}`} />
          </DocSection>

          {/* ── NEXT.JS PLUGIN GUIDE ──────────────────────────────────── */}
          <DocSection id="nextjs-plugin" title="Integration: Next.js Theme/Plugin" icon={Package}>
            <p className="text-sm text-muted-foreground">
              For distributable Next.js themes and plugins that run inside another Next.js host app.
            </p>
            <CodeBlock lang="typescript" title="Plugin/Theme Integration" code={`// my-nextjs-plugin/src/licensing/index.ts
import { LicenseNestPlugin } from './LicenseNestPlugin';

const pluginLicense = new LicenseNestPlugin({
  apiUrl: process.env.LICENSENEST_API_URL!,
  productSlug: 'my-nextjs-plugin',
  productVersion: '1.5.0',
  clientId: process.env.PLUGIN_CLIENT_ID!,
  apiKey: process.env.PLUGIN_API_KEY!,
  storagePath: './.plugin_license',
});

// Export for host app to call
export async function initPlugin(licenseKey: string) {
  const result = await pluginLicense.activate(licenseKey);
  if (!result.valid) {
    throw new Error('Plugin license invalid: ' + result.message);
  }
  return result;
}

export async function validatePlugin() {
  return pluginLicense.validate();
}

export async function checkPluginUpdate() {
  return pluginLicense.checkUpdate();
}`} />
          </DocSection>

          {/* ── TESTING / SANDBOX ──────────────────────────────────────── */}
          <DocSection id="sandbox" title="Testing & Sandbox Instructions" icon={Zap}>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-2">
                    <p className="font-bold text-foreground">Sandbox / Development Testing</p>
                    <ol className="list-decimal pl-4 text-muted-foreground space-y-1.5">
                      <li>Create a test product in Admin Panel with <code>status: draft</code>.</li>
                      <li>Generate API Credentials for the test product.</li>
                      <li>Enable <strong>Allow Localhost</strong> and <strong>Allow Staging</strong> in product settings.</li>
                      <li>Set <strong>Count Localhost: false</strong> so dev activations don&apos;t consume slots.</li>
                      <li>Create a test license key with a high activation limit (e.g. 100).</li>
                      <li>Use the <Link href="/playground" className="text-indigo-500 font-semibold hover:underline">API Playground</Link> to test activation/validation/deactivation.</li>
                      <li>Verify auto-updates by uploading a test ZIP package and checking the update endpoint.</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-border bg-background space-y-2">
                <p className="text-xs font-bold text-foreground">Environment Detection</p>
                <p className="text-xs text-muted-foreground">The API automatically detects the environment from the domain:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    ['localhost, 127.0.0.1, *.local', 'localhost'],
                    ['*.staging.*, *.stage.*', 'staging'],
                    ['*.dev.*, *.test.*', 'development'],
                    ['Everything else', 'production'],
                  ].map(([domains, env]) => (
                    <div key={env} className="p-2 rounded-xl border border-border text-center">
                      <code className="text-[10px] font-mono font-bold text-indigo-500">{env}</code>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{domains}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DocSection>

          {/* ── API VERSIONING ─────────────────────────────────────────── */}
          <DocSection id="versioning" title="API Versioning & Compatibility" icon={Hash}>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                All endpoints are prefixed with <code>/api/v1/</code>. When breaking changes are introduced,
                a new version (e.g. <code>/api/v2/</code>) will be published while <code>v1</code> remains
                available for backward compatibility.
              </p>
              <div className="p-4 rounded-2xl border border-border bg-background space-y-2">
                <p className="text-xs font-bold text-foreground">Versioning Policy</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li><strong>Current Version:</strong> <code>v1</code> (stable)</li>
                  <li><strong>Deprecation Notice:</strong> 6 months before any version retirement.</li>
                  <li><strong>Non-Breaking Changes:</strong> New fields added to responses without version bump.</li>
                  <li><strong>Breaking Changes:</strong> Field removals, type changes, or behavioral changes trigger a new version.</li>
                  <li><strong>SDK Compatibility:</strong> SDKs include the API version in their configuration. Upgrade SDKs to use new API versions.</li>
                </ul>
              </div>
              <CodeBlock lang="text" title="Version Header" code={`// API responses include version info:
X-API-Version: v1
X-Deprecation-Notice: none`} />
            </div>
          </DocSection>

        </main>
      </div>
    </div>
  );
}
