import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { License, LicenseDocument } from '../../database/schemas/license.schema';
import { Activation, ActivationDocument } from '../../database/schemas/activation.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { LicenseStatus, ActivationStatus } from '../../common/enums/app.enums';

export interface ProductKillSwitchDto {
  disableNewActivations?: boolean;
  disableValidation?: boolean;
  disableUpdatesDownloads?: boolean;
  isProductSuspended?: boolean;
  suspendAllActiveInstallations?: boolean;
  restoreAllInstallations?: boolean;
  reason: string;
}

export interface BulkEmergencyActionDto {
  licenseIds?: string[];
  activationIds?: string[];
  reason: string;
  critical?: boolean;
}

@Injectable()
export class EmergencyService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name) private activationModel: Model<ActivationDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Set or update product-level emergency kill-switch flags
   */
  async setProductKillSwitch(
    productId: string,
    dto: ProductKillSwitchDto,
    adminEmail: string,
  ) {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException('A clear reason (min 5 characters) is required for emergency actions.');
    }

    const product: any = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const beforeState = JSON.parse(JSON.stringify(product.emergencyKillSwitch || {}));

    const current = product.emergencyKillSwitch || {};
    const updatedFlags = {
      disableNewActivations: dto.disableNewActivations ?? current.disableNewActivations ?? false,
      disableValidation: dto.disableValidation ?? current.disableValidation ?? false,
      disableUpdatesDownloads: dto.disableUpdatesDownloads ?? current.disableUpdatesDownloads ?? false,
      isProductSuspended: dto.isProductSuspended ?? current.isProductSuspended ?? false,
      activeReason: dto.reason.trim(),
      activatedAt: new Date(),
      activatedBy: adminEmail,
    };

    product.emergencyKillSwitch = updatedFlags;
    await product.save();

    let affectedActivations = 0;
    let affectedLicenses = 0;

    if (dto.suspendAllActiveInstallations) {
      const actRes = await this.activationModel.updateMany(
        { productId: product._id, status: ActivationStatus.ACTIVE },
        {
          $set: {
            status: ActivationStatus.SUSPENDED,
            suspendedReason: dto.reason,
            suspendedAt: new Date(),
          },
        },
      );
      affectedActivations = actRes.modifiedCount;

      const licRes = await this.licenseModel.updateMany(
        { productId: product._id, status: LicenseStatus.ACTIVE },
        {
          $set: {
            status: LicenseStatus.SUSPENDED,
            suspendedReason: dto.reason,
            suspendedAt: new Date(),
          },
        },
      );
      affectedLicenses = licRes.modifiedCount;
    } else if (dto.restoreAllInstallations) {
      const actRes = await this.activationModel.updateMany(
        { productId: product._id, status: ActivationStatus.SUSPENDED },
        {
          $set: {
            status: ActivationStatus.ACTIVE,
            suspendedReason: null,
            suspendedAt: null,
          },
        },
      );
      affectedActivations = actRes.modifiedCount;

      const licRes = await this.licenseModel.updateMany(
        { productId: product._id, status: LicenseStatus.SUSPENDED },
        {
          $set: {
            status: LicenseStatus.ACTIVE,
            suspendedReason: null,
            suspendedAt: null,
          },
        },
      );
      affectedLicenses = licRes.modifiedCount;
    }

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'PRODUCT_KILL_SWITCH_UPDATED',
      targetType: 'product',
      targetId: product._id.toString(),
      before: beforeState,
      after: {
        ...updatedFlags,
        affectedActivations,
        affectedLicenses,
      },
    });

    return {
      success: true,
      message: `Emergency kill-switch updated for ${product.name}.`,
      productName: product.name,
      emergencyKillSwitch: product.emergencyKillSwitch,
      affectedActivations,
      affectedLicenses,
    };
  }

  /**
   * Instantly revoke a single license
   */
  async revokeLicense(
    licenseId: string,
    reason: string,
    critical: boolean = false,
    adminEmail: string,
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A reason (min 5 chars) is required for license revocation.');
    }

    const license: any = await this.licenseModel.findById(licenseId);
    if (!license) {
      throw new NotFoundException('License not found');
    }

    const beforeStatus = license.status;
    license.status = LicenseStatus.REVOKED;
    license.revokedAt = new Date();
    license.revocationReason = reason.trim();
    license.isCriticalRevoked = !!critical;
    await license.save();

    // Revoke all associated activations
    const actRes = await this.activationModel.updateMany(
      { licenseId: license._id },
      {
        $set: {
          status: ActivationStatus.REVOKED,
          revokedAt: new Date(),
          revocationReason: reason.trim(),
          isCriticalRevoked: !!critical,
        },
      },
    );

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'LICENSE_REVOKED',
      targetType: 'license',
      targetId: license._id.toString(),
      before: { status: beforeStatus },
      after: {
        status: LicenseStatus.REVOKED,
        reason,
        critical,
        revokedActivationsCount: actRes.modifiedCount,
      },
    });

    return {
      success: true,
      message: `License ${license.licenseKey} revoked successfully.`,
      licenseKey: license.licenseKey,
      status: LicenseStatus.REVOKED,
      isCriticalRevoked: !!critical,
      revokedActivationsCount: actRes.modifiedCount,
    };
  }

  /**
   * Instantly suspend a single license
   */
  async suspendLicense(licenseId: string, reason: string, adminEmail: string) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A reason (min 5 chars) is required for license suspension.');
    }

    const license: any = await this.licenseModel.findById(licenseId);
    if (!license) {
      throw new NotFoundException('License not found');
    }

    const beforeStatus = license.status;
    license.status = LicenseStatus.SUSPENDED;
    license.suspendedAt = new Date();
    license.suspendedReason = reason.trim();
    await license.save();

    // Suspend associated activations
    const actRes = await this.activationModel.updateMany(
      { licenseId: license._id, status: ActivationStatus.ACTIVE },
      {
        $set: {
          status: ActivationStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspendedReason: reason.trim(),
        },
      },
    );

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'LICENSE_SUSPENDED',
      targetType: 'license',
      targetId: license._id.toString(),
      before: { status: beforeStatus },
      after: {
        status: LicenseStatus.SUSPENDED,
        reason,
        suspendedActivationsCount: actRes.modifiedCount,
      },
    });

    return {
      success: true,
      message: `License ${license.licenseKey} temporarily suspended.`,
      licenseKey: license.licenseKey,
      status: LicenseStatus.SUSPENDED,
      suspendedActivationsCount: actRes.modifiedCount,
    };
  }

  /**
   * Restore a suspended license back to active
   */
  async restoreLicense(licenseId: string, reason: string, adminEmail: string) {
    const license: any = await this.licenseModel.findById(licenseId);
    if (!license) {
      throw new NotFoundException('License not found');
    }

    const beforeStatus = license.status;
    license.status = LicenseStatus.ACTIVE;
    license.suspendedAt = null;
    license.suspendedReason = null;
    license.revokedAt = null;
    license.revocationReason = null;
    license.isCriticalRevoked = false;
    await license.save();

    const actRes = await this.activationModel.updateMany(
      { licenseId: license._id, status: ActivationStatus.SUSPENDED },
      {
        $set: {
          status: ActivationStatus.ACTIVE,
          suspendedAt: null,
          suspendedReason: null,
        },
      },
    );

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'LICENSE_RESTORED',
      targetType: 'license',
      targetId: license._id.toString(),
      before: { status: beforeStatus },
      after: {
        status: LicenseStatus.ACTIVE,
        reason,
        restoredActivationsCount: actRes.modifiedCount,
      },
    });

    return {
      success: true,
      message: `License ${license.licenseKey} restored to active status.`,
      licenseKey: license.licenseKey,
      status: LicenseStatus.ACTIVE,
      restoredActivationsCount: actRes.modifiedCount,
    };
  }

  /**
   * Instantly revoke a single activation / installation
   */
  async revokeActivation(
    activationId: string,
    reason: string,
    critical: boolean = false,
    adminEmail: string,
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A reason (min 5 chars) is required for activation revocation.');
    }

    let act: any = await this.activationModel.findById(activationId);
    if (!act) {
      act = await this.activationModel.findOne({ activationId });
    }
    if (!act) {
      throw new NotFoundException('Activation not found');
    }

    const beforeStatus = act.status;
    act.status = ActivationStatus.REVOKED;
    act.revokedAt = new Date();
    act.revocationReason = reason.trim();
    act.isCriticalRevoked = !!critical;
    await act.save();

    // Decrement slot count on parent license
    const lic: any = await this.licenseModel.findById(act.licenseId);
    if (lic && lic.currentActivationCount > 0) {
      lic.currentActivationCount -= 1;
      await lic.save();
    }

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'ACTIVATION_REVOKED',
      targetType: 'activation',
      targetId: act._id.toString(),
      before: { status: beforeStatus },
      after: {
        status: ActivationStatus.REVOKED,
        installationId: act.installationId,
        domain: act.domain,
        reason,
        critical,
      },
    });

    return {
      success: true,
      message: `Installation on ${act.domain} (${act.installationId}) revoked successfully.`,
      activationId: act.activationId,
      status: ActivationStatus.REVOKED,
      isCriticalRevoked: !!critical,
    };
  }

  /**
   * Instantly suspend a single activation
   */
  async suspendActivation(activationId: string, reason: string, adminEmail: string) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A reason (min 5 chars) is required for activation suspension.');
    }

    let act: any = await this.activationModel.findById(activationId);
    if (!act) {
      act = await this.activationModel.findOne({ activationId });
    }
    if (!act) {
      throw new NotFoundException('Activation not found');
    }

    const beforeStatus = act.status;
    act.status = ActivationStatus.SUSPENDED;
    act.suspendedAt = new Date();
    act.suspendedReason = reason.trim();
    await act.save();

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'ACTIVATION_SUSPENDED',
      targetType: 'activation',
      targetId: act._id.toString(),
      before: { status: beforeStatus },
      after: {
        status: ActivationStatus.SUSPENDED,
        installationId: act.installationId,
        domain: act.domain,
        reason,
      },
    });

    return {
      success: true,
      message: `Installation on ${act.domain} (${act.installationId}) suspended.`,
      activationId: act.activationId,
      status: ActivationStatus.SUSPENDED,
    };
  }

  /**
   * Restore a suspended activation
   */
  async restoreActivation(activationId: string, reason: string, adminEmail: string) {
    let act: any = await this.activationModel.findById(activationId);
    if (!act) {
      act = await this.activationModel.findOne({ activationId });
    }
    if (!act) {
      throw new NotFoundException('Activation not found');
    }

    const beforeStatus = act.status;
    act.status = ActivationStatus.ACTIVE;
    act.suspendedAt = null;
    act.suspendedReason = null;
    act.revokedAt = null;
    act.revocationReason = null;
    act.isCriticalRevoked = false;
    await act.save();

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'ACTIVATION_RESTORED',
      targetType: 'activation',
      targetId: act._id.toString(),
      before: { status: beforeStatus },
      after: {
        status: ActivationStatus.ACTIVE,
        installationId: act.installationId,
        domain: act.domain,
        reason,
      },
    });

    return {
      success: true,
      message: `Installation on ${act.domain} restored to active status.`,
      activationId: act.activationId,
      status: ActivationStatus.ACTIVE,
    };
  }

  /**
   * Bulk Revoke Licenses and/or Activations
   */
  async bulkRevoke(dto: BulkEmergencyActionDto, adminEmail: string) {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException('A reason (min 5 chars) is required for bulk revocation.');
    }

    let revokedLicensesCount = 0;
    let revokedActivationsCount = 0;

    if (dto.licenseIds && dto.licenseIds.length > 0) {
      const licRes = await this.licenseModel.updateMany(
        { _id: { $in: dto.licenseIds } },
        {
          $set: {
            status: LicenseStatus.REVOKED,
            revokedAt: new Date(),
            revocationReason: dto.reason.trim(),
            isCriticalRevoked: !!dto.critical,
          },
        },
      );
      revokedLicensesCount = licRes.modifiedCount;

      const actRes = await this.activationModel.updateMany(
        { licenseId: { $in: dto.licenseIds } },
        {
          $set: {
            status: ActivationStatus.REVOKED,
            revokedAt: new Date(),
            revocationReason: dto.reason.trim(),
            isCriticalRevoked: !!dto.critical,
          },
        },
      );
      revokedActivationsCount += actRes.modifiedCount;
    }

    if (dto.activationIds && dto.activationIds.length > 0) {
      const actRes = await this.activationModel.updateMany(
        { _id: { $in: dto.activationIds } },
        {
          $set: {
            status: ActivationStatus.REVOKED,
            revokedAt: new Date(),
            revocationReason: dto.reason.trim(),
            isCriticalRevoked: !!dto.critical,
          },
        },
      );
      revokedActivationsCount += actRes.modifiedCount;
    }

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'BULK_REVOCATION_EXECUTED',
      targetType: 'system',
      after: {
        reason: dto.reason,
        critical: dto.critical,
        revokedLicensesCount,
        revokedActivationsCount,
      },
    });

    return {
      success: true,
      message: `Bulk revocation executed: ${revokedLicensesCount} licenses and ${revokedActivationsCount} activations revoked.`,
      revokedLicensesCount,
      revokedActivationsCount,
      isCriticalRevoked: !!dto.critical,
    };
  }

  /**
   * Bulk Suspend Licenses and/or Activations
   */
  async bulkSuspend(dto: BulkEmergencyActionDto, adminEmail: string) {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException('A reason (min 5 chars) is required for bulk suspension.');
    }

    let suspendedLicensesCount = 0;
    let suspendedActivationsCount = 0;

    if (dto.licenseIds && dto.licenseIds.length > 0) {
      const licRes = await this.licenseModel.updateMany(
        { _id: { $in: dto.licenseIds }, status: LicenseStatus.ACTIVE },
        {
          $set: {
            status: LicenseStatus.SUSPENDED,
            suspendedAt: new Date(),
            suspendedReason: dto.reason.trim(),
          },
        },
      );
      suspendedLicensesCount = licRes.modifiedCount;

      const actRes = await this.activationModel.updateMany(
        { licenseId: { $in: dto.licenseIds }, status: ActivationStatus.ACTIVE },
        {
          $set: {
            status: ActivationStatus.SUSPENDED,
            suspendedAt: new Date(),
            suspendedReason: dto.reason.trim(),
          },
        },
      );
      suspendedActivationsCount += actRes.modifiedCount;
    }

    if (dto.activationIds && dto.activationIds.length > 0) {
      const actRes = await this.activationModel.updateMany(
        { _id: { $in: dto.activationIds }, status: ActivationStatus.ACTIVE },
        {
          $set: {
            status: ActivationStatus.SUSPENDED,
            suspendedAt: new Date(),
            suspendedReason: dto.reason.trim(),
          },
        },
      );
      suspendedActivationsCount += actRes.modifiedCount;
    }

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'BULK_SUSPENSION_EXECUTED',
      targetType: 'system',
      after: {
        reason: dto.reason,
        suspendedLicensesCount,
        suspendedActivationsCount,
      },
    });

    return {
      success: true,
      message: `Bulk suspension executed: ${suspendedLicensesCount} licenses and ${suspendedActivationsCount} activations suspended.`,
      suspendedLicensesCount,
      suspendedActivationsCount,
    };
  }

  /**
   * Bulk Restore Licenses and/or Activations
   */
  async bulkRestore(dto: BulkEmergencyActionDto, adminEmail: string) {
    let restoredLicensesCount = 0;
    let restoredActivationsCount = 0;

    if (dto.licenseIds && dto.licenseIds.length > 0) {
      const licRes = await this.licenseModel.updateMany(
        { _id: { $in: dto.licenseIds } },
        {
          $set: {
            status: LicenseStatus.ACTIVE,
            suspendedAt: null,
            suspendedReason: null,
            revokedAt: null,
            revocationReason: null,
            isCriticalRevoked: false,
          },
        },
      );
      restoredLicensesCount = licRes.modifiedCount;

      const actRes = await this.activationModel.updateMany(
        { licenseId: { $in: dto.licenseIds } },
        {
          $set: {
            status: ActivationStatus.ACTIVE,
            suspendedAt: null,
            suspendedReason: null,
            revokedAt: null,
            revocationReason: null,
            isCriticalRevoked: false,
          },
        },
      );
      restoredActivationsCount += actRes.modifiedCount;
    }

    if (dto.activationIds && dto.activationIds.length > 0) {
      const actRes = await this.activationModel.updateMany(
        { _id: { $in: dto.activationIds } },
        {
          $set: {
            status: ActivationStatus.ACTIVE,
            suspendedAt: null,
            suspendedReason: null,
            revokedAt: null,
            revocationReason: null,
            isCriticalRevoked: false,
          },
        },
      );
      restoredActivationsCount += actRes.modifiedCount;
    }

    await this.auditLogModel.create({
      actorEmail: adminEmail,
      action: 'BULK_RESTORATION_EXECUTED',
      targetType: 'system',
      after: {
        reason: dto.reason,
        restoredLicensesCount,
        restoredActivationsCount,
      },
    });

    return {
      success: true,
      message: `Bulk restoration executed: ${restoredLicensesCount} licenses and ${restoredActivationsCount} activations restored.`,
      restoredLicensesCount,
      restoredActivationsCount,
    };
  }

  /**
   * Get Emergency Overview statistics and audit trail
   */
  async getEmergencyOverview(productId?: string) {
    const filter = productId ? { productId: new Types.ObjectId(productId) } : {};

    const [
      totalRevokedLicenses,
      totalSuspendedLicenses,
      totalCriticalRevokedLicenses,
      totalRevokedActivations,
      totalSuspendedActivations,
      productsWithKillSwitch,
      recentEmergencyLogs,
    ] = await Promise.all([
      this.licenseModel.countDocuments({ ...filter, status: LicenseStatus.REVOKED }),
      this.licenseModel.countDocuments({ ...filter, status: LicenseStatus.SUSPENDED }),
      this.licenseModel.countDocuments({ ...filter, isCriticalRevoked: true }),
      this.activationModel.countDocuments({ ...filter, status: ActivationStatus.REVOKED }),
      this.activationModel.countDocuments({ ...filter, status: ActivationStatus.SUSPENDED }),
      this.productModel.find({
        $or: [
          { 'emergencyKillSwitch.disableNewActivations': true },
          { 'emergencyKillSwitch.disableValidation': true },
          { 'emergencyKillSwitch.disableUpdatesDownloads': true },
          { 'emergencyKillSwitch.isProductSuspended': true },
        ],
      }),
      this.auditLogModel
        .find({
          action: {
            $in: [
              'PRODUCT_KILL_SWITCH_UPDATED',
              'LICENSE_REVOKED',
              'LICENSE_SUSPENDED',
              'LICENSE_RESTORED',
              'ACTIVATION_REVOKED',
              'ACTIVATION_SUSPENDED',
              'ACTIVATION_RESTORED',
              'BULK_REVOCATION_EXECUTED',
              'BULK_SUSPENSION_EXECUTED',
              'BULK_RESTORATION_EXECUTED',
            ],
          },
        })
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    return {
      stats: {
        totalRevokedLicenses,
        totalSuspendedLicenses,
        totalCriticalRevokedLicenses,
        totalRevokedActivations,
        totalSuspendedActivations,
        activeProductKillSwitches: productsWithKillSwitch.length,
      },
      productsWithKillSwitch: productsWithKillSwitch.map((p: any) => ({
        productId: p._id.toString(),
        name: p.name,
        slug: p.slug,
        emergencyKillSwitch: p.emergencyKillSwitch,
      })),
      recentEmergencyLogs,
    };
  }
}
