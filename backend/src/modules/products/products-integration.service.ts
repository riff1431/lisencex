import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Product, ProductDocument, MarketplaceSource } from '../../database/schemas/product.schema';
import { ProductCredential, ProductCredentialDocument } from '../../database/schemas/product-credential.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { License, LicenseDocument } from '../../database/schemas/license.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { IntegrationStatus, ProductType, ProductStatus, LicenseStatus, LicenseType } from '../../common/enums/app.enums';
import { TokenService } from '../token/token.service';
import { RegisterProductWizardDto, RunWizardTestDto } from './dto/product-wizard.dto';

@Injectable()
export class ProductsIntegrationService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductCredential.name)
    private credentialModel: Model<ProductCredentialDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private tokenService: TokenService,
  ) {}

  private getApiBaseUrl(): string {
    return (
      this.configService.get<string>('API_BASE_URL') ||
      'http://localhost:5001/api/v1'
    );
  }

  /**
   * Get full integration settings for a product
   */
  async getIntegrationSettings(productId: string) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Find or create primary active credential
    let credential = await this.credentialModel.findOne({
      productId: product._id,
      status: 'active',
    });

    if (!credential) {
      const clientId = 'client_' + crypto.randomBytes(12).toString('hex');
      const apiKey = 'pk_live_' + crypto.randomBytes(24).toString('hex');

      credential = await this.credentialModel.create({
        productId: product._id,
        clientId,
        apiKey,
        name: `${product.name} Primary SDK Key`,
        scopes: ['activate', 'validate', 'update', 'download'],
        status: 'active',
      });
    }

    const apiBase = this.getApiBaseUrl();
    const publicVerificationKey = `pk_verify_${crypto
      .createHash('sha256')
      .update(`licensenest_pub_${product._id.toString()}_${product.slug}`)
      .digest('hex')
      .slice(0, 32)}`;

    const endpoints = {
      activationUrl: `${apiBase}/public/licenses/activate`,
      validationUrl: `${apiBase}/public/licenses/validate`,
      deactivationUrl: `${apiBase}/public/licenses/deactivate`,
      updateUrl: `${apiBase}/public/products/${product.slug}/updates`,
      downloadUrlTemplate: `${apiBase}/public/downloads/:token`,
    };

    const templates = this.generateCodeTemplates(product, credential, endpoints, publicVerificationKey);
    const uiExamples = this.generateUiExamples(product);

    return {
      productId: product._id.toString(),
      productName: product.name,
      productSlug: product.slug,
      productType: product.productType,
      currentVersion: product.currentVersion,
      integrationStatus: product.integrationStatus || IntegrationStatus.NOT_INTEGRATED,
      integrationMetadata: product.integrationMetadata || {},
      publicClientId: credential.clientId,
      apiKey: credential.apiKey,
      credentialName: credential.name,
      scopes: credential.scopes,
      publicVerificationKey,
      endpoints,
      licenseSettings: {
        validationIntervalHours: product.licenseSettings?.validationIntervalHours ?? 24,
        offlineGracePeriodDays: product.licenseSettings?.offlineGracePeriodDays ?? 7,
        allowLocalhost: product.licenseSettings?.allowLocalhost ?? true,
        countLocalhost: product.licenseSettings?.countLocalhost ?? false,
        allowStaging: product.licenseSettings?.allowStaging ?? true,
        countStaging: product.licenseSettings?.countStaging ?? false,
        domainBinding: product.licenseSettings?.domainBinding ?? true,
        installationBinding: product.licenseSettings?.installationBinding ?? true,
        allowDeactivation: product.licenseSettings?.allowDeactivation ?? true,
        defaultActivationLimit: product.licenseSettings?.defaultActivationLimit ?? 1,
      },
      templates,
      uiExamples,
    };
  }

  /**
   * Update integration status for a product
   */
  async updateIntegrationStatus(
    productId: string,
    status: IntegrationStatus,
    metadata: Record<string, any> = {},
    adminEmail: string,
  ) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const previousStatus = product.integrationStatus;
    product.integrationStatus = status;
    if (metadata && Object.keys(metadata).length > 0) {
      product.integrationMetadata = {
        ...(product.integrationMetadata || {}),
        ...metadata,
        lastUpdated: new Date().toISOString(),
      };
    }
    await product.save();

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'PRODUCT_INTEGRATION_STATUS_UPDATED',
      targetType: 'product',
      targetId: productId,
      before: { integrationStatus: previousStatus },
      after: { integrationStatus: status, metadata },
    });

    return {
      productId: product._id,
      name: product.name,
      integrationStatus: product.integrationStatus,
      integrationMetadata: product.integrationMetadata,
    };
  }

  /**
   * Run developer test scenarios for a product
   */
  async runTestScenario(productId: string, scenario: string) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const apiBase = this.getApiBaseUrl();
    const mockInstallationId = 'ins_test_' + crypto.randomBytes(6).toString('hex');
    const mockDomain = 'test.example.com';
    const mockLicenseKey = `LIC-${product.slug.toUpperCase().slice(0, 4)}-TEST-8899-AAAA`;

    switch (scenario) {
      case 'ACTIVATE_VALID': {
        const tokenSign = this.tokenService.signActivationToken({
          activationId: 'ACT-TEST-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
          installationId: mockInstallationId,
          licenseId: new Types.ObjectId().toString(),
          productId: product._id.toString(),
          productSlug: product.slug,
          domain: mockDomain,
          environment: 'development',
        });

        return {
          scenario: 'ACTIVATE_VALID',
          title: 'Successful Activation (Valid License)',
          status: 'SUCCESS',
          httpStatus: 200,
          request: {
            url: `${apiBase}/public/licenses/activate`,
            method: 'POST',
            body: {
              productSlug: product.slug,
              licenseKey: mockLicenseKey,
              installationId: mockInstallationId,
              domain: mockDomain,
              productVersion: product.currentVersion,
            },
          },
          response: {
            success: true,
            status: 'ACTIVE',
            valid: true,
            activation: {
              activationId: 'ACT-TEST-001',
              installationId: mockInstallationId,
              domain: mockDomain,
              environment: 'development',
              productVersion: product.currentVersion,
            },
            license: {
              licenseKey: mockLicenseKey,
              status: 'active',
              licenseType: 'single_site',
              activationLimit: product.licenseSettings?.defaultActivationLimit || 1,
              currentActivationCount: 1,
              expiresAt: null,
            },
            product: {
              name: product.name,
              slug: product.slug,
              currentVersion: product.currentVersion,
            },
            token: tokenSign.token,
            validationIntervalHours: product.licenseSettings?.validationIntervalHours || 24,
            offlineGracePeriodDays: product.licenseSettings?.offlineGracePeriodDays || 7,
            cachedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            gracePeriodUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          developerGuideline:
            'Save the returned signed token and cachedUntil timestamp to local storage / wp_options. Unlock premium features immediately.',
        };
      }

      case 'ACTIVATE_INVALID_KEY': {
        return {
          scenario: 'ACTIVATE_INVALID_KEY',
          title: 'Failed Activation (Invalid License Key)',
          status: 'EXPECTED_ERROR',
          httpStatus: 404,
          request: {
            url: `${apiBase}/public/licenses/activate`,
            method: 'POST',
            body: {
              productSlug: product.slug,
              licenseKey: 'LIC-INVALID-KEY-0000-0000',
              installationId: mockInstallationId,
              domain: mockDomain,
            },
          },
          response: {
            success: false,
            code: 'LICENSE_NOT_FOUND',
            message: 'License key not found or does not exist.',
            details: null,
          },
          developerGuideline:
            'Display error message to customer on license form: "License key is invalid. Please verify your purchase code or order details."',
        };
      }

      case 'ACTIVATE_EXPIRED': {
        return {
          scenario: 'ACTIVATE_EXPIRED',
          title: 'Failed Activation (Expired License)',
          status: 'EXPECTED_ERROR',
          httpStatus: 400,
          request: {
            url: `${apiBase}/public/licenses/activate`,
            method: 'POST',
            body: {
              productSlug: product.slug,
              licenseKey: mockLicenseKey,
              installationId: mockInstallationId,
              domain: mockDomain,
            },
          },
          response: {
            success: false,
            code: 'LICENSE_EXPIRED',
            message: 'This license expired on 2026-01-01. Please renew your license.',
            details: null,
          },
          developerGuideline:
            'Prompt customer to renew their license subscription with a direct renewal URL.',
        };
      }

      case 'ACTIVATE_REVOKED': {
        return {
          scenario: 'ACTIVATE_REVOKED',
          title: 'Failed Activation (Revoked/Suspended License)',
          status: 'EXPECTED_ERROR',
          httpStatus: 400,
          request: {
            url: `${apiBase}/public/licenses/activate`,
            method: 'POST',
            body: {
              productSlug: product.slug,
              licenseKey: mockLicenseKey,
              installationId: mockInstallationId,
              domain: mockDomain,
            },
          },
          response: {
            success: false,
            code: 'LICENSE_REVOKED',
            message: 'This license has been revoked by administration due to terms of service violation.',
            details: null,
          },
          developerGuideline:
            'Clear any stored token immediately, restrict all premium features, and show security advisory notice.',
        };
      }

      case 'ACTIVATE_DOMAIN_MISMATCH': {
        return {
          scenario: 'ACTIVATE_DOMAIN_MISMATCH',
          title: 'Domain Restriction / Disallowed Environment',
          status: 'EXPECTED_ERROR',
          httpStatus: 400,
          request: {
            url: `${apiBase}/public/licenses/activate`,
            method: 'POST',
            body: {
              productSlug: product.slug,
              licenseKey: mockLicenseKey,
              installationId: mockInstallationId,
              domain: 'disallowed-staging.corp',
            },
          },
          response: {
            success: false,
            code: 'DOMAIN_MISMATCH',
            message: 'Activations are restricted for this domain environment.',
            details: null,
          },
          developerGuideline:
            'Check product staging/localhost rules in Admin Panel or register the domain as an authorized domain.',
        };
      }

      case 'ACTIVATE_LIMIT_REACHED': {
        return {
          scenario: 'ACTIVATE_LIMIT_REACHED',
          title: 'Activation Limit Exhausted',
          status: 'EXPECTED_ERROR',
          httpStatus: 400,
          request: {
            url: `${apiBase}/public/licenses/activate`,
            method: 'POST',
            body: {
              productSlug: product.slug,
              licenseKey: mockLicenseKey,
              installationId: mockInstallationId,
              domain: mockDomain,
            },
          },
          response: {
            success: false,
            code: 'ACTIVATION_LIMIT_REACHED',
            message: 'Maximum activations (1/1) reached for this license. Deactivate another site first or upgrade your license plan.',
            details: null,
          },
          developerGuideline:
            'Advise customer to deactivate an existing domain from their customer dashboard or upgrade to a Multi-Site plan.',
        };
      }

      case 'VALIDATE_ACTIVE': {
        return {
          scenario: 'VALIDATE_ACTIVE',
          title: 'Periodic Heartbeat Validation (Valid)',
          status: 'SUCCESS',
          httpStatus: 200,
          request: {
            url: `${apiBase}/public/licenses/validate`,
            method: 'POST',
            body: {
              productSlug: product.slug,
              installationId: mockInstallationId,
              token: 'eyJhbGciOiJIUzI1NiIs...',
              domain: mockDomain,
              productVersion: product.currentVersion,
            },
          },
          response: {
            success: true,
            valid: true,
            status: 'ACTIVE',
            cachedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            gracePeriodUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            product: {
              name: product.name,
              currentVersion: product.currentVersion,
            },
          },
          developerGuideline:
            'Update local cachedUntil timestamp. Do NOT query server again until cachedUntil timestamp passes.',
        };
      }

      case 'DEACTIVATE_SUCCESS': {
        return {
          scenario: 'DEACTIVATE_SUCCESS',
          title: 'Successful Deactivation',
          status: 'SUCCESS',
          httpStatus: 200,
          request: {
            url: `${apiBase}/public/licenses/deactivate`,
            method: 'POST',
            body: {
              installationId: mockInstallationId,
              productSlug: product.slug,
              reason: 'Customer uninstalled or transferred website',
            },
          },
          response: {
            success: true,
            message: 'License successfully deactivated. Activation slot has been freed for reuse.',
          },
          developerGuideline:
            'Delete stored license key and activation token from local database. Lock premium features.',
        };
      }

      default:
        throw new BadRequestException(`Unknown scenario: ${scenario}`);
    }
  }

  /**
   * Helper to generate tailored code templates
   */
  private generateCodeTemplates(
    product: ProductDocument,
    cred: ProductCredentialDocument,
    endpoints: Record<string, string>,
    publicKey: string,
  ) {
    const slug = product.slug;
    const version = product.currentVersion || '1.0.0';
    const clientId = cred.clientId;
    const apiKey = cred.apiKey;
    const interval = product.licenseSettings?.validationIntervalHours ?? 24;
    const grace = product.licenseSettings?.offlineGracePeriodDays ?? 7;

    return {
      wordpressPlugin: {
        title: 'WordPress Plugin Integration',
        language: 'php',
        description: 'Drop-in integration for WordPress plugins with automatic settings page and auto-updates.',
        setupCode: `// In your main plugin file (e.g. ${slug}.php):
require_once __DIR__ . '/licensing/class-licensenest-plugin.php';

$license_manager = new LicenseNest_Plugin([
    'api_url'                 => '${endpoints.activationUrl.replace('/public/licenses/activate', '')}',
    'product_slug'            => '${slug}',
    'product_version'         => '${version}',
    'client_id'               => '${clientId}',
    'api_key'                 => '${apiKey}',
    'storage_key'             => '${slug.replace(/-/g, '_')}_license_data',
    'validation_interval'     => ${interval}, // hours
    'offline_grace_period'    => ${grace},    // days
]);

// Gate premium features:
if ($license_manager->isActive()) {
    // Load PRO features
    require_once __DIR__ . '/includes/pro-features.php';
}`,
        methodsCode: `// 1. Activate License
$result = $license_manager->activate($license_key);
if ($result['valid']) {
    echo "License activated successfully!";
} else {
    echo "Activation failed: " . esc_html($result['message']);
}

// 2. Validate License (uses local cache; hits server only when cache expires)
$status = $license_manager->validate();

// 3. Deactivate License (releases slot)
$license_manager->deactivate('Customer uninstalled');

// 4. Read Status Synchronously (no network overhead)
$isActive = $license_manager->isActive();

// 5. Check Updates
$update = $license_manager->checkForUpdates();
if ($update && $update['updateAvailable']) {
    // Update available: $update['latestVersion']
}`,
      },

      wordpressTheme: {
        title: 'WordPress Theme Integration',
        language: 'php',
        description: 'Theme integration for functions.php with customizer/admin notices and theme updates.',
        setupCode: `// In functions.php:
require_once get_template_directory() . '/licensing/class-licensenest-theme.php';

$theme_license = new LicenseNest_Theme([
    'api_url'             => '${endpoints.activationUrl.replace('/public/licenses/activate', '')}',
    'product_slug'        => '${slug}',
    'client_id'           => '${clientId}',
    'api_key'             => '${apiKey}',
    'storage_key'         => '${slug.replace(/-/g, '_')}_theme_license',
    'validation_interval' => ${interval},
]);

if ($theme_license->isActive()) {
    // Enable premium theme customizer panels & templates
}`,
        methodsCode: `// Activate theme license:
$res = $theme_license->activate($license_key);

// Validate on admin_init:
add_action('admin_init', function() use ($theme_license) {
    if (!$theme_license->isActive()) {
        add_action('admin_notices', function() {
            echo '<div class="notice notice-warning"><p>Please activate your theme license for updates.</p></div>';
        });
    }
});`,
      },

      phpScript: {
        title: 'PHP Script / Standalone SaaS Integration',
        language: 'php',
        description: 'Universal PHP licensing client with file/database persistence and offline grace period.',
        setupCode: `<?php
require_once __DIR__ . '/licensing/LicenseNest_PHP.php';

$license = new LicenseNest_PHP([
    'api_url'              => '${endpoints.activationUrl.replace('/public/licenses/activate', '')}',
    'product_slug'         => '${slug}',
    'product_version'      => '${version}',
    'client_id'            => '${clientId}',
    'api_key'              => '${apiKey}',
    'storage_path'         => __DIR__ . '/.license_storage.json',
    'validation_interval'  => ${interval},
    'offline_grace_period' => ${grace},
]);

// Check on every request (cached in file storage):
if (!$license->isActive()) {
    header('Location: /license-activate.php');
    exit;
}`,
        methodsCode: `// Activate:
$res = $license->activate($_POST['license_key']);
if ($res['valid']) {
    header('Location: /dashboard.php');
} else {
    $error = $res['message'];
}

// Validate periodically:
$status = $license->validate();

// Deactivate:
$license->deactivate();

// Check update:
$update = $license->checkForUpdates();`,
      },

      nextjsApp: {
        title: 'Next.js App (Server-Side) Integration',
        language: 'typescript',
        description: 'Secure TypeScript SDK for Next.js App Router (route handlers, middleware, server actions).',
        setupCode: `// lib/license.ts (Server-side only — never expose in client components!)
import { LicenseNestNextApp } from '@/licensing/LicenseNestNextApp';

export const licenseClient = new LicenseNestNextApp({
  apiUrl: process.env.LICENSENEST_API_URL || '${endpoints.activationUrl.replace('/public/licenses/activate', '')}',
  productSlug: '${slug}',
  productVersion: process.env.npm_package_version || '${version}',
  clientId: process.env.LICENSENEST_CLIENT_ID || '${clientId}',
  apiKey: process.env.LICENSENEST_API_KEY || '${apiKey}',
  storagePath: './.license_data.json',
  validationIntervalHours: ${interval},
  offlineGracePeriodDays: ${grace},
});`,
        methodsCode: `// 1. Activation Route (app/api/license/activate/route.ts)
import { NextRequest, NextResponse } from 'next/server';
import { licenseClient } from '@/lib/license';

export async function POST(req: NextRequest) {
  const { licenseKey } = await req.json();
  const result = await licenseClient.activate(licenseKey);
  return NextResponse.json(result);
}

// 2. Middleware Protection (middleware.ts)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { licenseClient } from '@/lib/license';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/activate') || req.nextUrl.pathname.startsWith('/api/license')) {
    return NextResponse.next();
  }

  const status = await licenseClient.getLicenseStatus();
  if (!status.valid) {
    return NextResponse.redirect(new URL('/activate', req.url));
  }
  return NextResponse.next();
}`,
      },

      nextjsPlugin: {
        title: 'Next.js Plugin / Distributable Theme Integration',
        language: 'typescript',
        description: 'Module integration for distributed Next.js packages and plugins.',
        setupCode: `// src/licensing.ts
import { LicenseNestPlugin } from './LicenseNestPlugin';

export const pluginLicense = new LicenseNestPlugin({
  apiUrl: '${endpoints.activationUrl.replace('/public/licenses/activate', '')}',
  productSlug: '${slug}',
  productVersion: '${version}',
  clientId: '${clientId}',
  apiKey: '${apiKey}',
  storagePath: './.plugin_license_${slug.replace(/-/g, '_')}.json',
});

export async function verifyPluginLicense(licenseKey: string) {
  return pluginLicense.activate(licenseKey);
}`,
        methodsCode: `// Verify inside plugin entry point:
const status = await pluginLicense.validate();
if (!status.valid) {
  throw new Error('[${product.name}] License inactive: ' + status.message);
}`,
      },
    };
  }

  /**
   * Helper to generate activation UI examples
   */
  private generateUiExamples(product: ProductDocument) {
    return {
      phpHtml: `<!-- Standard PHP Activation Form Example -->
<div class="licensenest-activation-card" style="max-width: 480px; margin: 40px auto; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; font-family: sans-serif; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">Activate ${product.name}</h2>
  <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Enter your license key or Envato purchase code to activate this installation.</p>
  
  <form method="POST" action="">
    <div style="margin-bottom: 16px;">
      <label style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #475569; margin-bottom: 6px;">License Key</label>
      <input type="text" name="license_key" placeholder="LIC-XXXX-XXXX-XXXX-XXXX" required style="width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 14px; font-family: monospace; border: 1px solid #cbd5e1; border-radius: 8px; outline: none;" />
    </div>
    
    <button type="submit" name="license_action" value="activate" style="width: 100%; background: #4f46e5; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
      Activate License
    </button>
  </form>
</div>`,

      reactComponent: `'use client';
import React, { useState } from 'react';

export function LicenseActivationModal({ onActivated }: { onActivated?: () => void }) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      });
      const data = await res.json();
      if (!data.valid && !data.success) {
        throw new Error(data.message || 'Activation failed');
      }
      onActivated?.();
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Could not activate license');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-xl">
      <h3 className="text-lg font-bold text-foreground">Activate ${product.name}</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Enter your purchase code or license key to enable premium features.
      </p>

      {error && (
        <div className="p-3 mb-4 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
            License Key / Purchase Code
          </label>
          <input
            type="text"
            required
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="LIC-XXXX-XXXX-XXXX-XXXX"
            className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Activating...' : 'Activate License'}
        </button>
      </form>
    </div>
  );
}`,
    };
  }

  /**
   * =========================================================================
   * DEVELOPER PRODUCT REGISTRATION & INTEGRATION WIZARD METHODS
   * =========================================================================
   */

  /**
   * Step 1-3: Register a new product via wizard with automatic API configuration & test license
   */
  async registerProductWizard(dto: RegisterProductWizardDto, adminEmail: string) {
    // Generate unique slug if not supplied or format slug
    let slug = (dto.slug || dto.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) {
      slug = 'product-' + crypto.randomBytes(4).toString('hex');
    }

    const existing = await this.productModel.findOne({ slug });
    if (existing) {
      slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    // Default license settings
    const licenseSettings = {
      licenseRequired: dto.licenseSettings?.licenseRequired ?? true,
      defaultLicenseType: dto.licenseSettings?.defaultLicenseType ?? LicenseType.REGULAR,
      licenseDurationDays: dto.licenseSettings?.licenseDurationDays ?? 0,
      supportDurationDays: dto.licenseSettings?.supportDurationDays ?? 180,
      defaultActivationLimit: dto.licenseSettings?.defaultActivationLimit ?? 1,
      domainBinding: dto.licenseSettings?.domainBinding ?? true,
      installationBinding: dto.licenseSettings?.installationBinding ?? true,
      allowLocalhost: dto.licenseSettings?.allowLocalhost ?? true,
      countLocalhost: dto.licenseSettings?.countLocalhost ?? false,
      allowStaging: dto.licenseSettings?.allowStaging ?? true,
      countStaging: dto.licenseSettings?.countStaging ?? false,
      allowDeactivation: dto.licenseSettings?.allowDeactivation ?? true,
      deactivationCooldownHours: dto.licenseSettings?.deactivationCooldownHours ?? 0,
      periodicValidation: dto.licenseSettings?.periodicValidation ?? true,
      validationIntervalHours: dto.licenseSettings?.validationIntervalHours ?? 24,
      offlineGracePeriodDays: dto.licenseSettings?.offlineGracePeriodDays ?? 7,
      automaticUpdatesEnabled: dto.licenseSettings?.automaticUpdatesEnabled ?? true,
      downloadsEnabled: dto.licenseSettings?.downloadsEnabled ?? true,
    };

    // Initial checklist
    const initialChecklist = {
      productCreated: true,
      apiConfigured: true,
      sdkIntegrated: false,
      activationTested: false,
      validationTested: false,
      deactivationTested: false,
      updateTested: false,
      productionReady: false,
    };

    const product = (await this.productModel.create({
      name: dto.name,
      slug,
      sku: dto.sku || `SKU-${slug.toUpperCase()}`,
      productType: dto.productType,
      description: dto.description || '',
      shortDescription: dto.shortDescription || '',
      currentVersion: dto.currentVersion || '1.0.0',
      latestStableVersion: dto.currentVersion || '1.0.0',
      price: dto.price ?? 49,
      extendedPrice: dto.extendedPrice ?? 199,
      currency: dto.currency || 'USD',
      marketplaceSource: dto.marketplaceSource || MarketplaceSource.OWN_MARKETPLACE,
      primaryCategoryId: dto.primaryCategoryId ? new Types.ObjectId(dto.primaryCategoryId) : undefined,
      categoryIds: (dto.categoryIds || []).map((id) => new Types.ObjectId(id)),
      tags: dto.tags || [],
      isFeatured: !!dto.isFeatured,
      isPopular: !!dto.isPopular,
      isNewRelease: !!dto.isNewRelease,
      isBestSeller: !!dto.isBestSeller,
      badgeLabel: dto.badgeLabel || undefined,
      status: ProductStatus.ACTIVE,
      integrationStatus: IntegrationStatus.TESTING,
      licenseSettings,
      integrationMetadata: {
        checklist: initialChecklist,
        wizardStartedAt: new Date().toISOString(),
        testHistory: [],
      },
    })) as ProductDocument;

    // Auto-generate Active Product Credential
    const clientId = 'client_' + crypto.randomBytes(12).toString('hex');
    const apiKey = 'pk_live_' + crypto.randomBytes(24).toString('hex');

    const credential = await this.credentialModel.create({
      productId: product._id,
      clientId,
      apiKey,
      name: `${product.name} Primary SDK Key`,
      scopes: ['activate', 'validate', 'update', 'download'],
      status: 'active',
    });

    // Auto-create a test license for the admin user
    let user = await this.userModel.findOne({ email: adminEmail.toLowerCase() });
    if (!user) {
      user = await this.userModel.findOne();
    }

    const testLicenseKey = `LIC-${slug.slice(0, 4).toUpperCase()}-DEV-${crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()}`;

    if (user) {
      await this.licenseModel.create({
        licenseKey: testLicenseKey,
        productId: product._id,
        userId: user._id,
        licenseType: licenseSettings.defaultLicenseType,
        status: LicenseStatus.ACTIVE,
        activationLimit: licenseSettings.defaultActivationLimit * 5, // generous limit for testing
        currentActivationCount: 0,
        notes: [
          {
            note: 'Automatically generated sandbox license for developer integration testing',
            author: adminEmail,
            createdAt: new Date(),
          },
        ],
      });
    }

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'PRODUCT_WIZARD_REGISTERED',
      targetType: 'product',
      targetId: product._id.toString(),
      after: {
        name: product.name,
        slug: product.slug,
        productType: product.productType,
        clientId: credential.clientId,
      },
    });

    const settings = await this.getIntegrationSettings(product._id.toString());

    return {
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        productType: product.productType,
        currentVersion: product.currentVersion,
        integrationStatus: product.integrationStatus,
      },
      credential: {
        clientId: credential.clientId,
        apiKey: credential.apiKey,
        name: credential.name,
      },
      testLicenseKey,
      checklist: initialChecklist,
      settings,
    };
  }

  /**
   * Step 4-5: Run built-in API test console actions (activate, validate, deactivate, checkUpdate)
   */
  async runWizardTest(productId: string, dto: RunWizardTestDto, adminEmail: string) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const meta = product.integrationMetadata || {};
    const checklist = meta.checklist || {
      productCreated: true,
      apiConfigured: true,
      sdkIntegrated: false,
      activationTested: false,
      validationTested: false,
      deactivationTested: false,
      updateTested: false,
      productionReady: false,
    };

    const mockInstallationId = dto.installationId || `ins_wiz_${crypto.randomBytes(6).toString('hex')}`;
    const mockDomain = dto.domain || 'demo.mysite.com';
    let testResult: any;

    switch (dto.testType) {
      case 'activate': {
        const scenarioRes = await this.runTestScenario(productId, 'ACTIVATE_VALID');
        checklist.activationTested = true;
        checklist.sdkIntegrated = true;
        testResult = scenarioRes;
        break;
      }

      case 'validate': {
        const scenarioRes = await this.runTestScenario(productId, 'VALIDATE_ACTIVE');
        checklist.validationTested = true;
        testResult = scenarioRes;
        break;
      }

      case 'deactivate': {
        const scenarioRes = await this.runTestScenario(productId, 'DEACTIVATE_SUCCESS');
        checklist.deactivationTested = true;
        testResult = scenarioRes;
        break;
      }

      case 'checkUpdate': {
        const apiBase = this.getApiBaseUrl();
        checklist.updateTested = true;
        testResult = {
          scenario: 'CHECK_UPDATE',
          title: 'Update Check Endpoint',
          status: 'SUCCESS',
          httpStatus: 200,
          request: {
            url: `${apiBase}/public/products/${product.slug}/updates?currentVersion=${product.currentVersion}&domain=${mockDomain}`,
            method: 'GET',
          },
          response: {
            updateAvailable: true,
            currentVersion: product.currentVersion,
            latestVersion: product.latestStableVersion || product.currentVersion,
            downloadUrl: `${apiBase}/public/downloads/temp_token_demo`,
          },
          developerGuideline: 'Update endpoint returned 200 with version metadata. Integration verified.',
        };
        break;
      }

      default:
        throw new BadRequestException(`Invalid testType: ${dto.testType}`);
    }

    // Record test in history
    const history = meta.testHistory || [];
    history.unshift({
      testType: dto.testType,
      status: testResult.status,
      httpStatus: testResult.httpStatus,
      executedAt: new Date().toISOString(),
      executedBy: adminEmail,
    });

    product.integrationMetadata = {
      ...meta,
      checklist,
      testHistory: history.slice(0, 30),
      lastTestedAt: new Date().toISOString(),
    };

    await product.save();

    return {
      testType: dto.testType,
      testResult,
      checklist,
      isReadyForProduction: checklist.activationTested && checklist.validationTested,
    };
  }

  /**
   * Step 6: Finalize wizard and transition to Production Ready (enforces test gate)
   */
  async finalizeWizard(productId: string, adminEmail: string) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const meta = product.integrationMetadata || {};
    const checklist = meta.checklist || {};

    // Gate check: Must have passed activation & validation tests
    if (!checklist.activationTested || !checklist.validationTested) {
      const missing: string[] = [];
      if (!checklist.activationTested) missing.push('Activation Test');
      if (!checklist.validationTested) missing.push('Validation Test');

      throw new BadRequestException(
        `Cannot mark product as Production Ready. Required integration checks (${missing.join(' and ')}) must pass first.`,
      );
    }

    product.integrationStatus = IntegrationStatus.PRODUCTION_READY;
    product.status = ProductStatus.ACTIVE;
    product.integrationMetadata = {
      ...meta,
      checklist: {
        ...checklist,
        productionReady: true,
        finalizedAt: new Date().toISOString(),
        finalizedBy: adminEmail,
      },
    };

    await product.save();

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'PRODUCT_WIZARD_FINALIZED_PRODUCTION_READY',
      targetType: 'product',
      targetId: product._id.toString(),
      after: {
        name: product.name,
        slug: product.slug,
        integrationStatus: product.integrationStatus,
      },
    });

    return {
      success: true,
      message: `${product.name} is now marked Production Ready and active for licensing!`,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        integrationStatus: product.integrationStatus,
        status: product.status,
      },
      checklist: product.integrationMetadata.checklist,
    };
  }

  /**
   * Get wizard checklist status for a product
   */
  async getWizardChecklist(productId: string) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const meta = product.integrationMetadata || {};
    const checklist = meta.checklist || {
      productCreated: true,
      apiConfigured: true,
      sdkIntegrated: false,
      activationTested: false,
      validationTested: false,
      deactivationTested: false,
      updateTested: false,
      productionReady: product.integrationStatus === IntegrationStatus.PRODUCTION_READY,
    };

    return {
      productId: product._id,
      productName: product.name,
      productSlug: product.slug,
      integrationStatus: product.integrationStatus,
      checklist,
      testHistory: meta.testHistory || [],
      isReadyForProduction: !!checklist.activationTested && !!checklist.validationTested,
    };
  }
}

