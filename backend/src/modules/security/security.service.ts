import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BlockedEntity,
  BlockedEntityDocument,
} from '../../database/schemas/blocked-entity.schema';
import {
  ValidationLog,
  ValidationLogDocument,
} from '../../database/schemas/validation-log.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import {
  BlockedEntityType,
  LicenseStatus,
  ActivationStatus,
  NotificationType,
  NotificationSeverity,
} from '../../common/enums/app.enums';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SecurityService {
  constructor(
    @InjectModel(BlockedEntity.name)
    private blockedModel: Model<BlockedEntityDocument>,
    @InjectModel(ValidationLog.name)
    private validationLogModel: Model<ValidationLogDocument>,
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(License.name)
    private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async getBlockedEntities(query?: { type?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.type) filter.type = query.type;
    if (query?.search) {
      filter.$or = [
        { value: { $regex: query.search, $options: 'i' } },
        { reason: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.blockedModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.blockedModel.countDocuments(filter),
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

  async blockEntity(
    dto: {
      type: BlockedEntityType;
      value: string;
      reason: string;
      expiresAt?: string;
    },
    actorEmail?: string,
  ) {
    const cleanVal = dto.value.trim().toLowerCase();
    const existing = await this.blockedModel.findOne({
      type: dto.type,
      value: cleanVal,
    });

    if (existing) {
      existing.isActive = true;
      existing.reason = dto.reason;
      if (dto.expiresAt) {
        existing.expiresAt = new Date(dto.expiresAt);
      }
      await existing.save();

      await this.auditLogModel.create({
        actorEmail: actorEmail || 'admin',
        action: 'SECURITY_ENTITY_REBLOCKED',
        targetType: 'security',
        targetId: existing._id.toString(),
        after: dto,
      });

      return existing;
    }

    const created = await this.blockedModel.create({
      type: dto.type,
      value: cleanVal,
      reason: dto.reason,
      ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
      isActive: true,
    });

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'admin',
      action: 'SECURITY_ENTITY_BLOCKED',
      targetType: 'security',
      targetId: (created as any)._id?.toString() || '',
      after: dto,
    });

    this.notificationsService.notifyAdmins(
      NotificationType.ENTITY_BLOCKED,
      `Security Entity Blocked (${dto.type.toUpperCase()}): ${dto.value}`,
      `A ${dto.type} was blocked on the security perimeter: "${dto.value}". Reason: ${dto.reason}`,
      {
        type: dto.type,
        value: dto.value,
        reason: dto.reason,
        expiresAt: dto.expiresAt,
      },
      { severity: NotificationSeverity.CRITICAL, actionUrl: '/admin/security' },
    ).catch(() => {});

    return created;
  }

  async unblockEntity(id: string, actorEmail?: string) {
    const entity = await this.blockedModel.findById(id);
    if (!entity) {
      throw new NotFoundException('Blocked entity not found');
    }

    entity.isActive = false;
    await entity.save();

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'admin',
      action: 'SECURITY_ENTITY_UNBLOCKED',
      targetType: 'security',
      targetId: id,
      before: { value: entity.value, type: entity.type },
      after: { isActive: false },
    });

    return { success: true, message: 'Entity unblocked successfully' };
  }

  async getSuspiciousLicenses() {
    const licenses = await this.licenseModel
      .find({ isArchived: false, status: { $in: [LicenseStatus.ACTIVE, LicenseStatus.SUSPENDED] } })
      .populate('productId', 'name slug currentVersion')
      .populate('userId', 'email fullName envatoUsername')
      .lean();

    const suspicious: any[] = [];

    for (const lic of licenses) {
      const activeActivations = await this.activationModel.find({
        licenseId: lic._id,
        status: ActivationStatus.ACTIVE,
      }).lean();

      const distinctDomains = new Set(activeActivations.map((a) => a.normalizedDomain)).size;
      const distinctIps = new Set(activeActivations.map((a) => a.ip).filter(Boolean)).size;

      const failedCount = await this.validationLogModel.countDocuments({
        licenseId: lic._id,
        status: { $ne: 'VALID' },
      });

      let flagReason = '';
      if (activeActivations.length > lic.activationLimit) {
        flagReason = `Slot limit exceeded: ${activeActivations.length} active vs limit of ${lic.activationLimit}`;
      } else if (distinctDomains > lic.activationLimit) {
        flagReason = `Multi-domain abuse: ${distinctDomains} distinct domains active on ${lic.activationLimit}-slot license`;
      } else if (distinctIps > 3) {
        flagReason = `Multi-IP distribution: Active from ${distinctIps} distinct IP addresses`;
      } else if (failedCount > 5) {
        flagReason = `High failed validation rate: ${failedCount} rejected attempts caught`;
      }

      if (flagReason) {
        suspicious.push({
          ...lic,
          activeDomains: activeActivations.map((a) => a.domain),
          distinctIpCount: distinctIps,
          failedValidationCount: failedCount,
          flagReason,
        });
      }
    }

    return suspicious;
  }

  async getSecurityOverview() {
    const [blockedCount, failedValidations, suspiciousEvents, totalAuditLogs, suspiciousLicenses] =
      await Promise.all([
        this.blockedModel.countDocuments({ isActive: true }),
        this.validationLogModel.countDocuments({
          status: { $in: ['TOKEN_INVALID', 'DOMAIN_MISMATCH', 'INSTALLATION_MISMATCH', 'BLOCKED', 'EXPIRED'] },
        }),
        this.validationLogModel
          .find({ status: { $ne: 'VALID' } })
          .sort({ timestamp: -1 })
          .limit(10)
          .lean(),
        this.auditLogModel.countDocuments(),
        this.getSuspiciousLicenses(),
      ]);

    return {
      blockedEntitiesCount: blockedCount,
      failedValidationsCount: failedValidations,
      suspiciousLicensesCount: suspiciousLicenses.length,
      totalAuditLogsCount: totalAuditLogs,
      recentSuspiciousEvents: suspiciousEvents,
      suspiciousLicenses,
    };
  }

  async suspendLicense(licenseId: string, reason: string, actorEmail: string) {
    const license = await this.licenseModel.findById(licenseId);
    if (!license) {
      throw new NotFoundException('License not found');
    }

    license.status = LicenseStatus.SUSPENDED;
    license.notes.push({
      note: `Security Panel Suspension: ${reason}`,
      author: actorEmail,
      createdAt: new Date(),
    });
    await license.save();

    await this.activationModel.updateMany(
      { licenseId: license._id, status: ActivationStatus.ACTIVE },
      {
        $set: {
          status: ActivationStatus.SUSPENDED,
          deactivatedAt: new Date(),
          deactivationReason: reason || 'Suspended via Security Panel',
        },
      },
    );

    await this.auditLogModel.create({
      actorEmail,
      action: 'SECURITY_LICENSE_SUSPENDED',
      targetType: 'license',
      targetId: license._id.toString(),
      after: { licenseKey: license.licenseKey, reason },
    });

    return license;
  }

  async revokeLicense(licenseId: string, reason: string, actorEmail: string) {
    const license = await this.licenseModel.findById(licenseId);
    if (!license) {
      throw new NotFoundException('License not found');
    }

    license.status = LicenseStatus.REVOKED;
    license.notes.push({
      note: `Security Panel Revocation: ${reason}`,
      author: actorEmail,
      createdAt: new Date(),
    });
    await license.save();

    await this.activationModel.updateMany(
      { licenseId: license._id, status: ActivationStatus.ACTIVE },
      {
        $set: {
          status: ActivationStatus.REVOKED,
          deactivatedAt: new Date(),
          deactivationReason: reason || 'Revoked via Security Panel',
        },
      },
    );

    await this.auditLogModel.create({
      actorEmail,
      action: 'SECURITY_LICENSE_REVOKED',
      targetType: 'license',
      targetId: license._id.toString(),
      after: { licenseKey: license.licenseKey, reason },
    });

    return license;
  }
}
