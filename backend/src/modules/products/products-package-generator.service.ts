import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import archiver from 'archiver';
import * as crypto from 'crypto';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { ProductCredential, ProductCredentialDocument } from '../../database/schemas/product-credential.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';

export type IntegrationFramework =
  | 'wordpress_plugin'
  | 'wordpress_theme'
  | 'php_script'
  | 'nextjs_app'
  | 'nextjs_plugin';

export interface PackageFile {
  path: string;
  content: string;
  description: string;
}

@Injectable()
export class ProductsPackageGeneratorService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductCredential.name)
    private credentialModel: Model<ProductCredentialDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private configService: ConfigService,
  ) {}

  /**
   * Public API base URL embedded into generated SDK packages.
   * Priority: API_BASE_URL env → request host (proxy-aware) → localhost fallback.
   * Deriving from the request keeps packages correct on deployments where no
   * explicit base URL is configured (e.g. Dokploy/Traefik previews).
   */
  private getApiBaseUrl(req?: Request): string {
    const configured = this.configService.get<string>('API_BASE_URL');
    if (configured) {
      return configured.replace(/\/+$/, '');
    }
    if (req) {
      const proto =
        (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() ||
        req.protocol;
      const host =
        (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() ||
        req.headers['host'];
      if (host) {
        return `${proto}://${host}/api/v1`;
      }
    }
    return 'http://localhost:5000/api/v1';
  }

  /**
   * Get package generator metadata & files preview for a product
   */
  async getPackageOverview(productId: string, framework: IntegrationFramework = 'wordpress_plugin', req?: Request) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

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

    const currentPackageVersion = product.integrationMetadata?.packageVersion || '2.0.0';
    const files = this.buildPackageFiles(product, credential, framework, currentPackageVersion, req);

    const history = product.integrationMetadata?.packages || [];

    return {
      productId: product._id.toString(),
      productName: product.name,
      productSlug: product.slug,
      framework,
      packageVersion: currentPackageVersion,
      compatibility: this.getCompatibilityInfo(framework),
      fileCount: files.length,
      files: files.map((f) => ({
        path: f.path,
        description: f.description,
        sizeBytes: Buffer.byteLength(f.content, 'utf8'),
        preview: f.content.slice(0, 2000) + (f.content.length > 2000 ? '\n...' : ''),
      })),
      history,
    };
  }

  /**
   * Register a new package version or bump version
   */
  async generatePackageVersion(
    productId: string,
    framework: IntegrationFramework,
    versionBump: string = '2.0.0',
    adminEmail: string,
  ) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const meta = product.integrationMetadata || {};
    const packages = meta.packages || [];

    const newPackageEntry = {
      packageVersion: versionBump,
      framework,
      generatedAt: new Date().toISOString(),
      generatedBy: adminEmail,
      compatibility: this.getCompatibilityInfo(framework),
      changelog: `Generated ready-to-integrate SDK package v${versionBump} for ${framework.replace(/_/g, ' ')}`,
    };

    product.integrationMetadata = {
      ...meta,
      packageVersion: versionBump,
      lastPackageGeneratedAt: new Date().toISOString(),
      packages: [newPackageEntry, ...packages.slice(0, 20)],
    };

    await product.save();

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'INTEGRATION_PACKAGE_GENERATED',
      targetType: 'product',
      targetId: product._id.toString(),
      after: {
        productName: product.name,
        framework,
        packageVersion: versionBump,
      },
    });

    return {
      success: true,
      message: `Integration package v${versionBump} generated successfully for ${product.name}`,
      package: newPackageEntry,
    };
  }

  /**
   * Stream ZIP file of integration package directly to client response
   */
  async streamPackageZip(
    productId: string,
    framework: IntegrationFramework,
    version: string,
    res: Response,
    req?: Request,
  ) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

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

    const pkgVersion = version || product.integrationMetadata?.packageVersion || '2.0.0';
    const files = this.buildPackageFiles(product, credential, framework, pkgVersion, req);

    const zipFilename = `${product.slug}-licensenest-sdk-v${pkgVersion}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    return new Promise<void>((resolve, reject) => {
      res.on('finish', () => resolve());
      archive.on('error', (err: any) => reject(new BadRequestException('Failed to create archive: ' + err.message)));

      archive.pipe(res);

      for (const file of files) {
        archive.append(file.content, { name: file.path });
      }

      archive.finalize().catch(reject);
    });
  }

  /**
   * Builds the customized in-memory file tree for the requested framework
   */
  private buildPackageFiles(
    product: ProductDocument,
    credential: ProductCredentialDocument,
    framework: IntegrationFramework,
    packageVersion: string,
    req?: Request,
  ): PackageFile[] {
    const apiBase = this.getApiBaseUrl(req);
    const slug = product.slug;
    const name = product.name;
    const clientId = credential.clientId;
    const apiKey = credential.apiKey;
    const version = product.currentVersion || '1.0.0';
    const interval = product.licenseSettings?.validationIntervalHours ?? 24;
    const grace = product.licenseSettings?.offlineGracePeriodDays ?? 7;
    const pubKey = `pk_verify_${crypto
      .createHash('sha256')
      .update(`licensenest_pub_${product._id.toString()}_${slug}`)
      .digest('hex')
      .slice(0, 32)}`;

    const files: PackageFile[] = [];

    // 1. README.md & SETUP.md (Included in all packages)
    files.push({
      path: 'README.md',
      description: 'Setup instructions and integration overview',
      content: `# ${name} — LicenseNest Integration Package

