import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { License, LicenseDocument } from '../../database/schemas/license.schema';
import { Activation, ActivationDocument } from '../../database/schemas/activation.schema';
import { ProductCredential, ProductCredentialDocument } from '../../database/schemas/product-credential.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { TokenService } from '../token/token.service';
import {
  LicenseStatus,
  LicenseType,
  ActivationStatus,
  EnvironmentType,
  MarketplaceProviderType,
} from '../../common/enums/app.enums';

export type SandboxScenarioType =
  | 'valid'
  | 'expired'
  | 'revoked'
  | 'suspended'
  | 'limit1'
  | 'envato';

@Injectable()
export class ProductsSandboxService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name) private activationModel: Model<ActivationDocument>,
    @InjectModel(ProductCredential.name)
    private credentialModel: Model<ProductCredentialDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private tokenService: TokenService,
    private configService: ConfigService,
  ) {}

  private getApiBaseUrl(): string {
    return (
      this.configService.get<string>('API_BASE_URL') ||
      'http://localhost:5000/api/v1'
    );
  }

  /**
   * Get or create dedicated sandbox API credentials for a product
   */
  async getOrCreateSandboxCredential(product: any): Promise<any> {
    let cred: any = await this.credentialModel.findOne({
      productId: product._id,
      environment: 'sandbox',
      status: 'active',
    });

    if (!cred) {
      const clientId = 'client_test_' + crypto.randomBytes(12).toString('hex');
      const apiKey = 'pk_test_' + crypto.randomBytes(24).toString('hex');
      cred = await this.credentialModel.create({
        productId: product._id,
        clientId,
        apiKey,
        name: `${product.name} Sandbox Test Key`,
        scopes: ['activate', 'validate', 'update', 'download'],
        environment: 'sandbox',
        isSandbox: true,
        status: 'active',
      });
    }

    return cred;
  }

  /**
   * Get sandbox environment overview, credentials, scenario keys, and active test installations
   */
  async getSandboxOverview(productId: string) {
    const product: any = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sandboxCred = await this.getOrCreateSandboxCredential(product);
    const apiBase = this.getApiBaseUrl();

    // Ensure pre-generated scenario keys exist
    const scenarios = await this.ensureScenarioLicenses(product);

    // Fetch active sandbox activations
    const sandboxActivations: any[] = await this.activationModel
      .find({
        productId: product._id,
        isSandbox: true,
      })
      .sort({ createdAt: -1 })
      .limit(50);

    const totalSandboxLicenses = await this.licenseModel.countDocuments({
      productId: product._id,
      isSandbox: true,
    });

    const pubKey = `pk_test_verify_${crypto
      .createHash('sha256')
      .update(`licensenest_sandbox_pub_${product._id.toString()}_${product.slug}`)
      .digest('hex')
      .slice(0, 32)}`;

    return {
      environment: 'sandbox',
      productId: product._id.toString(),
      productName: product.name,
      productSlug: product.slug,
      currentVersion: product.currentVersion || '1.0.0',
      credentials: {
        clientId: sandboxCred.clientId,
        apiKey: sandboxCred.apiKey,
        publicVerificationKey: pubKey,
        status: sandboxCred.status,
        environment: 'sandbox',
      },
      endpoints: {
        activateUrl: `${apiBase}/public/sandbox/licenses/activate`,
        validateUrl: `${apiBase}/public/sandbox/licenses/validate`,
        deactivateUrl: `${apiBase}/public/sandbox/licenses/deactivate`,
        updateCheckUrl: `${apiBase}/public/sandbox/products/${product.slug}/updates`,
        downloadUrl: `${apiBase}/public/sandbox/products/${product.slug}/download`,
      },
      scenarios,
      stats: {
        totalSandboxLicenses,
        activeSandboxActivations: sandboxActivations.length,
      },
      activations: sandboxActivations.map((a) => ({
        activationId: a.activationId,
        installationId: a.installationId,
        domain: a.domain,
        status: a.status,
        environment: a.environment,
        activatedAt: a.activatedAt,
        lastValidatedAt: a.lastValidatedAt,
      })),
    };
  }

  /**
   * Generates or retrieves standard test scenario licenses for sandbox testing
   */
  async ensureScenarioLicenses(product: any) {
    let user = await this.userModel.findOne();
    const userId = user ? user._id : new Types.ObjectId();
    const prodSuffix = product._id.toString().slice(-6).toUpperCase();

    const scenarios = [
      {
        type: 'valid' as SandboxScenarioType,
        title: 'Valid Active License (5 Slots)',
        key: `TEST-VALID-${prodSuffix}-AAAA-1111`,
        status: LicenseStatus.ACTIVE,
        activationLimit: 5,
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        description: 'Simulates normal customer license with 5 available domain activations.',
      },
      {
        type: 'expired' as SandboxScenarioType,
        title: 'Expired License',
        key: `TEST-EXPIRED-${prodSuffix}-BBBB-2222`,
        status: LicenseStatus.EXPIRED,
        activationLimit: 1,
        expiresAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        description: 'Simulates an expired license/subscription where renewal is required.',
      },
      {
        type: 'revoked' as SandboxScenarioType,
        title: 'Revoked / Refunded License',
        key: `TEST-REVOKED-${prodSuffix}-CCCC-3333`,
        status: LicenseStatus.REVOKED,
        activationLimit: 1,
        expiresAt: undefined,
        description: 'Simulates a permanently revoked license due to chargeback or fraud.',
      },
      {
        type: 'suspended' as SandboxScenarioType,
        title: 'Suspended License',
        key: `TEST-SUSPEND-${prodSuffix}-DDDD-4444`,
        status: LicenseStatus.SUSPENDED,
        activationLimit: 1,
        expiresAt: undefined,
        description: 'Simulates a temporarily suspended license under review.',
      },
      {
        type: 'limit1' as SandboxScenarioType,
        title: 'Single-Site Limit (1 Slot Max)',
        key: `TEST-LIMIT1-${prodSuffix}-EEEE-5555`,
        status: LicenseStatus.ACTIVE,
        activationLimit: 1,
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        description: 'Simulates a 1-domain quota to test limit-exceeded rejection.',
      },
      {
        type: 'envato' as SandboxScenarioType,
        title: 'Envato Purchase Code (Test Claim)',
        key: `TEST-ENVATO-${prodSuffix}-9999`,
        status: LicenseStatus.ACTIVE,
        activationLimit: 1,
        source: MarketplaceProviderType.ENVATO,
        expiresAt: undefined,
        description: 'Simulates an Envato CodeCanyon/ThemeForest item purchase code import.',
      },
    ];

    const scenarioResults: any[] = [];

    for (const sc of scenarios) {
      let lic: any = await this.licenseModel.findOne({
        licenseKey: sc.key,
      });

      if (!lic) {
        lic = await this.licenseModel.create({
          licenseKey: sc.key,
          productId: product._id,
          userId,
          licenseType: LicenseType.SINGLE_SITE,
          status: sc.status,
          activationLimit: sc.activationLimit,
          currentActivationCount: 0,
          expiresAt: sc.expiresAt,
          source: sc.source || MarketplaceProviderType.INTERNAL,
          isSandbox: true,
          notes: [{ note: `Auto-generated sandbox scenario: ${sc.title}`, author: 'Sandbox Engine', createdAt: new Date() }],
        });
      }

      scenarioResults.push({
        type: sc.type,
        title: sc.title,
        key: lic.licenseKey,
        status: lic.status,
        activationLimit: lic.activationLimit,
        currentActivationCount: lic.currentActivationCount,
        expiresAt: lic.expiresAt,
        description: sc.description,
      });
    }

    return scenarioResults;
  }

  /**
   * Reset all sandbox activations and test licenses for this product
   */
  async resetSandboxData(productId: string, adminEmail: string) {
    const product: any = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Delete all sandbox activations for this product
    const actRes = await this.activationModel.deleteMany({
      productId: product._id,
      isSandbox: true,
    });

    // Reset activation count on all sandbox licenses for this product
    await this.licenseModel.updateMany(
      { productId: product._id, isSandbox: true },
      { $set: { currentActivationCount: 0 } },
    );

    // Re-verify standard scenario keys exist
    const scenarios = await this.ensureScenarioLicenses(product);

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'SANDBOX_DATA_RESET',
      targetType: 'product',
      targetId: product._id.toString(),
      after: {
        productName: product.name,
        activationsCleared: actRes.deletedCount,
      },
    });

    return {
      success: true,
      message: `Sandbox test data and activations successfully reset for ${product.name}.`,
      activationsCleared: actRes.deletedCount,
      scenarios,
    };
  }

  /**
   * Process Public Sandbox Activation Request
   */
  async processSandboxActivate(dto: {
    licenseKey?: string;
    purchaseCode?: string;
    productSlug: string;
    installationId: string;
    domain: string;
    productVersion?: string;
  }) {
    const key = (dto.licenseKey || dto.purchaseCode || '').trim().toUpperCase();
    if (!key) {
      throw new BadRequestException('License key or purchase code is required');
    }

    const product = await this.productModel.findOne({ slug: dto.productSlug });
    if (!product) {
      throw new NotFoundException(`Product with slug "${dto.productSlug}" not found`);
    }

    // STRICT ISOLATION: Only look up sandbox licenses
    const license = await this.licenseModel.findOne({
      licenseKey: key,
      productId: product._id,
      isSandbox: true,
    });

    if (!license) {
      throw new BadRequestException({
        valid: false,
        code: 'INVALID_LICENSE_KEY',
        message: 'Invalid sandbox license key or purchase code. Ensure you are using a sandbox key (e.g. TEST-VALID-...).',
      });
    }

    // Status checks
    if (license.status === LicenseStatus.REVOKED) {
      throw new BadRequestException({
        valid: false,
        code: 'LICENSE_REVOKED',
        message: 'This sandbox license has been permanently revoked.',
      });
    }
    if (license.status === LicenseStatus.SUSPENDED) {
      throw new BadRequestException({
        valid: false,
        code: 'LICENSE_SUSPENDED',
        message: 'This sandbox license is temporarily suspended.',
      });
    }
    if (license.status === LicenseStatus.EXPIRED || (license.expiresAt && new Date(license.expiresAt) < new Date())) {
      throw new BadRequestException({
        valid: false,
        code: 'LICENSE_EXPIRED',
        message: 'This sandbox license has expired.',
      });
    }

    // Idempotency: Check if already activated
    let activation: any = await this.activationModel.findOne({
      licenseId: license._id,
      installationId: dto.installationId,
      domain: dto.domain,
      isSandbox: true,
    });

    if (!activation) {
      // Limit check
      if (license.currentActivationCount >= license.activationLimit) {
        throw new BadRequestException({
          valid: false,
          code: 'ACTIVATION_LIMIT_REACHED',
          message: `Sandbox activation limit reached (${license.currentActivationCount}/${license.activationLimit}).`,
        });
      }

      const actId = 'ACT-SANDBOX-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      activation = await this.activationModel.create({
        activationId: actId,
        licenseId: license._id,
        productId: product._id,
        userId: license.userId,
        installationId: dto.installationId,
        domain: dto.domain,
        normalizedDomain: dto.domain.toLowerCase().trim(),
        status: ActivationStatus.ACTIVE,
        environment: EnvironmentType.TEST,
        isSandbox: true,
      });

      license.currentActivationCount += 1;
      await license.save();
    }

    const signRes = this.tokenService.signActivationToken({
      activationId: activation.activationId,
      licenseId: license._id.toString(),
      productId: product._id.toString(),
      productSlug: product.slug,
      installationId: dto.installationId,
      domain: dto.domain,
      environment: 'sandbox',
    });

    return {
      valid: true,
      status: 'ACTIVE',
      token: signRes.token,
      environment: 'sandbox',
      isSandbox: true,
      cachedUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      license: {
        licenseKey: license.licenseKey,
        productName: product.name,
        productSlug: product.slug,
        licenseType: license.licenseType,
        activationLimit: license.activationLimit,
        activationsCount: license.currentActivationCount,
        expiresAt: license.expiresAt,
      },
    };
  }

  /**
   * Process Public Sandbox Validation Heartbeat
   */
  async processSandboxValidate(dto: {
    token: string;
    productSlug: string;
    installationId: string;
    domain: string;
  }) {
    try {
      const payload = this.tokenService.verifyActivationToken(dto.token);

      if (payload.environment !== 'sandbox') {
        throw new BadRequestException('Invalid sandbox token environment');
      }

      if (dto.domain && payload.domain !== dto.domain) {
        throw new BadRequestException({
          valid: false,
          code: 'DOMAIN_MISMATCH',
          message: 'Token domain does not match request domain',
        });
      }

      const license = await this.licenseModel.findOne({
        _id: payload.licenseId,
        isSandbox: true,
      });

      if (!license || license.status !== LicenseStatus.ACTIVE) {
        throw new BadRequestException({
          valid: false,
          code: 'LICENSE_INACTIVE',
          message: 'Sandbox license is inactive or expired',
        });
      }

      return {
        valid: true,
        status: 'ACTIVE',
        cachedUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        environment: 'sandbox',
        isSandbox: true,
      };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Sandbox validation failed');
    }
  }

  /**
   * Process Public Sandbox Deactivation
   */
  async processSandboxDeactivate(dto: {
    token?: string;
    installationId: string;
    domain?: string;
    reason?: string;
  }) {
    const act = await this.activationModel.findOne({
      installationId: dto.installationId,
      isSandbox: true,
    });

    if (act) {
      const license = await this.licenseModel.findById(act.licenseId);
      if (license && license.currentActivationCount > 0) {
        license.currentActivationCount -= 1;
        await license.save();
      }
      await this.activationModel.deleteOne({ _id: act._id });
    }

    return {
      success: true,
      message: 'Sandbox installation deactivated and slot released successfully.',
      isSandbox: true,
    };
  }
}
