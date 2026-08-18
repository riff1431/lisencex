import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import {
  Installation,
  InstallationDocument,
} from '../../database/schemas/installation.schema';
import {
  ActivationToken,
  ActivationTokenDocument,
} from '../../database/schemas/activation-token.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  Purchase,
  PurchaseDocument,
} from '../../database/schemas/purchase.schema';
import {
  ValidationLog,
  ValidationLogDocument,
} from '../../database/schemas/validation-log.schema';
import {
  BlockedEntity,
  BlockedEntityDocument,
  BlockedEntityType,
} from '../../database/schemas/blocked-entity.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import { TokenService } from '../token/token.service';
import { DomainNormalizer } from '../../common/utils/domain-normalizer.util';
import {
  LicenseStatus,
  ActivationStatus,
  EnvironmentType,
  ProductStatus,
} from '../../common/enums/app.enums';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationSeverity,
} from '../../common/enums/app.enums';
import {
  ActivateLicenseDto,
  ValidateLicenseDto,
  DeactivateLicenseDto,
  TransferActivationDto,
} from './dto/activation.dto';

@Injectable()
export class ActivationsService {
  private readonly logger = new Logger(ActivationsService.name);

  constructor(
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
    @InjectModel(Installation.name)
    private installationModel: Model<InstallationDocument>,
    @InjectModel(ActivationToken.name)
    private tokenModel: Model<ActivationTokenDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(ValidationLog.name)
    private validationLogModel: Model<ValidationLogDocument>,
    @InjectModel(BlockedEntity.name)
    private blockedModel: Model<BlockedEntityDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private tokenService: TokenService,
    private notificationsService: NotificationsService,
  ) {}

  generateActivationId(): string {
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `ACT-${raw}`;
  }

  resolveEffectiveSettings(product: any, license?: any) {
    const resolvedPlan = license?.licensePlanId; // populated plan object
    const overrides = product?.licenseSettingsOverrides || {};
    const productSettings = product?.licenseSettings || {};

    const resolveField = (key: string, defaultValue: any) => {
      if (overrides[key] !== undefined && overrides[key] !== null) {
        return overrides[key];
      }
      if (
        resolvedPlan &&
        resolvedPlan[key] !== undefined &&
        resolvedPlan[key] !== null
      ) {
        return resolvedPlan[key];
      }
      if (productSettings[key] !== undefined && productSettings[key] !== null) {
        return productSettings[key];
      }
      return defaultValue;
    };

    return {
      allowLocalhost: resolveField('allowLocalhost', true),
      countLocalhost: resolveField('countLocalhost', false),
      allowStaging: resolveField('allowStaging', true),
      countStaging: resolveField('countStaging', false),
      allowDeactivation: resolveField('allowDeactivation', true),
      deactivationCooldownHours: resolveField('deactivationCooldownHours', 0),
      periodicValidation: resolveField('periodicValidation', true),
      validationIntervalHours: resolveField('validationIntervalHours', 24),
      offlineGracePeriodDays: resolveField('offlineGracePeriodDays', 7),
      downloadsEnabled: resolveField('downloadsEnabled', true),
      automaticUpdatesEnabled: resolveField('automaticUpdatesEnabled', true),
      blockValidationOnExpiry: resolveField('blockValidationOnExpiry', true),
      blockUpdatesOnExpiry: resolveField('blockUpdatesOnExpiry', true),
      blockDownloadsOnExpiry: resolveField('blockDownloadsOnExpiry', true),
      blockSupportOnExpiry: resolveField('blockSupportOnExpiry', true),
      blockActivationsOnExpiry: resolveField('blockActivationsOnExpiry', true),
      reminderThresholdDays: resolveField('reminderThresholdDays', 30),
      recoveryEnabled: resolveField('recoveryEnabled', true),
      autoApproveRecovery: resolveField('autoApproveRecovery', true),
      recoveryLimit: resolveField('recoveryLimit', 3),
      recoveryCooldownHours: resolveField('recoveryCooldownHours', 720),
    };
  }

  computeHealthStatus(activation: any, product: any, license: any) {
    if (
      activation.status === ActivationStatus.REVOKED ||
      activation.status === ActivationStatus.DEACTIVATED
    ) {
      return { health: 'Revoked', flagged: false };
    }
    if (license?.status === LicenseStatus.REVOKED) {
      return { health: 'Revoked', flagged: false };
    }

    if (activation.status === ActivationStatus.SUSPENDED) {
      return { health: 'Suspended', flagged: false };
    }
    if (
      license?.status === LicenseStatus.SUSPENDED ||
      license?.status === LicenseStatus.BLOCKED
    ) {
      return { health: 'Suspended', flagged: false };
    }

    const settings = this.resolveEffectiveSettings(product, license);
    const intervalMs = (settings.validationIntervalHours || 24) * 3600 * 1000;
    const graceMs = (settings.offlineGracePeriodDays || 7) * 24 * 3600 * 1000;

    const lastValidated = activation.lastValidatedAt
      ? new Date(activation.lastValidatedAt).getTime()
      : 0;
    const now = Date.now();
    const timeSinceValidation = now - lastValidated;

    let health = 'Healthy';
    let flagged = false;

    if (timeSinceValidation > intervalMs + graceMs) {
      health = 'Offline';
      flagged = true;
    } else if (timeSinceValidation > intervalMs) {
      health = 'Validation Overdue';
      flagged = true;
    }

    const isProductOutdated =
      product &&
      product.currentVersion &&
      activation.productVersion &&
      activation.productVersion !== product.currentVersion;

    const latestSdkVersions: Record<string, string> = {
      typescript: '1.0.0',
      wordpress: '1.0.0',
      php: '1.0.0',
    };
    const latestSdk = latestSdkVersions[activation.sdkType] || '1.0.0';
    const isSdkOutdated =
      activation.sdkVersion && activation.sdkVersion !== latestSdk;

    if (health === 'Healthy' && (isProductOutdated || isSdkOutdated)) {
      health = 'Outdated';
    }

    return {
      health,
      flagged,
      isProductOutdated: Boolean(isProductOutdated),
      isSdkOutdated: Boolean(isSdkOutdated),
      latestSdkVersion: latestSdk,
    };
  }