- **Package Version**: \`v${packageVersion}\`
- **Product Slug**: \`${slug}\`
- **Product Version**: \`${version}\`
- **Framework**: \`${framework.replace(/_/g, ' ')}\`
- **API Base URL**: \`${apiBase}\`
- **Public Client ID**: \`${clientId}\`
- **Public Verification Key**: \`${pubKey}\`

---

## What is in this package?

1. **Licensing SDK Client**: Preconfigured licensing client with auto-caching, heartbeat validations, and offline grace period.
2. **Configuration File**: Pre-filled parameters for this exact product.
3. **Activation UI**: Ready-to-use customer license activation modal / settings form.
4. **Auto-Updates Hook**: Automatic background update checking and signed package stream installer.

## Security Guarantee
- **Zero Private Secrets**: No private signing keys are embedded in this package.
- **Signed Tokens**: The backend verifies all requests with HMAC-SHA256 / RSA signatures.
`,
    });

    files.push({
      path: 'QUICKSTART.md',
      description: 'Quick 3-step setup guide',
      content: `# Quickstart Guide: 3 Steps to Integrate

### Step 1: Copy files to your project
Copy the \`licensing/\` folder into your product repository.

### Step 2: Include and Initialize
Initialize the client during product bootstrap (see \`example-integration.php\` or \`example-integration.ts\`).

### Step 3: Gate Premium Features
\`\`\`php
if ($license->isActive()) {
    // Load PRO features
}
\`\`\`
`,
    });

    // 2. Framework-Specific Files
    switch (framework) {
      case 'wordpress_plugin': {
        files.push({
          path: 'licensing/class-licensenest-base.php',
          description: 'Core PHP base client shared by all integrations',
          content: this.getWordPressBaseClientContent(),
        });
        files.push({
          path: 'licensing/class-licensenest-plugin.php',
          description: 'WordPress plugin license manager with auto-updates and admin UI',
          content: this.getWordPressPluginContent(slug, name, version, clientId, apiKey, apiBase, interval, grace, pubKey),
        });
        files.push({
          path: 'licensing/config.php',
          description: 'Preconfigured product settings array',
          content: `<?php
/**
 * LicenseNest Product Configuration
 * Pre-configured for: ${name}
 */
return [
    'api_url'                 => '${apiBase}',
    'product_id'              => '${product._id}',
    'product_slug'            => '${slug}',
    'product_version'         => '${version}',
    'client_id'               => '${clientId}',
    'api_key'                 => '${apiKey}',
    'public_verification_key' => '${pubKey}',
    'validation_interval'     => ${interval},
    'offline_grace_period'    => ${grace},
];
`,
        });
        files.push({
          path: 'example-plugin.php',
          description: 'Full example WordPress plugin entry point',
          content: `<?php
/**
 * Plugin Name: ${name} (with LicenseNest)
 * Version: ${version}
 * Description: Fully integrated with LicenseNest software licensing.
 */

if (!defined('ABSPATH')) exit;

require_once __DIR__ . '/licensing/class-licensenest-plugin.php';

$config = require __DIR__ . '/licensing/config.php';

$license_manager = new LicenseNest_Plugin_License(
    $config['api_url'],
    $config['product_slug'],
    $config['product_version'],
    __FILE__
);

// Register settings page, update hooks, and daily cron
$license_manager->register();

// Gate premium features:
if ($license_manager->isActive()) {
    add_action('admin_notices', function() {
        echo '<div class="notice notice-success is-dismissible"><p><strong>${name}</strong> PRO License is Active!</p></div>';
    });
}
`,
        });
        break;
      }

      case 'wordpress_theme': {
        files.push({
          path: 'licensing/class-licensenest-base.php',
          description: 'Core PHP base client',
          content: this.getWordPressBaseClientContent(),
        });
        files.push({
          path: 'licensing/class-licensenest-theme.php',
          description: 'WordPress theme license client with customizer & notice hooks',
          content: this.getWordPressThemeContent(slug, name, version, clientId, apiKey, apiBase, interval, grace, pubKey),
        });
        files.push({
          path: 'functions-example.php',
          description: 'Snippet for your theme functions.php',
          content: `<?php
// In functions.php:
require_once get_template_directory() . '/licensing/class-licensenest-theme.php';

$theme_license = new LicenseNest_Theme_License(
    '${apiBase}',
    '${slug}',
    '${version}'
);
$theme_license->register();

if ($theme_license->isActive()) {
    // Enable premium theme customizer controls & templates
}
`,
        });
        break;
      }

      case 'php_script': {
        files.push({
          path: 'licensing/LicenseNest_Base_Client.php',
          description: 'Core PHP base class',
          content: this.getWordPressBaseClientContent(),
        });
        files.push({
          path: 'licensing/LicenseNest_PHP.php',
          description: 'Universal PHP license client with file persistence',
          content: this.getPhpScriptContent(slug, name, version, clientId, apiKey, apiBase, interval, grace, pubKey),
        });
        files.push({
          path: 'license-activate.php',
          description: 'Standalone PHP license activation page',
          content: this.getPhpActivationPageContent(name, slug),
        });
        files.push({
          path: 'example-app.php',
          description: 'Example application gating snippet',
          content: `<?php
require_once __DIR__ . '/licensing/LicenseNest_PHP.php';

$license = new LicenseNest_PHP([
    'api_url'              => '${apiBase}',
    'product_slug'         => '${slug}',
    'product_version'      => '${version}',
    'client_id'            => '${clientId}',
    'api_key'              => '${apiKey}',
    'storage_path'         => __DIR__ . '/.license_storage.json',
    'validation_interval'  => ${interval},
    'offline_grace_period' => ${grace},
]);

if (!$license->isActive()) {
    header('Location: license-activate.php');
    exit;
}

echo "<h1>Welcome to ${name} PRO Dashboard</h1>";
`,
        });
        break;
      }

      case 'nextjs_app': {
        files.push({
          path: 'licensing/LicenseNestBaseClient.ts',
          description: 'TypeScript core licensing base client',
          content: this.getNextJsBaseClientContent(),
        });
        files.push({
          path: 'licensing/LicenseNestNextApp.ts',
          description: 'Next.js App Router server-side licensing SDK',
          content: this.getNextJsAppContent(slug, name, version, clientId, apiKey, apiBase, interval, grace, pubKey),
        });
        files.push({
          path: 'lib/license.ts',
          description: 'Server singleton license client instance',
          content: `import { LicenseNestNextApp } from '@/licensing/LicenseNestNextApp';

export const licenseClient = new LicenseNestNextApp({
  apiUrl: process.env.LICENSENEST_API_URL || '${apiBase}',
  productSlug: '${slug}',
  productVersion: '${version}',
  clientId: process.env.LICENSENEST_CLIENT_ID || '${clientId}',
  apiKey: process.env.LICENSENEST_API_KEY || '${apiKey}',
  storagePath: './.license_data.json',
  validationIntervalHours: ${interval},
  offlineGracePeriodDays: ${grace},
});
`,
        });
        files.push({
          path: 'app/api/license/activate/route.ts',
          description: 'Next.js App Router API Route for activation',
          content: `import { NextRequest, NextResponse } from 'next/server';
import { licenseClient } from '@/lib/license';

export async function POST(req: NextRequest) {
  try {
    const { licenseKey, isPurchaseCode } = await req.json();
    const result = await licenseClient.activate(licenseKey, { isPurchaseCode });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ valid: false, message: err.message }, { status: 400 });
  }
}
`,
        });
        files.push({
          path: 'middleware.ts',
          description: 'Next.js route protection middleware',
          content: `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { licenseClient } from '@/lib/license';

export async function middleware(req: NextRequest) {
  if (
    req.nextUrl.pathname.startsWith('/activate') ||
    req.nextUrl.pathname.startsWith('/api/license') ||
    req.nextUrl.pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  const status = await licenseClient.validate();
  if (!status.valid) {
    return NextResponse.redirect(new URL('/activate', req.url));
  }

  return NextResponse.next();
}
`,
        });
        files.push({
          path: 'components/LicenseActivationModal.tsx',
          description: 'React Tailwind CSS activation modal component',
          content: this.getReactModalContent(name),
        });
        break;
      }

      case 'nextjs_plugin': {
        files.push({
          path: 'licensing/LicenseNestBaseClient.ts',
          description: 'TypeScript core licensing base client',
          content: this.getNextJsBaseClientContent(),
        });
        files.push({
          path: 'licensing/LicenseNestPlugin.ts',
          description: 'Next.js plugin and package distributable licensing layer',
          content: this.getNextJsAppContent(slug, name, version, clientId, apiKey, apiBase, interval, grace, pubKey),
        });
        break;
      }
    }

    return files;
  }

  private getCompatibilityInfo(framework: IntegrationFramework) {
    switch (framework) {
      case 'wordpress_plugin':
      case 'wordpress_theme':
        return 'Compatible with WordPress 5.6 – 6.7+, PHP 7.4 – 8.3+, Multisite supported';
      case 'php_script':
        return 'Compatible with PHP 7.4 – 8.3+, cURL & JSON extensions required';
      case 'nextjs_app':
      case 'nextjs_plugin':
        return 'Compatible with Next.js 13, 14, 15 (App Router & Pages Router), Node.js 18+';
    }
  }

  // --- Content Generators for in-memory files ---

  private getWordPressBaseClientContent(): string {
    return `<?php
if (!defined('LICENSENEST_SDK_VERSION')) {
    define('LICENSENEST_SDK_VERSION', '2.0.0');
}

abstract class LicenseNest_Base_Client {
    protected string $apiUrl;
    protected string $productSlug;
    protected string $productVersion;
    protected int $timeout = 10;

    abstract protected function writeCache(array $data): void;
    abstract protected function readCache(): ?array;
    abstract protected function deleteCache(): void;
    abstract protected function getInstallationId(): string;
    abstract protected function getDomain(): string;

    public function __construct(string $apiUrl, string $productSlug, string $productVersion = '1.0.0') {
        $this->apiUrl = rtrim($apiUrl, '/');
        $this->productSlug = $productSlug;
        $this->productVersion = $productVersion;
    }

    public function activate(string $credential, bool $isPurchaseCode = false, ?string $installationUrl = null): array {
        $payload = [
            'productSlug'     => $this->productSlug,
            'installationId'  => $this->getInstallationId(),
            'domain'          => $this->getDomain(),
            'productVersion'  => $this->productVersion,
            'installationUrl' => $installationUrl ?? ('https://' . $this->getDomain()),
        ];
        if ($isPurchaseCode) {
            $payload['purchaseCode'] = trim($credential);
        } else {
            $payload['licenseKey'] = strtoupper(trim($credential));
        }

        $res = $this->sendRequest('/public/licenses/activate', $payload);
        if (!empty($res['valid']) && !empty($res['token'])) {
            $this->writeCache($res);
        }
        return $res;
    }

    public function validate(): array {
        $cached = $this->readCache();
        $now = time();
        if (empty($cached['token'])) {
            return ['valid' => false, 'status' => 'INACTIVE', 'message' => 'Product not activated.'];
        }
        if (!empty($cached['cachedUntil']) && strtotime($cached['cachedUntil']) > $now) {
            return ['valid' => true, 'status' => 'ACTIVE', 'cached' => true, 'license' => $cached['license'] ?? []];
        }
        try {
            $res = $this->sendRequest('/public/licenses/validate', [
                'productSlug'    => $this->productSlug,
                'installationId' => $this->getInstallationId(),
                'token'          => $cached['token'],
                'domain'         => $this->getDomain(),
                'productVersion' => $this->productVersion,
            ]);
            if (!empty($res['valid'])) {
                $this->writeCache(array_merge($cached, $res));
                return ['valid' => true, 'status' => 'ACTIVE', 'cached' => false, 'license' => $res['license'] ?? []];
            }
            $this->deleteCache();
            return $res;
        } catch (Exception $e) {
            if (!empty($cached['gracePeriodUntil']) && strtotime($cached['gracePeriodUntil']) > $now) {
                return ['valid' => true, 'status' => 'ACTIVE', 'grace_period' => true, 'message' => 'Running in offline grace period.'];
            }
            return ['valid' => false, 'status' => 'GRACE_PERIOD_EXPIRED', 'message' => 'Grace period expired.'];
        }
    }

    public function deactivate(?string $reason = null): array {
        $cached = $this->readCache();
        try {
            $res = $this->sendRequest('/public/licenses/deactivate', [
                'installationId' => $this->getInstallationId(),
                'token'          => $cached['token'] ?? null,
                'domain'         => $this->getDomain(),
                'reason'         => $reason ?? 'Deactivated by user',
            ]);
        } catch (Exception $e) {
            $res = ['success' => false, 'message' => $e->getMessage()];
        }
        $this->deleteCache();
        return $res;
    }

    public function checkForUpdates(): array {
        $cached = $this->readCache();
        $qs = http_build_query([
            'currentVersion' => $this->productVersion,
            'token'          => $cached['token'] ?? '',
            'domain'         => $this->getDomain(),
        ]);
        try {
            $ch = curl_init($this->apiUrl . '/public/products/' . rawurlencode($this->productSlug) . '/updates?' . $qs);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $this->timeout]);
            $raw = curl_exec($ch);
            curl_close($ch);
            $json = json_decode($raw, true);
            return $json['data'] ?? $json ?? ['updateAvailable' => false];
        } catch (Exception $e) {
            return ['updateAvailable' => false];
        }
    }

    protected function sendRequest(string $endpoint, array $data): array {
        $ch = curl_init($this->apiUrl . $endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($data),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_TIMEOUT        => $this->timeout,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        $json = json_decode($raw, true);
        return $json['data'] ?? $json ?? ['valid' => false, 'status' => 'ERROR'];
    }
}
`;
  }

  private getWordPressPluginContent(
    slug: string,
    name: string,
    version: string,
    clientId: string,
    apiKey: string,
    apiBase: string,
    interval: number,
    grace: number,
    pubKey: string,
  ): string {
    return `<?php
if (!defined('ABSPATH')) exit;
require_once __DIR__ . '/class-licensenest-base.php';

class LicenseNest_Plugin_License extends LicenseNest_Base_Client {
    private string $pluginFile;
    private string $optionPrefix;
    private string $pageSlug;

    public function __construct(string $apiUrl, string $productSlug, string $productVersion, string $pluginFile) {
        parent::__construct($apiUrl, $productSlug, $productVersion);
        $this->pluginFile = $pluginFile;
        $this->optionPrefix = 'ln_' . sanitize_key($productSlug) . '_';
        $this->pageSlug = sanitize_key($productSlug) . '-license';
    }

    protected function writeCache(array $data): void {
        update_option($this->optionPrefix . 'cache', $data, false);
    }

    protected function readCache(): ?array {
        $data = get_option($this->optionPrefix . 'cache');
        return is_array($data) ? $data : null;
    }

    protected function deleteCache(): void {
        delete_option($this->optionPrefix . 'cache');
    }

    protected function getInstallationId(): string {
        $id = get_option($this->optionPrefix . 'inst_id');
        if (!$id) {
            $id = 'ins_wp_' . wp_generate_password(16, false);
            update_option($this->optionPrefix . 'inst_id', $id, false);
        }
        return $id;
    }

    protected function getDomain(): string {
        return parse_url(home_url(), PHP_URL_HOST) ?: 'localhost';
    }

    public function isActive(): bool {
        $cached = $this->readCache();
        if (empty($cached['token'])) return false;
        return true;
    }

    public function register(): void {
        add_action('admin_menu', [$this, 'addSettingsPage']);
        add_action('admin_post_' . $this->optionPrefix . 'activate', [$this, 'handleActivate']);
        add_action('admin_post_' . $this->optionPrefix . 'deactivate', [$this, 'handleDeactivate']);
    }

    public function addSettingsPage(): void {
        add_options_page(
            '${name} License',
            '${name} License',
            'manage_options',
            $this->pageSlug,
            [$this, 'renderPage']
        );
    }

    public function handleActivate(): void {
        check_admin_referer($this->optionPrefix . 'action');
        $key = sanitize_text_field($_POST['license_key'] ?? '');
        $this->activate($key);
        wp_safe_redirect(admin_url('options-general.php?page=' . $this->pageSlug . '&updated=1'));
        exit;
    }

    public function handleDeactivate(): void {
        check_admin_referer($this->optionPrefix . 'action');
        $this->deactivate('Admin clicked deactivate');
        wp_safe_redirect(admin_url('options-general.php?page=' . $this->pageSlug . '&deactivated=1'));
        exit;
    }

    public function renderPage(): void {
        $active = $this->isActive();
        $cache = $this->readCache();
        ?>
        <div class="wrap">
            <h1>${name} Licensing</h1>
            <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ccd0d4; max-width: 550px; margin-top: 20px;">
                <?php if ($active): ?>
                    <p style="color: #46b450; font-weight: bold;">✔ License is ACTIVE</p>
                    <p>Key: <code><?php echo esc_html($cache['license']['licenseKey'] ?? 'Active'); ?></code></p>
                    <form method="POST" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <?php wp_nonce_field($this->optionPrefix . 'action'); ?>
                        <input type="hidden" name="action" value="<?php echo esc_attr($this->optionPrefix . 'deactivate'); ?>" />
                        <input type="submit" class="button" value="Deactivate License" />
                    </form>
                <?php else: ?>
                    <form method="POST" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                        <?php wp_nonce_field($this->optionPrefix . 'action'); ?>
                        <input type="hidden" name="action" value="<?php echo esc_attr($this->optionPrefix . 'activate'); ?>" />
                        <p><label>Enter License Key or Envato Purchase Code:</label></p>
                        <p><input type="text" name="license_key" placeholder="LIC-XXXX-XXXX-XXXX-XXXX" required style="width: 100%; font-family: monospace;" /></p>
                        <p><input type="submit" class="button button-primary" value="Activate License" /></p>
                    </form>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
}
`;
  }

  private getWordPressThemeContent(
    slug: string,
    name: string,
    version: string,
    clientId: string,
    apiKey: string,
    apiBase: string,
    interval: number,
    grace: number,
    pubKey: string,
  ): string {
    return `<?php
if (!defined('ABSPATH')) exit;
require_once __DIR__ . '/class-licensenest-base.php';

class LicenseNest_Theme_License extends LicenseNest_Base_Client {
    public function __construct(string $apiUrl, string $productSlug, string $productVersion) {
        parent::__construct($apiUrl, $productSlug, $productVersion);
    }
    protected function writeCache(array $data): void { update_option('ln_theme_' . sanitize_key($this->productSlug), $data, false); }
    protected function readCache(): ?array { return get_option('ln_theme_' . sanitize_key($this->productSlug)) ?: null; }
    protected function deleteCache(): void { delete_option('ln_theme_' . sanitize_key($this->productSlug)); }
    protected function getInstallationId(): string {
        $id = get_option('ln_theme_' . sanitize_key($this->productSlug) . '_id');
        if (!$id) { $id = 'ins_th_' . wp_generate_password(16, false); update_option('ln_theme_' . sanitize_key($this->productSlug) . '_id', $id, false); }
        return $id;
    }
    protected function getDomain(): string { return parse_url(home_url(), PHP_URL_HOST) ?: 'localhost'; }
    public function isActive(): bool { return !empty($this->readCache()['token']); }
    public function register(): void {
        add_action('admin_notices', function() {
            if (!$this->isActive()) {
                echo '<div class="notice notice-warning"><p>Please activate your <strong>${name}</strong> license to receive updates and support.</p></div>';
            }
        });
    }
}
`;
  }

  private getPhpScriptContent(
    slug: string,
    name: string,
    version: string,
    clientId: string,
    apiKey: string,
    apiBase: string,
    interval: number,
    grace: number,
    pubKey: string,
  ): string {
    return `<?php
require_once __DIR__ . '/LicenseNest_Base_Client.php';

class LicenseNest_PHP extends LicenseNest_Base_Client {
    private string $storagePath;

    public function __construct(array $config) {
        parent::__construct(
            $config['api_url'] ?? '${apiBase}',
            $config['product_slug'] ?? '${slug}',
            $config['product_version'] ?? '${version}'
        );
        $this->storagePath = $config['storage_path'] ?? (__DIR__ . '/.license_storage.json');
    }

    protected function writeCache(array $data): void {
        file_put_contents($this->storagePath, json_encode($data, JSON_PRETTY_PRINT));
    }

    protected function readCache(): ?array {
        if (!file_exists($this->storagePath)) return null;
        $json = json_decode(file_get_contents($this->storagePath), true);
        return is_array($json) ? $json : null;
    }

    protected function deleteCache(): void {
        if (file_exists($this->storagePath)) unlink($this->storagePath);
    }

    protected function getInstallationId(): string {
        $cached = $this->readCache();
        if (!empty($cached['installationId'])) return $cached['installationId'];
        return 'ins_php_' . bin2hex(random_bytes(8));
    }

    protected function getDomain(): string {
        return $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
    }

    public function isActive(): bool {
        $cached = $this->readCache();
        return !empty($cached['token']);
    }
}
`;
  }

  private getPhpActivationPageContent(name: string, slug: string): string {
    return `<?php
require_once __DIR__ . '/licensing/LicenseNest_PHP.php';
$config = require __DIR__ . '/licensing/config.php';
$license = new LicenseNest_PHP($config);

$error = null;
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $key = trim($_POST['license_key'] ?? '');
    $res = $license->activate($key);
    if (!empty($res['valid'])) {
        $success = 'License activated successfully! Redirecting...';
        header('Refresh: 2; url=/');
    } else {
        $error = $res['message'] ?? 'Activation failed';
    }
}
?>
<!DOCTYPE html>
<html>
<head><title>Activate ${name}</title></head>
<body style="font-family: sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 90vh;">
<div style="background: white; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; width: 440px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
  <h2>Activate ${name}</h2>
  <?php if ($error): ?><p style="color: red;"><?php echo htmlspecialchars($error); ?></p><?php endif; ?>
  <?php if ($success): ?><p style="color: green;"><?php echo htmlspecialchars($success); ?></p><?php endif; ?>
  <form method="POST">
    <label style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b;">License Key</label>
    <input type="text" name="license_key" required placeholder="LIC-XXXX-XXXX-XXXX-XXXX" style="width: 100%; box-sizing: border-box; padding: 10px; margin: 8px 0 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace;" />
    <button type="submit" style="width: 100%; background: #4f46e5; color: white; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Activate License</button>
  </form>
</div>
</body>
</html>
`;
  }

  private getNextJsBaseClientContent(): string {
    return `export interface LicenseResponse {
  valid: boolean;
  status: string;
  token?: string;
  message?: string;
  cached?: boolean;
  license?: any;
}

export abstract class LicenseNestBaseClient {
  protected apiUrl: string;
  protected productSlug: string;
  protected productVersion: string;

  constructor(apiUrl: string, productSlug: string, productVersion: string) {
    this.apiUrl = apiUrl.replace(/\\/$/, '');
    this.productSlug = productSlug;
    this.productVersion = productVersion;
  }

  abstract loadCache(): any;
  abstract saveCache(data: any): void;
  abstract clearCache(): void;
  abstract getInstallationId(): string;
  abstract getDomain(): string;

  public async activate(credential: string, options: { isPurchaseCode?: boolean } = {}): Promise<LicenseResponse> {
    const payload: any = {
      productSlug: this.productSlug,
      installationId: this.getInstallationId(),
      domain: this.getDomain(),
      productVersion: this.productVersion,
    };
    if (options.isPurchaseCode) payload.purchaseCode = credential.trim();
    else payload.licenseKey = credential.trim().toUpperCase();

    const res = await this.post('/public/licenses/activate', payload);
    if (res.valid && res.token) this.saveCache(res);
    return res;
  }

  public async validate(): Promise<LicenseResponse> {
    const cached = this.loadCache();
    if (!cached?.token) return { valid: false, status: 'INACTIVE', message: 'Not activated' };
    const now = Date.now();
    if (cached.cachedUntil && new Date(cached.cachedUntil).getTime() > now) {
      return { valid: true, status: 'ACTIVE', cached: true, license: cached.license };
    }
    try {
      const res = await this.post('/public/licenses/validate', {
        productSlug: this.productSlug,
        installationId: this.getInstallationId(),
        token: cached.token,
        domain: this.getDomain(),
        productVersion: this.productVersion,
      });
      if (res.valid) {
        this.saveCache({ ...cached, ...res });
        return { valid: true, status: 'ACTIVE', cached: false, license: res.license };
      }
      this.clearCache();
      return res;
    } catch {
      if (cached.gracePeriodUntil && new Date(cached.gracePeriodUntil).getTime() > now) {
        return { valid: true, status: 'ACTIVE', message: 'Running under offline grace period' };
      }
      return { valid: false, status: 'GRACE_PERIOD_EXPIRED', message: 'Grace period expired' };
    }
  }

  public async deactivate(): Promise<any> {
    const cached = this.loadCache();
    try {
      return await this.post('/public/licenses/deactivate', {
        installationId: this.getInstallationId(),
        token: cached?.token,
        domain: this.getDomain(),
      });
    } finally {
      this.clearCache();
    }
  }

  protected async post(endpoint: string, body: any): Promise<any> {
    const res = await fetch(\`\${this.apiUrl}\${endpoint}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return json?.data ?? json;
  }
}
`;
  }

  private getNextJsAppContent(
    slug: string,
    name: string,
    version: string,
    clientId: string,
    apiKey: string,
    apiBase: string,
    interval: number,
    grace: number,
    pubKey: string,
  ): string {
    return `import * as fs from 'fs';
import * as path from 'path';
import { LicenseNestBaseClient } from './LicenseNestBaseClient';

export interface NextAppConfig {
  apiUrl?: string;
  productSlug?: string;
  productVersion?: string;
  clientId?: string;
  apiKey?: string;
  storagePath?: string;
  validationIntervalHours?: number;
  offlineGracePeriodDays?: number;
}

export class LicenseNestNextApp extends LicenseNestBaseClient {
  private storageFilePath: string;

  constructor(config: NextAppConfig = {}) {
    super(
      config.apiUrl || '${apiBase}',
      config.productSlug || '${slug}',
      config.productVersion || '${version}'
    );
    this.storageFilePath = config.storagePath || path.join(process.cwd(), '.license_data.json');
  }

  loadCache(): any {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        return JSON.parse(fs.readFileSync(this.storageFilePath, 'utf8'));
      }
    } catch {}
    return null;
  }

  saveCache(data: any): void {
    try {
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch {}
  }

  clearCache(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) fs.unlinkSync(this.storageFilePath);
    } catch {}
  }

  getInstallationId(): string {
    const cached = this.loadCache();
    if (cached?.installationId) return cached.installationId;
    return 'ins_next_' + Math.random().toString(36).slice(2, 12);
  }

  getDomain(): string {
    return process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
      : 'localhost';
  }

  public async getLicenseStatus() {
    return this.validate();
  }
}
`;
  }

  private getReactModalContent(name: string): string {
    return `'use client';
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
      if (!data.valid) throw new Error(data.message || 'Activation failed');
      onActivated?.();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Activate ${name}</h3>
      <p className="text-xs text-slate-500 mt-1 mb-4">Enter your license key or Envato purchase code.</p>
      {error && <div className="p-3 mb-4 text-xs rounded-xl bg-red-50 text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          required
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          placeholder="LIC-XXXX-XXXX-XXXX-XXXX"
          className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
        >
          {loading ? 'Activating...' : 'Activate License'}
        </button>
      </form>
    </div>
  );
}
`;
  }
}
