import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LicenseRecoveryRequest,
  LicenseRecoveryRequestDocument,
} from '../../database/schemas/license-recovery.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  Installation,
  InstallationDocument,
} from '../../database/schemas/installation.schema';
import {
  ActivationToken,
  ActivationTokenDocument,
} from '../../database/schemas/activation-token.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import {
  Purchase,
  PurchaseDocument,
} from '../../database/schemas/purchase.schema';
import {
  User,
  UserDocument,
} from '../../database/schemas/user.schema';
import { TokenService } from '../token/token.service';
import { ActivationsService } from '../activations/activations.service';
import { DomainNormalizer } from '../../common/utils/domain-normalizer.util';
import {
  LicenseStatus,
  ActivationStatus,
  EnvironmentType,
} from '../../common/enums/app.enums';
import {
  CreateRecoveryRequestDto,
  GuestRecoveryRequestDto,
  ResolveRecoveryRequestDto,
  ManualRecoveryDto,
} from './dto/license-recovery.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationSeverity,
} from '../../common/enums/app.enums';

@Injectable()
export class LicenseRecoveryService {
  constructor(
    @InjectModel(LicenseRecoveryRequest.name)
    private recoveryModel: Model<LicenseRecoveryRequestDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name) private activationModel: Model<ActivationDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Installation.name) private installationModel: Model<InstallationDocument>,
    @InjectModel(ActivationToken.name) private tokenModel: Model<ActivationTokenDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private tokenService: TokenService,
    private activationsService: ActivationsService,
    private notificationsService: NotificationsService,
  ) {}

  private mapReasonToStatus(reason: string): ActivationStatus {
    const r = reason.toLowerCase();
    if (r.includes('lost') || r.includes('delete') || r.includes('corrupt')) {
      return ActivationStatus.LOST;
    }
    if (r.includes('move') || r.includes('replace') || r.includes('reinstall')) {
      return ActivationStatus.REPLACED;
    }
    return ActivationStatus.RECOVERED;
  }

  async requestRecovery(
    dto: CreateRecoveryRequestDto,
    userId: string,
    userEmail: string,
    clientIp?: string,
  ) {
    const license = await this.licenseModel
      .findOne({
        _id: new Types.ObjectId(dto.licenseId),
        userId: new Types.ObjectId(userId),
      })
      .populate('licensePlanId');

    if (!license) {
      throw new NotFoundException('License not found or not owned by you');
    }

    if (license.status !== LicenseStatus.ACTIVE) {
      throw new BadRequestException(`License is not active (current status: ${license.status})`);
    }

    const oldActivation = await this.activationModel.findOne({
      activationId: dto.oldActivationId,
      licenseId: license._id,
      status: ActivationStatus.ACTIVE,
    });

    if (!oldActivation) {
      throw new NotFoundException('Active activation to recover not found on this license');
    }

    const product = await this.productModel.findById(license.productId);
    const settings = this.activationsService.resolveEffectiveSettings(product, license);

    if (!settings.recoveryEnabled) {
      throw new ForbiddenException('License recovery is disabled for this product/plan');
    }

    // Cooldown & Limits checks
    await this.checkLimitsAndCooldown(license._id.toString(), settings.recoveryLimit, settings.recoveryCooldownHours);

    const requesterEmail = userEmail;

    if (settings.autoApproveRecovery) {
      // Execute immediate recovery
      const result = await this.executeRecoveryTransfer(
        license,
        oldActivation,
        dto.newDomain,
        dto.newInstallationId,
        dto.newInstallationUrl,
        dto.reason,
        dto.reasonDetail,
        requesterEmail,
        'system',
        clientIp,
        userId,
      );

      return {
        success: true,
        status: 'approved',
        message: 'Recovery request approved automatically.',
        activation: result.activation,
        token: result.token,
      };
    } else {
      // Queue as pending
      const request = await this.recoveryModel.create({
        licenseId: license._id,
        productId: license.productId,
        userId: new Types.ObjectId(userId),
        requesterEmail,
        reason: dto.reason,
        reasonDetail: dto.reasonDetail || '',
        oldDomain: oldActivation.domain,
        oldInstallationId: oldActivation.installationId,
        oldActivationId: oldActivation.activationId,
        newDomain: dto.newDomain,
        newInstallationId: dto.newInstallationId,
        newInstallationUrl: dto.newInstallationUrl || '',
        status: 'pending',
        requestedIp: clientIp,
      });

      // Notify Admins
      this.notificationsService.notifyAdmins(
        NotificationType.LICENSE_RECOVERY_REQUESTED,
        `New Recovery Request: ${product?.name}`,
        `Customer ${requesterEmail} requested recovery for ${oldActivation.domain} → ${dto.newDomain}.`,
        {
          recoveryRequestId: request._id.toString(),
          licenseId: license._id.toString(),
          licenseKey: license.licenseKey,
          oldDomain: oldActivation.domain,
          newDomain: dto.newDomain,
        },
        { severity: NotificationSeverity.INFO },
      ).catch(() => {});

      return {
        success: true,
        status: 'pending',
        message: 'Recovery request submitted successfully and is pending administrative review.',
      };
    }
  }

  async requestGuestRecovery(dto: GuestRecoveryRequestDto, clientIp?: string) {
    const license = await this.licenseModel
      .findOne({
        licenseKey: dto.licenseKey.trim().toUpperCase(),
      })
      .populate('licensePlanId');

    if (!license) {
      throw new NotFoundException('License not found');
    }

    if (license.status !== LicenseStatus.ACTIVE) {
      throw new BadRequestException(`License is not active (current status: ${license.status})`);
    }

    // Verify Ownership
    let ownershipVerified = false;
    let ownerUser: UserDocument | null = null;
    if (license.userId) {
      ownerUser = await this.userModel.findById(license.userId);
    }

    if (dto.verificationEmail && ownerUser && ownerUser.email.toLowerCase() === dto.verificationEmail.toLowerCase()) {
      ownershipVerified = true;
    } else if (dto.purchaseCode && license.purchaseId) {
      const purchase = await this.purchaseModel.findById(license.purchaseId);
      if (
        purchase &&
        (purchase.externalPurchaseCode === dto.purchaseCode.trim() ||
          purchase.purchaseKey === dto.purchaseCode.trim())
      ) {
        ownershipVerified = true;
      }
    }

    if (!ownershipVerified) {
      throw new ForbiddenException(
        'Ownership verification failed. You must provide the purchase code or the registered account email associated with this license.',
      );
    }

    const oldActivation = await this.activationModel.findOne({
      licenseId: license._id,
      normalizedDomain: DomainNormalizer.normalize(dto.oldDomain),
      status: ActivationStatus.ACTIVE,
    });

    if (!oldActivation) {
      throw new NotFoundException(`No active activation found for domain "${dto.oldDomain}" on this license.`);
    }

    const product = await this.productModel.findById(license.productId);
    const settings = this.activationsService.resolveEffectiveSettings(product, license);

    if (!settings.recoveryEnabled) {
      throw new ForbiddenException('License recovery is disabled for this product/plan');
    }

    await this.checkLimitsAndCooldown(license._id.toString(), settings.recoveryLimit, settings.recoveryCooldownHours);

    const requesterEmail = dto.verificationEmail || ownerUser?.email || 'guest@example.com';

    // Guest recoveries always queue as pending for admin verification unless auto-approved is specifically configured
    // Let's allow auto-approve if owner email matches and cooldown/limits are met
    if (settings.autoApproveRecovery && dto.verificationEmail) {
      const result = await this.executeRecoveryTransfer(
        license,
        oldActivation,
        dto.newDomain,
        dto.newInstallationId,
        dto.newInstallationUrl,
        dto.reason,
        dto.reasonDetail,
        requesterEmail,
        'system',
        clientIp,
        license.userId?.toString(),
      );

      return {
        success: true,
        status: 'approved',
        message: 'Recovery approved automatically through owner email verification.',
        activation: result.activation,
        token: result.token,
      };
    } else {
      const request = await this.recoveryModel.create({
        licenseId: license._id,
        productId: license.productId,
        userId: license.userId,
        requesterEmail,
        reason: dto.reason,
        reasonDetail: dto.reasonDetail || '',
        oldDomain: oldActivation.domain,
        oldInstallationId: oldActivation.installationId,
        oldActivationId: oldActivation.activationId,
        newDomain: dto.newDomain,
        newInstallationId: dto.newInstallationId,
        newInstallationUrl: dto.newInstallationUrl || '',
        status: 'pending',
        requestedIp: clientIp,
      });

      this.notificationsService.notifyAdmins(
        NotificationType.LICENSE_RECOVERY_REQUESTED,
        `Guest Recovery Request: ${product?.name}`,
        `Guest ${requesterEmail} requested recovery for ${oldActivation.domain} → ${dto.newDomain}.`,
        {
          recoveryRequestId: request._id.toString(),
          licenseId: license._id.toString(),
          licenseKey: license.licenseKey,
          oldDomain: oldActivation.domain,
          newDomain: dto.newDomain,
        },
        { severity: NotificationSeverity.WARNING },
      ).catch(() => {});

      return {
        success: true,
        status: 'pending',
        message: 'Recovery request submitted. Admin approval is required.',
      };
    }
  }

  async approveRecovery(id: string, adminEmail: string) {
    const request = await this.recoveryModel.findById(id);
    if (!request) {
      throw new NotFoundException('Recovery request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const license = await this.licenseModel.findById(request.licenseId).populate('licensePlanId');
    if (!license) {
      throw new NotFoundException('License associated with this recovery request not found');
    }

    const oldActivation = await this.activationModel.findOne({
      activationId: request.oldActivationId,
      status: ActivationStatus.ACTIVE,
    });

    if (!oldActivation) {
      throw new BadRequestException('The original activation slot is no longer active (already deactivated, lost, or replaced).');
    }

    const result = await this.executeRecoveryTransfer(
      license,
      oldActivation,
      request.newDomain,
      request.newInstallationId,
      request.newInstallationUrl,
      request.reason,
      request.reasonDetail,
      request.requesterEmail,
      adminEmail,
      request.requestedIp,
      request.userId?.toString(),
    );

    request.status = 'approved';
    request.approverEmail = adminEmail;
    request.resolvedAt = new Date();
    await request.save();

    // Notify Customer
    if (license.userId) {
      this.notificationsService.notifyCustomer(
        license.userId.toString(),
        NotificationType.LICENSE_RECOVERY_APPROVED,
        `Recovery Approved: ${request.newDomain}`,
        `Your license recovery request for ${request.oldDomain} → ${request.newDomain} was approved by support.`,
        {
          licenseId: license._id.toString(),
          productId: license.productId.toString(),
          recoveryRequestId: request._id.toString(),
          newDomain: request.newDomain,
        },
        { actionUrl: `/dashboard/licenses` },
      ).catch(() => {});
    }

    return {
      success: true,
      status: 'approved',
      activation: result.activation,
      token: result.token,
    };
  }

  async rejectRecovery(id: string, rejectionReason: string, adminEmail: string) {
    const request = await this.recoveryModel.findById(id);
    if (!request) {
      throw new NotFoundException('Recovery request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    request.status = 'rejected';
    request.approverEmail = adminEmail;
    request.rejectionReason = rejectionReason || 'Rejected by administrator';
    request.resolvedAt = new Date();
    await request.save();

    const license = await this.licenseModel.findById(request.licenseId);

    // Notify Customer
    if (license?.userId) {
      this.notificationsService.notifyCustomer(
        license.userId.toString(),
        NotificationType.LICENSE_RECOVERY_REJECTED,
        `Recovery Rejected`,
        `Your recovery request for ${request.oldDomain} was rejected. Reason: ${request.rejectionReason}`,
        {
          licenseId: license._id.toString(),
          recoveryRequestId: request._id.toString(),
          rejectionReason: request.rejectionReason,
        },
        { actionUrl: `/dashboard/licenses` },
      ).catch(() => {});
    }

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'RECOVERY_REQUEST_REJECTED',
      targetType: 'license',
      targetId: request.licenseId.toString(),
      after: {
        requestId: request._id.toString(),
        reason: request.rejectionReason,
      },
    });

    return {
      success: true,
      status: 'rejected',
    };
  }

  async manualRecovery(dto: ManualRecoveryDto, adminEmail: string, clientIp?: string) {
    const license = await this.licenseModel.findById(dto.licenseId).populate('licensePlanId');
    if (!license) {
      throw new NotFoundException('License not found');
    }

    const oldActivation = await this.activationModel.findOne({
      activationId: dto.oldActivationId,
      licenseId: license._id,
      status: ActivationStatus.ACTIVE,
    });

    if (!oldActivation) {
      throw new BadRequestException('The specified activation is not currently active');
    }

    const result = await this.executeRecoveryTransfer(
      license,
      oldActivation,
      dto.newDomain,
      dto.newInstallationId,
      dto.newInstallationUrl,
      dto.reason,
      dto.reasonDetail,
      adminEmail,
      adminEmail,
      clientIp,
      license.userId?.toString(),
    );

    // Record recovery request log as immediately approved
    await this.recoveryModel.create({
      licenseId: license._id,
      productId: license.productId,
      userId: license.userId,
      requesterEmail: adminEmail,
      reason: dto.reason,
      reasonDetail: dto.reasonDetail || '',
      oldDomain: oldActivation.domain,
      oldInstallationId: oldActivation.installationId,
      oldActivationId: oldActivation.activationId,
      newDomain: dto.newDomain,
      newInstallationId: dto.newInstallationId,
      newInstallationUrl: dto.newInstallationUrl || '',
      status: 'approved',
      approverEmail: adminEmail,
      requestedIp: clientIp,
      resolvedAt: new Date(),
    });

    return {
      success: true,
      activation: result.activation,
      token: result.token,
    };
  }

  async findByUser(userId: string) {
    return this.recoveryModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('productId')
      .populate('licenseId')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getLicenseRecoveries(licenseId: string) {
    if (!Types.ObjectId.isValid(licenseId)) {
      throw new BadRequestException('Invalid license ID format');
    }
    return this.recoveryModel
      .find({ licenseId: new Types.ObjectId(licenseId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getLicenseRecoveriesForCustomer(licenseId: string, userId: string) {
    const license = await this.licenseModel.findOne({
      _id: new Types.ObjectId(licenseId),
      userId: new Types.ObjectId(userId),
    });
    if (!license) {
      throw new NotFoundException('License not found or not owned by you');
    }
    return this.getLicenseRecoveries(licenseId);
  }

  async findAll(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      filter.$or = [
        { requesterEmail: { $regex: query.search, $options: 'i' } },
        { oldDomain: { $regex: query.search, $options: 'i' } },
        { newDomain: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.recoveryModel
        .find(filter)
        .populate('productId', 'name slug')
        .populate('licenseId', 'licenseKey status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.recoveryModel.countDocuments(filter),
    ]);

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

  private async checkLimitsAndCooldown(
    licenseId: string,
    limit: number,
    cooldownHours: number,
  ) {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const recentApprovedRecoveries = await this.recoveryModel.countDocuments({
      licenseId: new Types.ObjectId(licenseId),
      status: 'approved',
      createdAt: { $gte: oneYearAgo },
    });

    if (recentApprovedRecoveries >= limit) {
      throw new BadRequestException(
        `License recovery limit reached (${limit} recoveries allowed per year). Please contact support for manual reactivation.`,
      );
    }

    // Cooldown check
    const lastApproved = await this.recoveryModel
      .findOne({
        licenseId: new Types.ObjectId(licenseId),
        status: 'approved',
      })
      .sort({ createdAt: -1 });

    if (lastApproved && cooldownHours > 0) {
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      const timeSinceLast = Date.now() - new Date((lastApproved as any).createdAt).getTime();
      if (timeSinceLast < cooldownMs) {
        const remainingHours = Math.ceil((cooldownMs - timeSinceLast) / (3600 * 1000));
        throw new BadRequestException(
          `License recovery cooldown active. Please wait ${remainingHours} hour(s) before attempting another recovery.`,
        );
      }
    }
  }

  private async executeRecoveryTransfer(
    license: LicenseDocument,
    oldActivation: ActivationDocument,
    newDomain: string,
    newInstallationId: string,
    newInstallationUrl?: string,
    reason?: string,
    reasonDetail?: string,
    requesterEmail?: string,
    approverEmail?: string,
    clientIp?: string,
    userId?: string,
  ) {
    const product = await this.productModel.findById(license.productId);
    const settings = this.activationsService.resolveEffectiveSettings(product, license);

    const oldStatus = this.mapReasonToStatus(reason || '');
    oldActivation.status = oldStatus;
    oldActivation.deactivatedAt = new Date();
    oldActivation.deactivationReason = `Recovered: ${reason || 'Inaccessible website'}`;
    await oldActivation.save();

    // Revoke old tokens
    await this.tokenModel.updateMany(
      { activationId: oldActivation.activationId },
      { $set: { isRevoked: true } },
    );

    // Free the activation slot by updating current activations count (re-evaluating from active status)
    const activeCount = await this.activationModel.countDocuments({
      licenseId: license._id,
      status: ActivationStatus.ACTIVE,
    });
    license.currentActivationCount = activeCount;
    await license.save();

    // Create New Installation
    const normalizedNewDomain = DomainNormalizer.normalize(newDomain);
    const newEnv = DomainNormalizer.detectEnvironment(newDomain);

    await this.installationModel.findOneAndUpdate(
      { installationId: newInstallationId },
      {
        $set: {
          licenseId: license._id,
          productId: license.productId,
          userId: license.userId,
          domain: newDomain,
          normalizedDomain: normalizedNewDomain,
          installationUrl: newInstallationUrl || `https://${newDomain}`,
          environment: newEnv,
          productVersion: product?.currentVersion || '1.0.0',
          ip: clientIp,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    // Create New Activation
    const newActivationId = this.activationsService.generateActivationId();
    const newActivation = await this.activationModel.create({
      activationId: newActivationId,
      licenseId: license._id,
      productId: license.productId,
      userId: license.userId,
      installationId: newInstallationId,
      domain: newDomain,
      normalizedDomain: normalizedNewDomain,
      installationUrl: newInstallationUrl || `https://${newDomain}`,
      environment: newEnv,
      status: ActivationStatus.ACTIVE,
      productVersion: product?.currentVersion || '1.0.0',
      ip: clientIp,
      activatedAt: new Date(),
      lastValidatedAt: new Date(),
    });

    // Update activation slot
    const finalActiveCount = await this.activationModel.countDocuments({
      licenseId: license._id,
      status: ActivationStatus.ACTIVE,
    });
    license.currentActivationCount = finalActiveCount;
    await license.save();

    // Sign Token
    const offlineGracePeriodDays = settings.offlineGracePeriodDays || 7;
    const validationIntervalHours = settings.validationIntervalHours || 24;
    const tokenData = this.tokenService.signActivationToken(
      {
        activationId: newActivationId,
        installationId: newInstallationId,
        licenseId: license._id.toString(),
        productId: license.productId.toString(),
        productSlug: product?.slug || 'recovered-product',
        domain: normalizedNewDomain,
        environment: newEnv,
      },
      offlineGracePeriodDays + Math.ceil(validationIntervalHours / 24) + 30,
    );

    await this.tokenModel.create({
      tokenId: tokenData.tokenId,
      activationId: newActivationId,
      licenseId: license._id,
      token: tokenData.token,
      tokenHash: this.tokenService.hashToken(tokenData.token),
      expiresAt: tokenData.expiresAt,
    });

    // Audit Log entry
    await this.auditLogModel.create({
      actorEmail: requesterEmail || 'client',
      action: 'LICENSE_ACTIVATION_RECOVERED',
      targetType: 'license',
      targetId: license._id.toString(),
      before: {
        activationId: oldActivation.activationId,
        domain: oldActivation.domain,
        installationId: oldActivation.installationId,
      },
      after: {
        recoveryRequestId: undefined,
        activationId: newActivationId,
        domain: newDomain,
        installationId: newInstallationId,
        reason,
        reasonDetail,
        approverEmail,
      },
    });

    return {
      activation: newActivation,
      token: tokenData.token,
    };
  }
}