  async activate(
    dto: ActivateLicenseDto,
    clientIp?: string,
    userAgent?: string,
  ) {
    const slug = dto.productSlug.toLowerCase().trim();
    const product = await this.productModel.findOne({
      slug,
      isArchived: false,
    });
    if (!product) {
      throw new NotFoundException({
        code: ErrorCode.PRODUCT_NOT_FOUND,
        message: `Product with slug "${dto.productSlug}" not found`,
      });
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException({
        code: ErrorCode.PRODUCT_DISABLED,
        message: `Product is currently ${product.status}`,
      });
    }

    if (
      product.emergencyKillSwitch?.disableNewActivations ||
      product.emergencyKillSwitch?.isProductSuspended
    ) {
      throw new BadRequestException({
        code: 'PRODUCT_ACTIVATIONS_DISABLED',
        message: `New activations for this product have been temporarily disabled by administrator. Reason: ${product.emergencyKillSwitch?.activeReason || 'Emergency maintenance in progress'}`,
      });
    }

    // Resolve License either by licenseKey or purchaseCode.
    // Sandbox/test licenses are STRICTLY excluded: they exist only for the
    // vendor's own playground (public/sandbox/*) and must never activate
    // through the production endpoint — the deterministic TEST-* keys would
    // otherwise be a free-license backdoor.
    let license: LicenseDocument | null = null;
    if (dto.licenseKey) {
      license = await this.licenseModel
        .findOne({
          licenseKey: dto.licenseKey.trim().toUpperCase(),
          productId: product._id,
          isSandbox: { $ne: true },
        })
        .populate('licensePlanId');
    } else if (dto.purchaseCode) {
      const purchase = await this.purchaseModel.findOne({
        $or: [
          { externalPurchaseCode: dto.purchaseCode.trim() },
          { purchaseKey: dto.purchaseCode.trim() },
        ],
        productId: product._id,
      });

      if (purchase) {
        license = await this.licenseModel
          .findOne({
            purchaseId: purchase._id,
            isSandbox: { $ne: true },
          })
          .populate('licensePlanId');
      }
    }

    if (!license) {
      throw new BadRequestException({
        code: ErrorCode.LICENSE_INVALID,
        message: 'Invalid license key or purchase code for this product',
      });
    }

    if (license.status === LicenseStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: ErrorCode.LICENSE_SUSPENDED,
        message: 'This license has been suspended. Please contact support.',
      });
    }
    if (license.status === LicenseStatus.REVOKED) {
      throw new ForbiddenException({
        code: ErrorCode.LICENSE_REVOKED,
        message: 'This license has been revoked.',
      });
    }
    if (license.status === LicenseStatus.BLOCKED) {
      throw new ForbiddenException({
        code: ErrorCode.LICENSE_BLOCKED,
        message: 'This license has been blocked due to security violations.',
      });
    }
    const licenseSettings = this.resolveEffectiveSettings(product, license);

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      if (license.status !== LicenseStatus.EXPIRED) {
        license.status = LicenseStatus.EXPIRED;
        await license.save();
      }

      if (licenseSettings.blockActivationsOnExpiry !== false) {
        throw new BadRequestException({
          code: ErrorCode.LICENSE_EXPIRED,
          message: 'This license has expired.',
        });
      }
    }

    const normalizedDomain = DomainNormalizer.normalize(dto.domain);
    const isBlocked = await this.blockedModel.findOne({
      isActive: true,
      $or: [
        { type: BlockedEntityType.DOMAIN, value: normalizedDomain },
        { type: BlockedEntityType.LICENSE, value: license.licenseKey },
        ...(clientIp ? [{ type: BlockedEntityType.IP, value: clientIp }] : []),
      ],
    });

    if (isBlocked) {
      throw new ForbiddenException({
        code: ErrorCode.BLOCKED,
        message: `Activation blocked: ${isBlocked.reason}`,
      });
    }

    const detectedEnv = DomainNormalizer.detectEnvironment(dto.domain);
    const environment = dto.environment || detectedEnv;

    if (
      environment === EnvironmentType.LOCALHOST &&
      !licenseSettings.allowLocalhost
    ) {
      throw new BadRequestException({
        code: ErrorCode.DOMAIN_MISMATCH,
        message: 'Localhost activations are disabled for this product',
      });
    }
    if (
      environment === EnvironmentType.STAGING &&
      !licenseSettings.allowStaging
    ) {
      throw new BadRequestException({
        code: ErrorCode.DOMAIN_MISMATCH,
        message: 'Staging activations are disabled for this product',
      });
    }

    const shouldCountLimit =
      (environment === EnvironmentType.LOCALHOST
        ? licenseSettings.countLocalhost
        : true) &&
      (environment === EnvironmentType.STAGING
        ? licenseSettings.countStaging
        : true);

    const existingActivation = await this.activationModel.findOne({
      licenseId: license._id,
      installationId: dto.installationId,
      status: ActivationStatus.ACTIVE,
    });

    const validationIntervalHours =
      licenseSettings.validationIntervalHours || 24;
    const offlineGracePeriodDays = licenseSettings.offlineGracePeriodDays || 7;
    const cachedUntil = new Date(
      Date.now() + validationIntervalHours * 3600 * 1000,
    ).toISOString();
    const gracePeriodUntil = new Date(
      Date.now() +
        validationIntervalHours * 3600 * 1000 +
        offlineGracePeriodDays * 86400 * 1000,
    ).toISOString();

    if (existingActivation) {
      existingActivation.lastValidatedAt = new Date();
      existingActivation.lastSeenAt = new Date();
      existingActivation.productVersion =
        dto.productVersion || existingActivation.productVersion;
      if (dto.sdkVersion) existingActivation.sdkVersion = dto.sdkVersion;
      if (dto.sdkType) existingActivation.sdkType = dto.sdkType;
      existingActivation.apiHealth = 'healthy';
      if (clientIp) existingActivation.ip = clientIp;

      const healthResult = this.computeHealthStatus(
        existingActivation,
        product,
        license,
      );
      existingActivation.healthStatus = healthResult.health;
      existingActivation.flaggedForReview = healthResult.flagged;

      await existingActivation.save();

      const tokenData = this.tokenService.signActivationToken(
        {
          activationId: existingActivation.activationId,
          installationId: existingActivation.installationId,
          licenseId: license._id.toString(),
          productId: product._id.toString(),
          productSlug: product.slug,
          domain: existingActivation.normalizedDomain,
          environment: existingActivation.environment,
        },
        offlineGracePeriodDays + Math.ceil(validationIntervalHours / 24) + 30,
      );

      return {
        status: 'ACTIVE',
        valid: true,
        activation: {
          activationId: existingActivation.activationId,
          installationId: existingActivation.installationId,
          domain: existingActivation.domain,
          normalizedDomain: existingActivation.normalizedDomain,
          environment: existingActivation.environment,
          productVersion: existingActivation.productVersion,
          healthStatus: existingActivation.healthStatus,
        },
        license: {
          licenseKey: license.licenseKey,
          status: license.status,
          licenseType: license.licenseType,
          activationLimit: license.activationLimit,
          currentActivationCount: license.currentActivationCount,
          expiresAt: license.expiresAt,
          supportExpiresAt: license.supportExpiresAt,
        },
        product: {
          name: product.name,
          slug: product.slug,
          currentVersion: product.currentVersion,
        },
        token: tokenData.token,
        validationIntervalHours,
        offlineGracePeriodDays,
        cachedUntil,
        gracePeriodUntil,
        ...(healthResult.isSdkOutdated
          ? {
              sdkWarning: `A new version of the LicenseNest SDK is available. Please upgrade your integration to v${healthResult.latestSdkVersion}.`,
            }
          : {}),
      };
    }

    const activeCount = await this.activationModel.countDocuments({
      licenseId: license._id,
      status: ActivationStatus.ACTIVE,
    });

    if (shouldCountLimit && activeCount >= license.activationLimit) {
      // Notify Admins of activation limit abuse
      this.notificationsService
        .notifyAdmins(
          NotificationType.ACTIVATION_LIMIT_REACHED,
          `Activation Limit Reached: ${product.name}`,
          `License ${license.licenseKey} reached its limit (${license.activationLimit}) on domain "${normalizedDomain}".`,
          {
            licenseId: license._id.toString(),
            licenseKey: license.licenseKey,
            productId: product._id.toString(),
            productName: product.name,
            domain: normalizedDomain,
            ip: clientIp,
          },
          { severity: NotificationSeverity.WARNING },
        )
        .catch(() => {});

      throw new BadRequestException({
        code: ErrorCode.ACTIVATION_LIMIT_REACHED,
        message: `Maximum activation limit (${license.activationLimit}) reached for this license. Please deactivate an existing installation or upgrade your plan.`,
      });
    }

    await this.installationModel.findOneAndUpdate(
      { installationId: dto.installationId },
      {
        $set: {
          licenseId: license._id,
          productId: product._id,
          userId: license.userId,
          domain: dto.domain,
          normalizedDomain,
          installationUrl: dto.installationUrl || `https://${dto.domain}`,
          environment,
          serverFingerprint: dto.serverFingerprint,
          productVersion: dto.productVersion || product.currentVersion,
          ip: clientIp,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    const tempActivation = {
      status: ActivationStatus.ACTIVE,
      lastValidatedAt: new Date(),
      productVersion: dto.productVersion || product.currentVersion,
      sdkVersion: dto.sdkVersion || undefined,
      sdkType: dto.sdkType || undefined,
    };
    const healthResult = this.computeHealthStatus(
      tempActivation,
      product,
      license,
    );

    const activationId = this.generateActivationId();
    const activation: any = await this.activationModel.create({
      activationId,
      licenseId: license._id,
      productId: product._id,
      userId: license.userId,
      installationId: dto.installationId,
      domain: dto.domain,
      normalizedDomain,
      installationUrl: dto.installationUrl || `https://${dto.domain}`,
      environment,
      status: ActivationStatus.ACTIVE,
      productVersion: dto.productVersion || product.currentVersion,
      sdkVersion: dto.sdkVersion || undefined,
      sdkType: dto.sdkType || undefined,
      apiHealth: 'healthy',
      healthStatus: healthResult.health,
      flaggedForReview: healthResult.flagged,
      ip: clientIp,
      userAgent,
      activatedAt: new Date(),
      lastValidatedAt: new Date(),
      lastSeenAt: new Date(),
    });

    if (shouldCountLimit) {
      // Race-safe slot enforcement: the pre-check above can pass for two
      // concurrent activations. Recount AFTER the insert; if this create
      // pushed the license over its limit, roll the insertion back instead
      // of letting the limit be permanently exceeded.
      const recount = await this.activationModel.countDocuments({
        licenseId: license._id,
        status: ActivationStatus.ACTIVE,
      });
      if (recount > license.activationLimit) {
        await this.activationModel.updateOne(
          { _id: activation._id },
          {
            $set: {
              status: ActivationStatus.DEACTIVATED,
              deactivatedAt: new Date(),
              deactivationReason:
                'Rolled back: activation limit exceeded under concurrent activation',
            },
          },
        );
        throw new BadRequestException({
          code: ErrorCode.ACTIVATION_LIMIT_REACHED,
          message: `Maximum activation limit (${license.activationLimit}) reached for this license. Please deactivate an existing installation or upgrade your plan.`,
        });
      }
      license.currentActivationCount = recount;
      await license.save();
    }

    // Notify Customer of successful activation
    if (license.userId) {
      this.notificationsService
        .notifyCustomer(
          license.userId.toString(),
          NotificationType.LICENSE_ACTIVATED,
          `New Activation: ${product.name}`,
          `Your license key for ${product.name} was activated on ${normalizedDomain} (${environment}). Active slots: ${activeCount + 1}/${license.activationLimit}.`,
          {
            licenseId: license._id.toString(),
            productId: product._id.toString(),
            productName: product.name,
            domain: normalizedDomain,
            environment,
            activationId,
          },
          { actionUrl: `/dashboard/licenses` },
        )
        .catch(() => {});
    }

    const tokenData = this.tokenService.signActivationToken(
      {
        activationId,
        installationId: dto.installationId,
        licenseId: license._id.toString(),
        productId: product._id.toString(),
        productSlug: product.slug,
        domain: normalizedDomain,
        environment,
      },
      offlineGracePeriodDays + Math.ceil(validationIntervalHours / 24) + 30,
    );

    await this.tokenModel.create({
      tokenId: tokenData.tokenId,
      activationId,
      licenseId: license._id,
      token: tokenData.token,
      tokenHash: this.tokenService.hashToken(tokenData.token),
      expiresAt: tokenData.expiresAt,
    });

    await this.auditLogModel.create({
      action: 'LICENSE_ACTIVATED',
      targetType: 'activation',
      targetId: activationId,
      ip: clientIp,
      userAgent,
      after: {
        activationId,
        licenseKey: license.licenseKey,
        productSlug: product.slug,
        domain: normalizedDomain,
        installationId: dto.installationId,
        environment,
      },
    });

    return {
      status: 'ACTIVE',
      valid: true,
      activation: {
        activationId,
        installationId: dto.installationId,
        domain: dto.domain,
        normalizedDomain,
        environment,
        productVersion: activation.productVersion,
        healthStatus: activation.healthStatus,
      },
      license: {
        licenseKey: license.licenseKey,
        status: license.status,
        licenseType: license.licenseType,
        activationLimit: license.activationLimit,
        currentActivationCount: license.currentActivationCount,
        expiresAt: license.expiresAt,
        supportExpiresAt: license.supportExpiresAt,
      },
      product: {
        name: product.name,
        slug: product.slug,
        currentVersion: product.currentVersion,
      },
      token: tokenData.token,
      validationIntervalHours,
      offlineGracePeriodDays,
      cachedUntil,
      gracePeriodUntil,
      ...(healthResult.isSdkOutdated
        ? {
            sdkWarning: `A new version of the LicenseNest SDK is available. Please upgrade your integration to v${healthResult.latestSdkVersion}.`,
          }
        : {}),
    };
  }

  async validate(dto: ValidateLicenseDto, clientIp?: string) {
    let payload;
    try {
      payload = this.tokenService.verifyActivationToken(dto.token);
    } catch {
      await this.logValidation(dto, 'TOKEN_INVALID', clientIp);
      return {
        valid: false,
        status: 'TOKEN_INVALID',
        message:
          'Activation token is invalid, corrupted, or signature verification failed',
      };
    }

    // Sandbox tokens are minted by the sandbox engine for playground testing
    // only — they must never validate against production endpoints.
    if (payload.environment === 'sandbox') {
      await this.logValidation(
        dto,
        'SANDBOX_TOKEN_REJECTED',
        clientIp,
        payload.licenseId,
      );
      return {
        valid: false,
        status: 'SANDBOX_TOKEN_REJECTED',
        message:
          'Sandbox activation tokens cannot be used against production licensing endpoints',
      };
    }

    const normalizedDomain = DomainNormalizer.normalize(dto.domain);
    if (payload.domain !== normalizedDomain) {
      await this.logValidation(
        dto,
        'DOMAIN_MISMATCH',
        clientIp,
        payload.licenseId,
      );
      return {
        valid: false,
        status: 'DOMAIN_MISMATCH',
        message: `Domain mismatch. Token is cryptographically bound to "${payload.domain}", received "${normalizedDomain}"`,
      };
    }

    if (payload.installationId !== dto.installationId) {
      await this.logValidation(
        dto,
        'INSTALLATION_MISMATCH',
        clientIp,
        payload.licenseId,
      );
      return {
        valid: false,
        status: 'INSTALLATION_MISMATCH',
        message: 'Installation ID mismatch between client and token',
      };
    }

    const product = await this.productModel.findById(payload.productId);
    if (!product || product.isArchived) {
      await this.logValidation(
        dto,
        'PRODUCT_NOT_FOUND',
        clientIp,
        payload.licenseId,
      );
      return {
        valid: false,
        status: 'PRODUCT_NOT_FOUND',
        message:
          'Associated product is no longer active in the licensing catalog',
      };
    }

    if (product.status !== ProductStatus.ACTIVE) {
      await this.logValidation(
        dto,
        'PRODUCT_DISABLED',
        clientIp,
        payload.licenseId,
      );
      return {
        valid: false,
        status: 'PRODUCT_DISABLED',
        message: `Product is currently ${product.status}`,
      };
    }

    if (
      product.emergencyKillSwitch?.disableValidation ||
      product.emergencyKillSwitch?.isProductSuspended
    ) {
      await this.logValidation(
        dto,
        'PRODUCT_VALIDATIONS_DISABLED',
        clientIp,
        payload.licenseId,
      );
      return {
        valid: false,
        status: 'PRODUCT_VALIDATIONS_DISABLED',
        message: `Validation for this product has been temporarily disabled by administrator. Reason: ${product.emergencyKillSwitch?.activeReason || 'Emergency maintenance in progress'}`,
      };
    }

    const license = await this.licenseModel
      .findById(payload.licenseId)
      .populate('licensePlanId');
    if (!license) {
      await this.logValidation(dto, 'LICENSE_NOT_FOUND', clientIp);
      return {
        valid: false,
        status: 'LICENSE_NOT_FOUND',
        message: 'License record not found',
      };
    }

    const activation = await this.activationModel.findOne({
      licenseId: license._id,
      installationId: dto.installationId,
    });

    if (
      license.status === LicenseStatus.REVOKED ||
      activation?.status === ActivationStatus.REVOKED
    ) {
      const isCritical =
        license.isCriticalRevoked || activation?.isCriticalRevoked;
      const reason =
        license.revocationReason ||
        activation?.revocationReason ||
        'License revoked by administrator';
      await this.logValidation(dto, 'REVOKED', clientIp, license._id);
      return {
        valid: false,
        status: 'REVOKED',
        isRevoked: true,
        isCriticalRevoked: isCritical,
        forceDeactivate: true,
        message: `This license has been revoked. Reason: ${reason}`,
      };
    }

    if (
      license.status === LicenseStatus.SUSPENDED ||
      activation?.status === ActivationStatus.SUSPENDED
    ) {
      const reason =
        license.suspendedReason ||
        activation?.suspendedReason ||
        'License suspended by administration';
      await this.logValidation(dto, 'SUSPENDED', clientIp, license._id);
      return {
        valid: false,
        status: 'SUSPENDED',
        isSuspended: true,
        message: `This license has been suspended by administration. Reason: ${reason}`,
      };
    }

    if (
      license.status === LicenseStatus.BLOCKED ||
      activation?.status === ActivationStatus.BLOCKED
    ) {
      await this.logValidation(dto, 'BLOCKED', clientIp, license._id);
      return {
        valid: false,
        status: 'BLOCKED',
        message: 'This license is blocked due to security violations',
      };
    }

    const resolvedSettings = this.resolveEffectiveSettings(product, license);

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      if (license.status !== LicenseStatus.EXPIRED) {
        license.status = LicenseStatus.EXPIRED;
        await license.save();
      }

      if (resolvedSettings.blockValidationOnExpiry !== false) {
        await this.logValidation(dto, 'EXPIRED', clientIp, license._id);
        return {
          valid: false,
          status: 'EXPIRED',
          message: 'License expiration period has elapsed',
        };
      }
    }

    const isBlocked = await this.blockedModel.findOne({
      isActive: true,
      $or: [
        { type: BlockedEntityType.DOMAIN, value: normalizedDomain },
        { type: BlockedEntityType.LICENSE, value: license.licenseKey },
        ...(clientIp ? [{ type: BlockedEntityType.IP, value: clientIp }] : []),
      ],
    });

    if (isBlocked) {
      await this.logValidation(dto, 'BLOCKED', clientIp, license._id);
      return {
        valid: false,
        status: 'BLOCKED',
        message: `Security block active: ${isBlocked.reason}`,
      };
    }

    if (!activation || activation.status !== ActivationStatus.ACTIVE) {
      await this.logValidation(
        dto,
        'ACTIVATION_DEACTIVATED',
        clientIp,
        license._id,
      );
      return {
        valid: false,
        status: 'ACTIVATION_DEACTIVATED',
        message:
          'This installation activation has been deactivated or transferred',
      };
    }

    activation.lastValidatedAt = new Date();
    activation.lastSeenAt = new Date();
    if (dto.productVersion) activation.productVersion = dto.productVersion;
    if (dto.sdkVersion) activation.sdkVersion = dto.sdkVersion;
    if (dto.sdkType) activation.sdkType = dto.sdkType;
    activation.apiHealth = 'healthy';
    activation.forceRevalidate = false;
    if (clientIp) activation.ip = clientIp;

    const healthResult = this.computeHealthStatus(activation, product, license);
    activation.healthStatus = healthResult.health;
    activation.flaggedForReview = healthResult.flagged;

    await activation.save();

    await this.installationModel.updateOne(
      { installationId: dto.installationId },
      { $set: { lastSeenAt: new Date(), ip: clientIp } },
    );

    await this.logValidation(
      dto,
      'VALID',
      clientIp,
      license._id,
      activation.activationId,
    );

    const validationIntervalHours = resolvedSettings.validationIntervalHours;
    const offlineGracePeriodDays = resolvedSettings.offlineGracePeriodDays;
    const cachedUntil = new Date(
      Date.now() + validationIntervalHours * 3600 * 1000,
    ).toISOString();
    const gracePeriodUntil = new Date(
      Date.now() +
        validationIntervalHours * 3600 * 1000 +
        offlineGracePeriodDays * 86400 * 1000,
    ).toISOString();

    // Generate refreshed token with extended validity
    const tokenData = this.tokenService.signActivationToken(
      {
        activationId: activation.activationId,
        installationId: activation.installationId,
        licenseId: license._id.toString(),
        productId: product._id.toString(),
        productSlug: product.slug,
        domain: activation.normalizedDomain,
        environment: activation.environment,
      },
      offlineGracePeriodDays + Math.ceil(validationIntervalHours / 24) + 30,
    );

    return {
      valid: true,
      status: 'ACTIVE',
      license: {
        licenseKey: license.licenseKey,
        status: license.status,
        licenseType: license.licenseType,
        expiresAt: license.expiresAt,
        supportExpiresAt: license.supportExpiresAt,
      },
      product: {
        name: product.name,
        slug: product.slug,
        currentVersion: product.currentVersion,
      },
      token: tokenData.token,
      validationIntervalHours,
      offlineGracePeriodDays,
      cachedUntil,
      gracePeriodUntil,
      healthStatus: activation.healthStatus,
      ...(healthResult.isSdkOutdated
        ? {
            sdkWarning: `A new version of the LicenseNest SDK is available. Please upgrade your integration to v${healthResult.latestSdkVersion}.`,
          }
        : {}),
    };
  }

  async deactivate(
    dto: DeactivateLicenseDto,
    actorEmail?: string,
    clientIp?: string,
    authProductId?: any,
  ) {
    // Proof of ownership is REQUIRED to deactivate: a valid signed
    // activation token bound to this installation, or the license key that
    // owns it. A bare installationId proves nothing (the product's embedded
    // client credentials are public in every distributed plugin, so
    // installationId-only deactivation let strangers free other people's
    // slots / knock live sites offline).
    let activation: any = null;

    if (dto.token) {
      let payload: any = null;
      try {
        payload = this.tokenService.verifyActivationToken(dto.token);
      } catch {
        payload = null; // expired/invalid token → try license-key proof below
      }
      if (payload?.activationId) {
        const byToken = await this.activationModel.findOne({
          activationId: payload.activationId,
          status: ActivationStatus.ACTIVE,
        });
        if (byToken) {
          if (
            dto.installationId &&
            byToken.installationId !== dto.installationId
          ) {
            throw new ForbiddenException({
              code: 'INSTALLATION_MISMATCH',
              message:
                'Activation token does not belong to this installation ID',
            });
          }
          activation = byToken;
        }
      }
    }

    if (!activation && dto.licenseKey) {
      const license = await this.licenseModel.findOne({
        licenseKey: dto.licenseKey.trim().toUpperCase(),
      });
      if (license) {
        const query: any = {
          licenseId: license._id,
          status: ActivationStatus.ACTIVE,
        };
        if (authProductId) {
          query.productId = new Types.ObjectId(authProductId.toString());
        }
        if (dto.installationId) {
          query.installationId = dto.installationId;
        } else if (dto.domain) {
          query.normalizedDomain = DomainNormalizer.normalize(dto.domain);
        }
        activation = await this.activationModel.findOne(query);
      }
    }

    if (!activation) {
      throw new ForbiddenException({
        code: 'DEACTIVATION_PROOF_REQUIRED',
        message:
          'Deactivation requires the signed activation token or the license key of this installation',
      });
    }

    if (
      authProductId &&
      activation.productId.toString() !== authProductId.toString()
    ) {
      throw new ForbiddenException({
        code: ErrorCode.PRODUCT_MISMATCH,
        message: 'API credentials do not match the product of this activation',
      });
    }

    activation.status = ActivationStatus.DEACTIVATED;
    activation.deactivatedAt = new Date();
    activation.deactivationReason = dto.reason || 'Deactivated by user';
    await activation.save();

    await this.tokenModel.updateMany(
      { activationId: activation.activationId },
      { $set: { isRevoked: true } },
    );

    const activeCount = await this.activationModel.countDocuments({
      licenseId: activation.licenseId,
      status: ActivationStatus.ACTIVE,
    });
    await this.licenseModel.findByIdAndUpdate(activation.licenseId, {
      $set: { currentActivationCount: activeCount },
    });

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'client',
      action: 'LICENSE_DEACTIVATED',
      targetType: 'activation',
      targetId: activation.activationId,
      ip: clientIp,
      after: {
        activationId: activation.activationId,
        installationId: dto.installationId,
        domain: activation.domain,
        reason: activation.deactivationReason,
      },
    });

    if (activation.userId) {
      this.notificationsService
        .notifyCustomer(
          activation.userId.toString(),
          NotificationType.LICENSE_DEACTIVATED,
          `Installation Deactivated: ${activation.domain}`,
          `Your installation on domain "${activation.domain}" was deactivated. An activation slot has been freed.`,
          {
            licenseId: activation.licenseId.toString(),
            productId: activation.productId.toString(),
            domain: activation.domain,
            activationId: activation.activationId,
            reason: activation.deactivationReason,
          },
          { actionUrl: `/dashboard/licenses` },
        )
        .catch(() => {});
    }

    return {
      success: true,
      message:
        'License successfully deactivated. Activation slot has been freed.',
    };
  }

  async customerDeactivate(activationId: string, userId: string) {
    const activation = await this.activationModel.findOne({
      activationId,
      userId: new Types.ObjectId(userId),
      status: ActivationStatus.ACTIVE,
    });

    if (!activation) {
      throw new NotFoundException(
        'Active activation not found or not owned by you',
      );
    }

    const license = await this.licenseModel
      .findById(activation.licenseId)
      .populate('licensePlanId');
    const product = await this.productModel.findById(activation.productId);
    const settings = this.resolveEffectiveSettings(product, license);

    if (settings && settings.allowDeactivation === false) {
      throw new BadRequestException(
        'Self-deactivation is disabled for this product. Please contact support.',
      );
    }

    if (
      settings &&
      settings.deactivationCooldownHours > 0 &&
      activation.activatedAt
    ) {
      const hoursSinceActivation =
        (Date.now() - new Date(activation.activatedAt).getTime()) /
        (1000 * 3600);
      if (hoursSinceActivation < settings.deactivationCooldownHours) {
        const remainingHours = Math.ceil(
          settings.deactivationCooldownHours - hoursSinceActivation,
        );
        throw new BadRequestException(
          `Deactivation is on cooldown. Please wait ${remainingHours} hour(s) before deactivating this domain installation.`,
        );
      }
    }

    return this.deactivate(
      {
        installationId: activation.installationId,
        reason: 'Customer self-deactivation',
      },
      'customer',
    );
  }

  async adminDeactivate(
    activationId: string,
    reason: string,
    actorEmail: string,
  ) {
    const activation = await this.activationModel.findOne({
      activationId,
      status: ActivationStatus.ACTIVE,
    });

    if (!activation) {
      throw new NotFoundException('Active activation not found');
    }

    // The shared deactivate() path requires proof (signed token or license
    // key) because the product's client credentials are public. An
    // authenticated admin is itself the authorization, so resolve the owning
    // license server-side and supply its key as the proof.
    const license = await this.licenseModel.findById(activation.licenseId);
    if (!license) {
      throw new NotFoundException('Owning license not found');
    }

    return this.deactivate(
      {
        installationId: activation.installationId,
        licenseKey: license.licenseKey,
        reason: reason || 'Admin panel deactivation',
      },
      actorEmail,
    );
  }

  async adminSuspend(activationId: string, reason: string, actorEmail: string) {
    const activation = await this.activationModel.findOne({ activationId });
    if (!activation) {
      throw new NotFoundException('Activation record not found');
    }

    activation.status = ActivationStatus.SUSPENDED;
    activation.deactivatedAt = new Date();
    activation.deactivationReason = reason || 'Suspended by administrator';
    await activation.save();

    await this.tokenModel.updateMany(
      { activationId: activation.activationId },
      { $set: { isRevoked: true } },
    );

    const activeCount = await this.activationModel.countDocuments({
      licenseId: activation.licenseId,
      status: ActivationStatus.ACTIVE,
    });
    await this.licenseModel.findByIdAndUpdate(activation.licenseId, {
      $set: { currentActivationCount: activeCount },
    });

    await this.auditLogModel.create({
      actorEmail,
      action: 'ACTIVATION_SUSPENDED',
      targetType: 'activation',
      targetId: activation.activationId,
      after: {
        activationId: activation.activationId,
        domain: activation.domain,
        reason,
      },
    });

    return {
      success: true,
      message: 'Activation suspended successfully.',
      activation,
    };
  }

  async adminRevoke(activationId: string, reason: string, actorEmail: string) {
    const activation = await this.activationModel.findOne({ activationId });
    if (!activation) {
      throw new NotFoundException('Activation record not found');
    }

    activation.status = ActivationStatus.REVOKED;
    activation.deactivatedAt = new Date();
    activation.deactivationReason = reason || 'Revoked by administrator';
    await activation.save();

    await this.tokenModel.updateMany(
      { activationId: activation.activationId },
      { $set: { isRevoked: true } },
    );

    const activeCount = await this.activationModel.countDocuments({
      licenseId: activation.licenseId,
      status: ActivationStatus.ACTIVE,
    });
    await this.licenseModel.findByIdAndUpdate(activation.licenseId, {
      $set: { currentActivationCount: activeCount },
    });

    await this.auditLogModel.create({
      actorEmail,
      action: 'ACTIVATION_REVOKED',
      targetType: 'activation',
      targetId: activation.activationId,
      after: {
        activationId: activation.activationId,
        domain: activation.domain,
        reason,
      },
    });

    return {
      success: true,
      message: 'Activation permanently revoked.',
      activation,
    };
  }

  async adminResetLicenseActivations(
    licenseId: string,
    reason: string,
    actorEmail: string,
  ) {
    if (!Types.ObjectId.isValid(licenseId)) {
      throw new BadRequestException('Invalid license ID');
    }

    const activeActivations = await this.activationModel.find({
      licenseId: new Types.ObjectId(licenseId),
      status: ActivationStatus.ACTIVE,
    });

    await this.activationModel.updateMany(
      {
        licenseId: new Types.ObjectId(licenseId),
        status: ActivationStatus.ACTIVE,
      },
      {
        $set: {
          status: ActivationStatus.DEACTIVATED,
          deactivatedAt: new Date(),
          deactivationReason: reason || 'Administrative reset',
        },
      },
    );

    for (const act of activeActivations) {
      await this.tokenModel.updateMany(
        { activationId: act.activationId },
        { $set: { isRevoked: true } },
      );
    }

    await this.licenseModel.findByIdAndUpdate(licenseId, {
      $set: { currentActivationCount: 0 },
    });

    await this.auditLogModel.create({
      actorEmail,
      action: 'LICENSE_ACTIVATIONS_RESET',
      targetType: 'license',
      targetId: licenseId,
      after: { resetCount: activeActivations.length, reason },
    });

    return {
      success: true,
      message: `Reset ${activeActivations.length} active activation slot(s).`,
    };
  }

  async transferActivation(
    activationId: string,
    transferDto: TransferActivationDto,
    actorEmail: string,
  ) {
    const activation = await this.activationModel.findOne({
      activationId,
      status: ActivationStatus.ACTIVE,
    });

    if (!activation) {
      throw new NotFoundException('Active activation not found');
    }

    const oldDomain = activation.domain;
    const normalizedNewDomain = DomainNormalizer.normalize(
      transferDto.newDomain,
    );

    activation.domain = transferDto.newDomain;
    activation.normalizedDomain = normalizedNewDomain;
    activation.installationId = transferDto.newInstallationId;
    activation.environment = DomainNormalizer.detectEnvironment(
      transferDto.newDomain,
    );
    activation.lastValidatedAt = new Date();
    await activation.save();

    await this.tokenModel.updateMany(
      { activationId: activation.activationId },
      { $set: { isRevoked: true } },
    );

    const license = await this.licenseModel
      .findById(activation.licenseId)
      .populate('licensePlanId');
    const product = await this.productModel.findById(activation.productId);
    const settings = this.resolveEffectiveSettings(product, license);
    const tokenData = this.tokenService.signActivationToken(
      {
        activationId: activation.activationId,
        installationId: transferDto.newInstallationId,
        licenseId: activation.licenseId.toString(),
        productId: activation.productId.toString(),
        productSlug: product?.slug || 'product',
        domain: normalizedNewDomain,
        environment: activation.environment,
      },
      settings.offlineGracePeriodDays,
    );

    await this.tokenModel.create({
      tokenId: tokenData.tokenId,
      activationId: activation.activationId,
      licenseId: activation.licenseId,
      token: tokenData.token,
      tokenHash: this.tokenService.hashToken(tokenData.token),
      expiresAt: tokenData.expiresAt,
    });

    await this.auditLogModel.create({
      actorEmail,
      action: 'ACTIVATION_TRANSFERRED',
      targetType: 'activation',
      targetId: activation.activationId,
      before: { domain: oldDomain },
      after: {
        domain: transferDto.newDomain,
        installationId: transferDto.newInstallationId,
        reason: transferDto.reason,
      },
    });

    return {
      success: true,
      activation,
      token: tokenData.token,
    };
  }

  async sync(dto: ValidateLicenseDto, clientIp?: string) {
    return this.validate(dto, clientIp);
  }

  async adminForceRevalidate(activationId: string, actorEmail: string) {
    const activation = await this.activationModel.findOne({ activationId });
    if (!activation) {
      throw new NotFoundException('Activation record not found');
    }

    activation.forceRevalidate = true;
    activation.lastSeenAt = new Date();
    await activation.save();

    const product = await this.productModel.findById(activation.productId);
    const activeToken = await this.tokenModel.findOne({
      activationId: activation.activationId,
      isRevoked: false,
    });

    if (activation.installationUrl && activeToken) {
      const sig = crypto
        .createHmac('sha256', activeToken.token)
        .update(activation.activationId)
        .digest('hex');
      const pingUrl = `${activation.installationUrl.replace(/\/$/, '')}/?licensenest_revalidate=1&activation_id=${activation.activationId}&sig=${sig}`;

      // Fire-and-forget HTTP call to client
      fetch(pingUrl)
        .then(async (res) => {
          this.logger.log(
            `Remote revalidate ping to ${activation.domain} returned HTTP ${res.status}`,
          );
        })
        .catch((err) => {
          this.logger.warn(
            `Remote revalidate ping to ${activation.domain} failed: ${err.message}`,
          );
        });
    }

    await this.auditLogModel.create({
      actorEmail,
      action: 'FORCE_REVALIDATION_TRIGGERED',
      targetType: 'activation',
      targetId: activation.activationId,
      after: { domain: activation.domain },
    });

    return {
      success: true,
      message:
        'Force revalidate triggered successfully. Client pinged if URL accessible.',
    };
  }

  async findAll(query?: {
    search?: string;
    status?: string;
    healthStatus?: string;
    productId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.productId) {
      try {
        filter.productId = new Types.ObjectId(query.productId);
      } catch (e) {
        // Ignore invalid ObjectId
      }
    }
    if (query?.healthStatus && query.healthStatus !== 'all')
      filter.healthStatus = query.healthStatus;
    if (query?.search) {
      filter.$or = [
        { domain: { $regex: query.search, $options: 'i' } },
        { activationId: { $regex: query.search, $options: 'i' } },
        { installationId: { $regex: query.search, $options: 'i' } },
        { ip: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [rawItems, total] = await Promise.all([
      this.activationModel
        .find(filter)
        .populate(
          'productId',
          'name slug logoUrl productType currentVersion latestStableVersion',
        )
        .populate({
          path: 'licenseId',
          select:
            'licenseKey status activationLimit currentActivationCount expiresAt supportExpiresAt source licensePlanId',
          populate: [
            {
              path: 'purchaseId',
              select:
                'orderNumber externalPurchaseCode buyerUsername source purchasedAt',
            },
            {
              path: 'licensePlanId',
            },
          ],
        })
        .populate('userId', 'email fullName envatoUsername')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.activationModel.countDocuments(filter),
    ]);

    const items = rawItems.map((item: any) => {
      const healthResult = this.computeHealthStatus(
        item,
        item.productId,
        item.licenseId,
      );
      return {
        ...item,
        healthStatus: healthResult.health,
        flaggedForReview: healthResult.flagged,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private async logValidation(
    dto: ValidateLicenseDto,
    status: string,
    ip?: string,
    licenseId?: any,
    activationId?: string,
    message?: string,
  ) {
    try {
      await this.validationLogModel.create({
        installationId: dto.installationId,
        domain: dto.domain,
        licenseId: licenseId || undefined,
        activationId: activationId || undefined,
        status,
        message: message || undefined,
        ip: ip || undefined,
        productVersion: dto.productVersion || undefined,
        timestamp: new Date(),
      });
    } catch (err) {
      // non-blocking
    }
  }
}
