import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import {
  Purchase,
  PurchaseDocument,
  PurchaseStatus,
} from '../../database/schemas/purchase.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { LicensesService } from '../licenses/licenses.service';
import {
  MarketplaceProviderType,
  LicenseStatus,
  LicenseType,
} from '../../common/enums/app.enums';
import {
  CreateInternalPurchaseDto,
  ClaimEnvatoPurchaseDto,
} from './dto/purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectModel(Purchase.name)
    private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(License.name)
    private licenseModel: Model<LicenseDocument>,
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    private marketplaceService: MarketplaceService,
    private licensesService: LicensesService,
  ) {}

  generatePurchaseKey(): string {
    const raw = crypto.randomBytes(10).toString('hex').toUpperCase();
    const chunks = raw.match(/.{1,4}/g) || [];
    return `PUR-${chunks.slice(0, 4).join('-')}`;
  }

  async createInternalPurchase(dto: CreateInternalPurchaseDto, actorEmail?: string) {
    const product = await this.productModel.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const user = await this.userModel.findById(dto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const purchaseKey = this.generatePurchaseKey();
    const orderNumber =
      dto.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;

    const purchase = await this.purchaseModel.create({
      productId: product._id,
      userId: user._id,
      source: MarketplaceProviderType.INTERNAL,
      purchaseKey,
      orderNumber,
      licenseType: dto.licenseType || 'regular',
      status: PurchaseStatus.COMPLETED,
      isClaimed: true,
      purchasedAt: new Date(),
    });

    const license = await this.licensesService.createLicenseForPurchase(
      purchase,
      product,
      user,
      {
        licenseType: (dto.licenseType as LicenseType) || LicenseType.REGULAR,
        actorEmail,
      },
    );

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'system',
      action: 'INTERNAL_PURCHASE_CREATED',
      targetType: 'purchase',
      targetId: purchase._id.toString(),
      after: {
        orderNumber,
        purchaseKey,
        licenseKey: license.licenseKey,
        productId: product._id.toString(),
        userId: user._id.toString(),
      },
    });

    return { purchase, license };
  }

  async claimEnvatoPurchase(userId: string, dto: ClaimEnvatoPurchaseDto) {
    const code = dto.purchaseCode.trim();
    const product = await this.productModel.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.purchaseModel.findOne({
      source: MarketplaceProviderType.ENVATO,
      externalPurchaseCode: code,
    });

    if (existing) {
      if (existing.userId && existing.userId.toString() === userId) {
        const existingLicense = await this.licenseModel.findOne({
          purchaseId: existing._id,
        });
        return {
          purchase: existing,
          license: existingLicense,
          message: 'Purchase was already claimed by your account',
        };
      }
      throw new ConflictException(
        'This Envato purchase code has already been claimed by another account',
      );
    }

    const envatoChannel = product.distributionChannels?.find(
      (c) => c.provider === MarketplaceProviderType.ENVATO && c.enabled,
    );

    const verification = await this.marketplaceService.verifyPurchase({
      provider: MarketplaceProviderType.ENVATO,
      credential: code,
      productId: product._id.toString(),
      expectedItemId: envatoChannel?.externalItemId,
    });

    if (!verification.valid) {
      throw new BadRequestException(
        verification.errorMessage || 'Invalid Envato purchase code',
      );
    }

    const purchase = await this.purchaseModel.create({
      productId: product._id,
      userId: user._id,
      source: MarketplaceProviderType.ENVATO,
      externalPurchaseCode: code,
      externalItemId: verification.externalItemId,
      buyerUsername: verification.buyerUsername,
      licenseType: verification.licenseType || 'regular',
      ...(verification.supportUntil ? { supportExpiresAt: verification.supportUntil } : {}),
      status: PurchaseStatus.COMPLETED,
      isClaimed: true,
      purchasedAt: verification.purchasedAt || new Date(),
      rawVerificationData: verification.rawResponse,
    });

    const license = await this.licensesService.createLicenseForPurchase(
      purchase,
      product,
      user,
      {
        licenseType:
          verification.licenseType === 'extended'
            ? LicenseType.EXTENDED
            : LicenseType.REGULAR,
        actorEmail: user.email,
      },
    );

    await this.auditLogModel.create({
      actorId: user._id,
      actorEmail: user.email,
      action: 'ENVATO_PURCHASE_CLAIMED',
      targetType: 'purchase',
      targetId: purchase._id.toString(),
      after: {
        code,
        licenseKey: license.licenseKey,
        buyerUsername: verification.buyerUsername,
        productId: product._id.toString(),
      },
    });

    return { purchase, license, message: 'Envato purchase verified and license issued!' };
  }

  async findAll(query?: { search?: string; source?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.source) {
      filter.source = query.source;
    }
    if (query?.search) {
      filter.$or = [
        { purchaseKey: { $regex: query.search, $options: 'i' } },
        { externalPurchaseCode: { $regex: query.search, $options: 'i' } },
        { orderNumber: { $regex: query.search, $options: 'i' } },
        { buyerUsername: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.purchaseModel
        .find(filter)
        .populate('productId', 'name slug logoUrl productType')
        .populate('userId', 'email fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.purchaseModel.countDocuments(filter),
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

  async findByCustomer(userId: string) {
    return this.purchaseModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('productId', 'name slug logoUrl productType currentVersion')
      .sort({ createdAt: -1 })
      .lean();
  }
}
