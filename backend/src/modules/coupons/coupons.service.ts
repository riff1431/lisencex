import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Coupon,
  CouponDocument,
  DiscountType,
  OfferType,
} from '../../database/schemas/coupon.schema';
import {
  CouponUsage,
  CouponUsageDocument,
} from '../../database/schemas/coupon-usage.schema';
import {
  Order,
  OrderDocument,
  PaymentStatus,
} from '../../database/schemas/order.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  LicensePlan,
  LicensePlanDocument,
} from '../../database/schemas/license-plan.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  QueryCouponsDto,
} from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name) private couponUsageModel: Model<CouponUsageDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(LicensePlan.name) private planModel: Model<LicensePlanDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * 1. Validate and compute coupon discount (Server Authoritative)
   */
  async validateCoupon(userId: string, dto: ValidateCouponDto) {
    if (!dto.code || !dto.items || dto.items.length === 0) {
      throw new BadRequestException('Coupon code and cart items are required');
    }

    const cleanCode = dto.code.trim().toUpperCase();
    const coupon = await this.couponModel.findOne({ code: cleanCode });

    if (!coupon) {
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        message: `Coupon code "${cleanCode}" does not exist`,
      });
    }

    if (!coupon.isActive) {
      throw new BadRequestException({
        code: 'COUPON_INACTIVE',
        message: 'This coupon is currently disabled',
      });
    }

    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      throw new BadRequestException({
        code: 'COUPON_NOT_STARTED',
        message: `This coupon promotion begins on ${new Date(coupon.startDate).toLocaleDateString()}`,
      });
    }

    if (coupon.endDate && now > new Date(coupon.endDate)) {
      throw new BadRequestException({
        code: 'COUPON_EXPIRED',
        message: 'This coupon promotion has expired',
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException({
        code: 'COUPON_USAGE_LIMIT_REACHED',
        message: 'This promotional coupon has reached its maximum global redemption limit',
      });
    }

    // Check per-customer usage limit
    if (userId && Types.ObjectId.isValid(userId)) {
      const userUsageCount = await this.couponUsageModel.countDocuments({
        couponId: coupon._id,
        userId: new Types.ObjectId(userId),
      });

      if (userUsageCount >= (coupon.perCustomerLimit || 1)) {
        throw new BadRequestException({
          code: 'PER_CUSTOMER_LIMIT_REACHED',
          message: `You have already redeemed this coupon the maximum allowed times (${coupon.perCustomerLimit})`,
        });
      }

      // Check first purchase only rule
      if (coupon.isFirstPurchaseOnly) {
        const priorOrdersCount = await this.orderModel.countDocuments({
          userId: new Types.ObjectId(userId),
          paymentStatus: PaymentStatus.PAID,
        });

        if (priorOrdersCount > 0) {
          throw new BadRequestException({
            code: 'FIRST_PURCHASE_ONLY',
            message: 'This coupon is exclusively reserved for your first order',
          });
        }
      }
    }

    // Resolve prices from database to prevent client tampering
    let originalSubtotal = 0;
    let eligibleSubtotal = 0;
    const itemBreakdown: any[] = [];

    const hasProductFilter = coupon.eligibleProducts && coupon.eligibleProducts.length > 0;
    const hasPlanFilter = coupon.eligiblePlans && coupon.eligiblePlans.length > 0;

    for (const item of dto.items) {
      const product = await this.productModel.findById(item.productId);
      if (!product) continue;

      let unitPrice = product.price || 0;
      let planName = 'Standard';

      if (item.licensePlanId && Types.ObjectId.isValid(item.licensePlanId)) {
        const plan = await this.planModel.findById(item.licensePlanId);
        if (plan) {
          unitPrice = plan.price;
          planName = plan.name;
        }
      }

      const itemTotal = unitPrice * (item.quantity || 1);
      originalSubtotal += itemTotal;

      // Check item eligibility
      const isProductEligible = !hasProductFilter || coupon.eligibleProducts.some((p) => p.toString() === product._id.toString());
      const isPlanEligible = !hasPlanFilter || (item.licensePlanId && coupon.eligiblePlans.some((p) => p.toString() === item.licensePlanId));

      const isEligible = (hasProductFilter && hasPlanFilter)
        ? (isProductEligible || isPlanEligible)
        : hasProductFilter
        ? isProductEligible
        : hasPlanFilter
        ? isPlanEligible
        : true;

      if (isEligible) {
        eligibleSubtotal += itemTotal;
      }

      itemBreakdown.push({
        productId: product._id,
        productName: product.name,
        planName,
        quantity: item.quantity,
        unitPrice,
        itemTotal,
        isEligible,
      });
    }

    if (originalSubtotal <= 0) {
      throw new BadRequestException('Cart subtotal is zero');
    }

    if (coupon.minOrderAmount > 0 && originalSubtotal < coupon.minOrderAmount) {
      throw new BadRequestException({
        code: 'MIN_ORDER_AMOUNT_NOT_MET',
        message: `This coupon requires a minimum order amount of $${coupon.minOrderAmount} (Current: $${originalSubtotal})`,
      });
    }

    if (eligibleSubtotal <= 0) {
      throw new BadRequestException({
        code: 'NO_ELIGIBLE_PRODUCTS',
        message: 'None of the items in your cart qualify for this promotional coupon',
      });
    }

    // Compute discount
    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = eligibleSubtotal * (coupon.discountValue / 100);
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed discount
      discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalTotal = Math.max(0, Math.round((originalSubtotal - discountAmount) * 100) / 100);
    const savingsPercentage = Math.round((discountAmount / originalSubtotal) * 100);

    return {
      valid: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        campaignName: coupon.campaignName,
        offerType: coupon.offerType,
      },
      originalSubtotal,
      eligibleSubtotal,
      discountAmount,
      finalTotal,
      savingsPercentage,
      breakdown: itemBreakdown,
    };
  }

  /**
   * 2. Record coupon usage upon order completion
   */
  async recordUsage(
    couponId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    orderNumber: string,
    discountAmount: number,
    orderTotal: number,
  ) {
    const coupon = await this.couponModel.findById(couponId);
    if (!coupon) return;

    coupon.usedCount = (coupon.usedCount || 0) + 1;
    coupon.totalDiscountGiven = (coupon.totalDiscountGiven || 0) + discountAmount;
    coupon.totalRevenueGenerated = (coupon.totalRevenueGenerated || 0) + orderTotal;
    await coupon.save();

    await this.couponUsageModel.create({
      couponId: coupon._id,
      code: coupon.code,
      userId: new Types.ObjectId(userId.toString()),
      orderId: new Types.ObjectId(orderId.toString()),
      orderNumber,
      discountAmount,
      orderTotal,
      usedAt: new Date(),
    });
  }

  /**
   * 3. Revert coupon usage on refund/cancellation
   */
  async revertUsage(couponId: string, orderId: string) {
    const usage = await this.couponUsageModel.findOne({
      couponId: new Types.ObjectId(couponId),
      orderId: new Types.ObjectId(orderId),
    });

    if (!usage) return;

    await this.couponModel.findByIdAndUpdate(couponId, {
      $inc: {
        usedCount: -1,
        totalDiscountGiven: -usage.discountAmount,
        totalRevenueGenerated: -usage.orderTotal,
      },
    });

    await this.couponUsageModel.findByIdAndDelete(usage._id);
  }

  /**
   * 4. Admin CRUD Operations
   */
  async createCoupon(dto: CreateCouponDto, actorEmail: string) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.couponModel.findOne({ code });
    if (existing) {
      throw new ConflictException(`Coupon code "${code}" already exists`);
    }

    const coupon = await this.couponModel.create({
      ...dto,
      code,
      eligibleProducts: dto.eligibleProducts?.map((id) => new Types.ObjectId(id)) || [],
      eligiblePlans: dto.eligiblePlans?.map((id) => new Types.ObjectId(id)) || [],
    });

    await this.auditLogModel.create({
      actorEmail,
      action: 'COUPON_CREATED',
      targetType: 'coupon',
      targetId: coupon._id.toString(),
      after: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
    });

    return coupon;
  }

  async updateCoupon(id: string, dto: UpdateCouponDto, actorEmail: string) {
    const coupon = await this.couponModel.findById(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const before = { ...coupon.toObject() };

    Object.assign(coupon, {
      ...dto,
      ...(dto.eligibleProducts ? { eligibleProducts: dto.eligibleProducts.map((p) => new Types.ObjectId(p)) } : {}),
      ...(dto.eligiblePlans ? { eligiblePlans: dto.eligiblePlans.map((p) => new Types.ObjectId(p)) } : {}),
    });

    await coupon.save();

    await this.auditLogModel.create({
      actorEmail,
      action: 'COUPON_UPDATED',
      targetType: 'coupon',
      targetId: coupon._id.toString(),
      before: { discountValue: before.discountValue, isActive: before.isActive },
      after: { discountValue: coupon.discountValue, isActive: coupon.isActive },
    });

    return coupon;
  }

  async deleteCoupon(id: string, actorEmail: string) {
    const coupon = await this.couponModel.findById(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.couponModel.findByIdAndDelete(id);

    await this.auditLogModel.create({
      actorEmail,
      action: 'COUPON_DELETED',
      targetType: 'coupon',
      targetId: id,
      before: { code: coupon.code, name: coupon.name },
    });

    return { success: true, message: `Coupon "${coupon.code}" deleted` };
  }

  async getAdminCoupons(query: QueryCouponsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.discountType) filter.discountType = query.discountType;

    const now = new Date();
    if (query.status === 'active') {
      filter.isActive = true;
      filter.$or = [{ endDate: null }, { endDate: { $gt: now } }];
    } else if (query.status === 'inactive') {
      filter.isActive = false;
    } else if (query.status === 'expired') {
      filter.endDate = { $lt: now };
    }

    if (query.search) {
      filter.$or = [
        { code: { $regex: query.search, $options: 'i' } },
        { name: { $regex: query.search, $options: 'i' } },
        { campaignName: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.couponModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.couponModel.countDocuments(filter),
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

  async getCouponById(id: string) {
    const coupon = await this.couponModel.findById(id).lean();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const recentUsages = await this.couponUsageModel
      .find({ couponId: new Types.ObjectId(id) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return { coupon, recentUsages };
  }

  /**
   * 5. Telemetry & Public Campaigns
   */
  async getCouponStats() {
    const now = new Date();
    const [
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      aggStats,
      topCampaigns,
    ] = await Promise.all([
      this.couponModel.countDocuments(),
      this.couponModel.countDocuments({
        isActive: true,
        $or: [{ endDate: null }, { endDate: { $gt: now } }],
      }),
      this.couponUsageModel.countDocuments(),
      this.couponModel.aggregate([
        {
          $group: {
            _id: null,
            totalDiscounts: { $sum: '$totalDiscountGiven' },
            totalRevenue: { $sum: '$totalRevenueGenerated' },
          },
        },
      ]),
      this.couponModel
        .find({ usedCount: { $gt: 0 } })
        .sort({ usedCount: -1 })
        .limit(5)
        .lean(),
    ]);

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      totalDiscountsGiven: aggStats[0]?.totalDiscounts || 0,
      totalAttributedRevenue: aggStats[0]?.totalRevenue || 0,
      topCampaigns,
    };
  }

  async getPublicOffers() {
    const now = new Date();
    return this.couponModel
      .find({
        isActive: true,
        isFeaturedPublicOffer: true,
        $and: [
          { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: null }, { endDate: { $gt: now } }] },
        ],
      })
      .select('code name description discountType discountValue publicBannerText offerType minOrderAmount campaignName')
      .lean();
  }
}
