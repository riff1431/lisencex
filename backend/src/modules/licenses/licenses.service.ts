import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import {
  Installation,
  InstallationDocument,
} from '../../database/schemas/installation.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import {
  LicensePlan,
  LicensePlanDocument,
} from '../../database/schemas/license-plan.schema';
import {
  LicenseRecoveryRequest,
  LicenseRecoveryRequestDocument,
} from '../../database/schemas/license-recovery.schema';
import {
  LicenseStatus,
  LicenseType,
  MarketplaceProviderType,
  ActivationStatus,
  UserRole,
} from '../../common/enums/app.enums';
import {
  CreateManualLicenseDto,
  CreateBulkLicensesDto,
  UpdateLicenseDto,
  LicenseActionDto,
  AddLicenseNoteDto,
} from './dto/license.dto';

@Injectable()
export class LicensesService {
  constructor(
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
    @InjectModel(Installation.name)
    private installationModel: Model<InstallationDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(LicensePlan.name) private licensePlanModel: Model<LicensePlanDocument>,
    @InjectModel(LicenseRecoveryRequest.name)
    private recoveryModel: Model<LicenseRecoveryRequestDocument>,
  ) {}

  generateLicenseKey(): { licenseKey: string; licenseKeyHash: string } {
    const raw = crypto.randomBytes(10).toString('hex').toUpperCase();
    const chunks = raw.match(/.{1,4}/g) || [];
    const licenseKey = `LIC-${chunks.slice(0, 4).join('-')}`;
    const licenseKeyHash = crypto
      .createHash('sha256')
      .update(licenseKey)
      .digest('hex');
    return { licenseKey, licenseKeyHash };
  }

  async createLicenseForPurchase(
    purchase: any,
    product: any,
    user: any,
    options?: {
      licenseType?: LicenseType;
      actorEmail?: string;
    },
  ) {
    // Prevent duplicate license for the exact same purchase
    const existing = await this.licenseModel.findOne({
      purchaseId: purchase._id,
    });
    if (existing) {
      return existing;
    }

    const { licenseKey, licenseKeyHash } = this.generateLicenseKey();

    // ── Resolve effective plan ──────────────────────────────────────
    const isEnvato =
      purchase.source === MarketplaceProviderType.ENVATO ||
      purchase.source === 'envato';

    const planId = isEnvato
      ? product.envatoLicensePlanId
      : product.defaultLicensePlanId;

    let resolvedPlan: any = null;
    if (planId) {
      resolvedPlan = await this.licensePlanModel.findById(planId).lean();
    }

    // Merge: plan defaults → product licenseSettings → product overrides
    const licenseSettings = product.licenseSettings || {};
    const overrides = product.licenseSettingsOverrides || {};

    const effectiveActivationLimit =
      overrides.defaultActivationLimit ??
      (resolvedPlan ? resolvedPlan.activationLimit : null) ??
      licenseSettings.defaultActivationLimit ??
      1;

    const effectiveLicenseDurationDays =
      overrides.licenseDurationDays ??
      (resolvedPlan ? resolvedPlan.licenseDurationDays : null) ??
      licenseSettings.licenseDurationDays ??
      0;

    const effectiveSupportDurationDays =
      overrides.supportDurationDays ??
      (resolvedPlan ? resolvedPlan.supportDurationDays : null) ??
      licenseSettings.supportDurationDays ??
      180;

    let expiresAt: Date | undefined = undefined;
    if (effectiveLicenseDurationDays && effectiveLicenseDurationDays > 0) {
      expiresAt = new Date(
        Date.now() + effectiveLicenseDurationDays * 24 * 60 * 60 * 1000,
      );
    }

    let supportExpiresAt: Date | undefined = undefined;
    if (purchase.supportExpiresAt) {
      supportExpiresAt = new Date(purchase.supportExpiresAt);
    } else if (effectiveSupportDurationDays && effectiveSupportDurationDays > 0) {
      supportExpiresAt = new Date(
        Date.now() + effectiveSupportDurationDays * 24 * 60 * 60 * 1000,
      );
    }

    const licenseType =
      options?.licenseType ||
      (purchase.licenseType === 'extended'
        ? LicenseType.EXTENDED
        : LicenseType.REGULAR);

    const license = await this.licenseModel.create({
      licenseKey,
      licenseKeyHash,
      productId: product._id,
      userId: user._id,
      purchaseId: purchase._id,
      licenseType,
      status: LicenseStatus.ACTIVE,
      activationLimit: effectiveActivationLimit,
      currentActivationCount: 0,
      ...(expiresAt ? { expiresAt } : {}),
      ...(supportExpiresAt ? { supportExpiresAt } : {}),
      source: purchase.source || MarketplaceProviderType.INTERNAL,
      ...(resolvedPlan ? { licensePlanId: resolvedPlan._id } : {}),
      issuedAt: new Date(),
    });

    await this.auditLogModel.create({
      actorEmail: options?.actorEmail || user.email || 'system',
      action: 'AUTOMATIC_LICENSE_CREATED',
      targetType: 'license',
      targetId: license._id.toString(),
      after: {
        licenseKey,
        productId: product._id.toString(),
        userId: user._id.toString(),
        purchaseId: purchase._id.toString(),
        source: purchase.source,
      },
    });

    return license;
  }

