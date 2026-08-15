import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LicensePlan,
  LicensePlanDocument,
} from '../../database/schemas/license-plan.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import {
  CreateLicensePlanDto,
  UpdateLicensePlanDto,
} from './dto/license-plan.dto';

@Injectable()
export class LicensePlansService {
  constructor(
    @InjectModel(LicensePlan.name)
    private planModel: Model<LicensePlanDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(License.name)
    private licenseModel: Model<LicenseDocument>,
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(dto: CreateLicensePlanDto, actorEmail?: string) {
    const slug = dto.slug.toLowerCase().trim();
    const existing = await this.planModel.findOne({ slug });
    if (existing) {
      throw new ConflictException(`License plan slug "${slug}" already exists`);
    }

    const plan = await this.planModel.create({
      ...dto,
      slug,
    });

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'admin',
      action: 'LICENSE_PLAN_CREATED',
      targetType: 'license_plan',
      targetId: (plan as any)._id.toString(),
      after: { name: plan.name, slug: plan.slug, activationLimit: plan.activationLimit },
    });

    return plan;
  }

  async findAll(query?: {
    search?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 50);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.isActive === 'true') filter.isActive = true;
    if (query?.isActive === 'false') filter.isActive = false;
    if (query?.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { slug: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.planModel
        .find(filter)
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.planModel.countDocuments(filter),
    ]);

    // Enrich each plan with usage stats
    const enriched = await Promise.all(
      items.map(async (plan) => {
        const [productsUsingOwn, productsUsingEnvato, licensesCount] =
          await Promise.all([
            this.productModel.countDocuments({
              defaultLicensePlanId: plan._id,
              isArchived: false,
            }),
            this.productModel.countDocuments({
              envatoLicensePlanId: plan._id,
              isArchived: false,
            }),
            this.licenseModel.countDocuments({ licensePlanId: plan._id }),
          ]);
        return {
          ...plan,
          usage: {
            productsOwn: productsUsingOwn,
            productsEnvato: productsUsingEnvato,
            totalProducts: productsUsingOwn + productsUsingEnvato,
            totalLicenses: licensesCount,
          },
        };
      }),
    );

    return {
      items: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid plan ID');
    }

    const plan = await this.planModel.findById(id).lean();
    if (!plan) {
      throw new NotFoundException('License plan not found');
    }

    const [productsOwn, productsEnvato, licensesCount, products] =
      await Promise.all([
        this.productModel.countDocuments({
          defaultLicensePlanId: plan._id,
          isArchived: false,
        }),
        this.productModel.countDocuments({
          envatoLicensePlanId: plan._id,
          isArchived: false,
        }),
        this.licenseModel.countDocuments({ licensePlanId: plan._id }),
        this.productModel
          .find({
            $or: [
              { defaultLicensePlanId: plan._id },
              { envatoLicensePlanId: plan._id },
            ],
            isArchived: false,
          })
          .select('name slug marketplaceSource')
          .lean(),
      ]);

    return {
      ...plan,
      usage: {
        productsOwn,
        productsEnvato,
        totalProducts: productsOwn + productsEnvato,
        totalLicenses: licensesCount,
        associatedProducts: products,
      },
    };
  }

  async update(
    id: string,
    dto: UpdateLicensePlanDto,
    actorEmail?: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid plan ID');
    }

    if (dto.slug) {
      dto.slug = dto.slug.toLowerCase().trim();
      const existing = await this.planModel.findOne({
        slug: dto.slug,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException(
          `Slug "${dto.slug}" is already in use by another plan`,
        );
      }
    }

    const before = await this.planModel.findById(id).lean();

    const updated = await this.planModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('License plan not found');
    }

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'admin',
      action: 'LICENSE_PLAN_UPDATED',
      targetType: 'license_plan',
      targetId: id,
      before: { name: before?.name, activationLimit: before?.activationLimit },
      after: dto,
    });

    return updated;
  }

  async archive(id: string, actorEmail?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid plan ID');
    }

    const plan = await this.planModel.findById(id);
    if (!plan) {
      throw new NotFoundException('License plan not found');
    }

    plan.isActive = false;
    await plan.save();

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'admin',
      action: 'LICENSE_PLAN_ARCHIVED',
      targetType: 'license_plan',
      targetId: id,
      after: { name: plan.name, slug: plan.slug },
    });

    return { success: true, message: 'License plan archived successfully' };
  }

  async findActive() {
    return this.planModel
      .find({ isActive: true })
      .sort({ isDefault: -1, name: 1 })
      .select('name slug activationLimit licenseDurationDays supportDurationDays isDefault')
      .lean();
  }
}