  async createManual(dto: CreateManualLicenseDto, actorEmail?: string) {
    const product = await this.productModel.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let userId = dto.userId;
    if (!userId && dto.customerEmail) {
      const email = dto.customerEmail.toLowerCase().trim();
      let autoUser = await this.userModel.findOne({ email });
      if (!autoUser) {
        const createdUser = await this.userModel.create({
          fullName: dto.customerFullName || email.split('@')[0],
          email,
          passwordHash: crypto.randomBytes(32).toString('hex'), // dummy password
          role: UserRole.CUSTOMER,
        });
        autoUser = createdUser as any;
        if (autoUser) {
          await this.auditLogModel.create({
            actorEmail: actorEmail || 'system',
            action: 'USER_AUTO_CREATED',
            targetType: 'user',
            targetId: autoUser._id.toString(),
            after: { email, fullName: autoUser.fullName },
          });
        }
      }
      userId = autoUser!._id.toString();
    }

    if (!userId) {
      throw new BadRequestException('User ID or Customer Email is required to assign the license');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.purchaseId) {
      const existing = await this.licenseModel.findOne({
        purchaseId: dto.purchaseId,
      });
      if (existing) {
        throw new BadRequestException(
          'A license already exists for this purchase',
        );
      }
    }

    const { licenseKey, licenseKeyHash } = this.generateLicenseKey();
    
    // Resolve license settings defaults
    let resolvedSettings = product.licenseSettings || {};
    let licensePlanId: any = dto.licensePlanId || product.defaultLicensePlanId;
    if (licensePlanId) {
      const plan = await this.licensePlanModel.findById(licensePlanId);
      if (plan) {
        resolvedSettings = plan as any;
      }
    }

    let expiresAt: Date | undefined = undefined;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
    } else if (
      resolvedSettings.licenseDurationDays &&
      resolvedSettings.licenseDurationDays > 0
    ) {
      expiresAt = new Date(
        Date.now() + resolvedSettings.licenseDurationDays * 24 * 60 * 60 * 1000,
      );
    }

    let supportExpiresAt: Date | undefined = undefined;
    if (dto.supportExpiresAt) {
      supportExpiresAt = new Date(dto.supportExpiresAt);
    } else if (
      resolvedSettings.supportDurationDays &&
      resolvedSettings.supportDurationDays > 0
    ) {
      supportExpiresAt = new Date(
        Date.now() + resolvedSettings.supportDurationDays * 24 * 60 * 60 * 1000,
      );
    }

    const activationLimit =
      dto.activationLimit || resolvedSettings.defaultActivationLimit || (resolvedSettings as any).activationLimit || 1;

    const notes = dto.notes
      ? [{ note: dto.notes, author: actorEmail || 'admin', createdAt: new Date() }]
      : [];

    const license = await this.licenseModel.create({
      licenseKey,
      licenseKeyHash,
      productId: product._id,
      userId: user._id,
      ...(dto.purchaseId ? { purchaseId: new Types.ObjectId(dto.purchaseId) } : {}),
      licenseType: dto.licenseType || LicenseType.REGULAR,
      status: LicenseStatus.ACTIVE,
      activationLimit,
      currentActivationCount: 0,
      ...(expiresAt ? { expiresAt } : {}),
      ...(supportExpiresAt ? { supportExpiresAt } : {}),
      source: dto.source || MarketplaceProviderType.MANUAL,
      notes,
      issuedAt: new Date(),
      licensePlanId: licensePlanId ? new Types.ObjectId(licensePlanId) : undefined,
    });

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'system',
      action: 'MANUAL_LICENSE_CREATED',
      targetType: 'license',
      targetId: (license as any)._id?.toString() || '',
      after: {
        licenseKey,
        productId: product._id.toString(),
        userId: user._id.toString(),
        source: license.source,
      },
    });

    return license;
  }

  async createBulk(dto: CreateBulkLicensesDto, actorEmail?: string) {
    const product = await this.productModel.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let targetUserId = dto.userId;
    if (!targetUserId) {
      // Find or create default bulk/unassigned user
      let unassignedUser = await this.userModel.findOne({ email: 'unassigned@system.local' });
      if (!unassignedUser) {
        const createdUser = await this.userModel.create({
          fullName: 'Unassigned Bulk Keys',
          email: 'unassigned@system.local',
          passwordHash: crypto.randomBytes(32).toString('hex'),
          role: UserRole.CUSTOMER,
        });
        unassignedUser = createdUser as any;
      }
      targetUserId = unassignedUser!._id.toString();
    }

    const user = await this.userModel.findById(targetUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let resolvedSettings = product.licenseSettings || {};
    let licensePlanId: any = dto.licensePlanId || product.defaultLicensePlanId;
    if (licensePlanId) {
      const plan = await this.licensePlanModel.findById(licensePlanId);
      if (plan) {
        resolvedSettings = plan as any;
      }
    }

    let expiresAt: Date | undefined = undefined;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
    } else if (
      resolvedSettings.licenseDurationDays &&
      resolvedSettings.licenseDurationDays > 0
    ) {
      expiresAt = new Date(
        Date.now() + resolvedSettings.licenseDurationDays * 24 * 60 * 60 * 1000,
      );
    }

    let supportExpiresAt: Date | undefined = undefined;
    if (dto.supportExpiresAt) {
      supportExpiresAt = new Date(dto.supportExpiresAt);
    } else if (
      resolvedSettings.supportDurationDays &&
      resolvedSettings.supportDurationDays > 0
    ) {
      supportExpiresAt = new Date(
        Date.now() + resolvedSettings.supportDurationDays * 24 * 60 * 60 * 1000,
      );
    }

    const activationLimit =
      dto.activationLimit || resolvedSettings.defaultActivationLimit || (resolvedSettings as any).activationLimit || 1;

    const notes = dto.notes
      ? [{ note: dto.notes, author: actorEmail || 'admin', createdAt: new Date() }]
      : [];

    const licenses: LicenseDocument[] = [];

    for (let i = 0; i < dto.quantity; i++) {
      const { licenseKey, licenseKeyHash } = this.generateLicenseKey();

      const license = await this.licenseModel.create({
        licenseKey,
        licenseKeyHash,
        productId: product._id,
        userId: user._id,
        licenseType: dto.licenseType || LicenseType.REGULAR,
        status: LicenseStatus.ACTIVE,
        activationLimit,
        currentActivationCount: 0,
        ...(expiresAt ? { expiresAt } : {}),
        ...(supportExpiresAt ? { supportExpiresAt } : {}),
        source: dto.source || MarketplaceProviderType.BULK,
        notes,
        issuedAt: new Date(),
        licensePlanId: licensePlanId ? new Types.ObjectId(licensePlanId) : undefined,
      });

      licenses.push(license);

      await this.auditLogModel.create({
        actorEmail: actorEmail || 'system',
        action: 'LICENSE_CREATED',
        targetType: 'license',
        targetId: (license as any)._id?.toString() || '',
        after: {
          licenseKey: license.licenseKey,
          productId: product._id.toString(),
          userId: user._id.toString(),
          source: license.source,
          notes: dto.notes,
        },
      });
    }

    return licenses;
  }

  async exportBulkCsv(licenseIds: string[]): Promise<string> {
    const ids = licenseIds.map((id) => new Types.ObjectId(id));
    const licenses = await this.licenseModel
      .find({ _id: { $in: ids } })
      .populate('productId')
      .populate('licensePlanId')
      .populate('userId');

    let csv = 'License Key,Product Name,Product Slug,Source,Status,Activation Limit,Expiration Date,Support Expiration Date,Plan Name\n';

    for (const lic of licenses) {
      const row = [
        lic.licenseKey,
        `"${lic.productId ? (lic.productId as any).name : ''}"`,
        lic.productId ? (lic.productId as any).slug : '',
        lic.source,
        lic.status,
        lic.activationLimit,
        lic.expiresAt ? lic.expiresAt.toISOString() : 'Lifetime',
        lic.supportExpiresAt ? lic.supportExpiresAt.toISOString() : 'None',
        lic.licensePlanId ? `"${(lic.licensePlanId as any).name}"` : 'None',
      ];
      csv += row.join(',') + '\n';
    }

    return csv;
  }

  async findAll(query?: {
    search?: string;
    status?: string;
    productId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = { isArchived: false };
    if (query?.status) filter.status = query.status;
    if (query?.productId && Types.ObjectId.isValid(query.productId)) {
      filter.productId = new Types.ObjectId(query.productId);
    }
    if (query?.userId && Types.ObjectId.isValid(query.userId)) {
      filter.userId = new Types.ObjectId(query.userId);
    }
    if (query?.search) {
      filter.$or = [
        { licenseKey: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.licenseModel
        .find(filter)
        .populate('productId', 'name slug logoUrl productType currentVersion')
        .populate('userId', 'email fullName envatoUsername')
        .populate('purchaseId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.licenseModel.countDocuments(filter),
    ]);

    const enriched = await Promise.all(
      items.map(async (lic) => {
        const activeCount = await this.activationModel.countDocuments({
          licenseId: lic._id,
          status: ActivationStatus.ACTIVE,
        });
        return {
          ...lic,
          currentActivationCount: activeCount,
        };
      }),
    );

    return {
      items: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid license ID');
    }

    const license = await this.licenseModel
      .findById(id)
      .populate('productId')
      .populate('userId', 'email fullName envatoUsername')
      .populate('purchaseId')
      .lean();

    if (!license) {
      throw new NotFoundException('License not found');
    }

    const activations = await this.activationModel
      .find({ licenseId: license._id })
      .sort({ createdAt: -1 })
      .lean();

    const installations = await this.installationModel
      .find({ licenseId: license._id })
      .sort({ lastSeenAt: -1 })
      .lean();

    const recoveries = await this.recoveryModel
      .find({ licenseId: license._id })
      .sort({ createdAt: -1 })
      .lean();

    const realActiveCount = activations.filter(
      (a) => a.status === ActivationStatus.ACTIVE,
    ).length;

    return {
      ...license,
      currentActivationCount: realActiveCount,
      activations,
      installations,
      recoveries,
    };
  }

  async findByCustomer(userId: string) {
    const licenses = await this.licenseModel
      .find({ userId: new Types.ObjectId(userId), isArchived: false })
      .populate('productId', 'name slug logoUrl productType currentVersion latestStableVersion')
      .populate('purchaseId')
      .sort({ createdAt: -1 })
      .lean();

    return Promise.all(
      licenses.map(async (lic) => {
        const activeActivations = await this.activationModel
          .find({
            licenseId: lic._id,
            status: ActivationStatus.ACTIVE,
          })
          .select('activationId domain installationUrl environment activatedAt lastValidatedAt')
          .lean();

        return {
          ...lic,
          currentActivationCount: activeActivations.length,
          activeActivations,
        };
      }),
    );
  }

  async executeAction(id: string, dto: LicenseActionDto, actorEmail?: string) {
    const license = await this.licenseModel.findById(id);
    if (!license) {
      throw new NotFoundException('License not found');
    }

    const previousStatus = license.status;

    switch (dto.action) {
      case 'suspend':
        license.status = LicenseStatus.SUSPENDED;
        break;
      case 'revoke':
        license.status = LicenseStatus.REVOKED;
        await this.activationModel.updateMany(
          { licenseId: license._id, status: ActivationStatus.ACTIVE },
          {
            $set: {
              status: ActivationStatus.REVOKED,
              deactivatedAt: new Date(),
              deactivationReason: dto.reason || 'License revoked by admin',
            },
          },
        );
        license.currentActivationCount = 0;
        break;
      case 'restore':
        license.status = LicenseStatus.ACTIVE;
        break;
      case 'reset_activations':
        await this.activationModel.updateMany(
          { licenseId: license._id, status: ActivationStatus.ACTIVE },
          {
            $set: {
              status: ActivationStatus.DEACTIVATED,
              deactivatedAt: new Date(),
              deactivationReason: dto.reason || 'Administrative reset',
            },
          },
        );
        license.currentActivationCount = 0;
        break;
      case 'extend':
        if (dto.extendDays && dto.extendDays > 0) {
          const currentExp = license.expiresAt || new Date();
          license.expiresAt = new Date(
            currentExp.getTime() + dto.extendDays * 24 * 60 * 60 * 1000,
          );
        }
        if (dto.extendSupportDays && dto.extendSupportDays > 0) {
          const currentSupp = license.supportExpiresAt || new Date();
          license.supportExpiresAt = new Date(
            currentSupp.getTime() + dto.extendSupportDays * 24 * 60 * 60 * 1000,
          );
        }
        if (license.status === LicenseStatus.EXPIRED && (!license.expiresAt || license.expiresAt > new Date())) {
          license.status = LicenseStatus.ACTIVE;
        }
        break;
      case 'renew':
        const rType = dto.renewType || 'both';
        if (rType === 'license' || rType === 'both') {
          const renewDays = dto.extendDays || 365;
          license.expiresAt = new Date(
            Date.now() + renewDays * 24 * 60 * 60 * 1000,
          );
        }
        if (rType === 'support' || rType === 'both') {
          const renewSupportDays = dto.extendSupportDays || 365;
          license.supportExpiresAt = new Date(
            Date.now() + renewSupportDays * 24 * 60 * 60 * 1000,
          );
        }
        if (license.status === LicenseStatus.EXPIRED) {
          license.status = LicenseStatus.ACTIVE;
        }
        break;
      case 'change_limit':
        if (!dto.newActivationLimit || dto.newActivationLimit < 1) {
          throw new BadRequestException('newActivationLimit must be at least 1');
        }
        license.activationLimit = dto.newActivationLimit;
        break;
      default:
        throw new BadRequestException(`Unknown action: ${dto.action}`);
    }

    if (dto.reason) {
      license.notes.push({
        note: `Action "${dto.action}": ${dto.reason}`,
        author: actorEmail || 'admin',
        createdAt: new Date(),
      });
    }

    await license.save();

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'system',
      action: `LICENSE_ACTION_${dto.action.toUpperCase()}`,
      targetType: 'license',
      targetId: license._id.toString(),
      before: { status: previousStatus },
      after: {
        status: license.status,
        activationLimit: license.activationLimit,
        expiresAt: license.expiresAt,
        action: dto.action,
      },
    });

    return license;
  }

  async searchCustomers(search?: string) {
    const filter: any = {};
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { envatoUsername: { $regex: search, $options: 'i' } },
      ];
    }
    return this.userModel
      .find(filter)
      .select('_id email fullName role envatoUsername')
      .limit(20)
      .lean();
  }

  async addNote(id: string, noteDto: AddLicenseNoteDto, author: string) {
    const license = await this.licenseModel.findById(id);
    if (!license) {
      throw new NotFoundException('License not found');
    }

    license.notes.push({
      note: noteDto.note,
      author,
      createdAt: new Date(),
    });

    await license.save();
    return license;
  }

  async update(id: string, updateDto: UpdateLicenseDto, actorEmail?: string) {
    const license = await this.licenseModel.findById(id);
    if (!license) {
      throw new NotFoundException('License not found');
    }

    if (updateDto.status) license.status = updateDto.status;
    if (updateDto.licenseType) license.licenseType = updateDto.licenseType;
    if (updateDto.activationLimit !== undefined) {
      license.activationLimit = updateDto.activationLimit;
    }
    if (updateDto.expiresAt !== undefined) {
      license.expiresAt = updateDto.expiresAt
        ? new Date(updateDto.expiresAt)
        : undefined;
    }
    if (updateDto.supportExpiresAt !== undefined) {
      license.supportExpiresAt = updateDto.supportExpiresAt
        ? new Date(updateDto.supportExpiresAt)
        : undefined;
    }

    await license.save();

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'admin',
      action: 'LICENSE_UPDATED',
      targetType: 'license',
      targetId: license._id.toString(),
      after: updateDto,
    });

    return license;
  }
}
