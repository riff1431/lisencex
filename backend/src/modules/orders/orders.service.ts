import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
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
  Purchase,
  PurchaseDocument,
} from '../../database/schemas/purchase.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import { LicensesService } from '../licenses/licenses.service';
import { CouponsService } from '../coupons/coupons.service';
import {
  MarketplaceProviderType,
  LicenseType,
} from '../../common/enums/app.enums';
import { PurchaseStatus } from '../../database/schemas/purchase.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(LicensePlan.name) private planModel: Model<LicensePlanDocument>,
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    private licensesService: LicensesService,
    @Inject(forwardRef(() => CouponsService))
    private couponsService: CouponsService,
  ) {}

  generateOrderNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `ORD-${ts}-${rand}`;
  }

  /**
   * Create a new order from cart items.
   * Each item: { productId, licensePlanId?, quantity? }
   */
  async createOrder(
    userId: string,
    items: Array<{ productId: string; licensePlanId?: string; quantity?: number }>,
    couponCode?: string,
    options?: { ip?: string; userAgent?: string },
  ) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const orderItems: any[] = [];
    let subtotal = 0;

    for (const cartItem of items) {
      const product = await this.productModel.findById(cartItem.productId);
      if (!product) {
        throw new NotFoundException(`Product ${cartItem.productId} not found`);
      }
      if (product.isArchived) {
        throw new BadRequestException(`Product "${product.name}" is no longer available`);
      }

      let unitPrice = product.price || 0;
      let planName: string | null = null;
      let planId: Types.ObjectId | null = null;

      if (cartItem.licensePlanId) {
        const plan = await this.planModel.findById(cartItem.licensePlanId);
        if (!plan) {
          throw new NotFoundException(`License plan ${cartItem.licensePlanId} not found`);
        }
        if (!plan.isActive) {
          throw new BadRequestException(`License plan "${plan.name}" is not available`);
        }
        // Plan price overrides product price if set
        if (plan.price > 0) {
          unitPrice = plan.price;
        }
        planName = plan.name;
        planId = plan._id as Types.ObjectId;
      }

      const qty = Math.max(1, cartItem.quantity || 1);
      const totalPrice = unitPrice * qty;
      subtotal += totalPrice;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        licensePlanId: planId,
        licensePlanName: planName,
        quantity: qty,
        unitPrice,
        totalPrice,
      });
    }

    let discountAmount = 0;
    let finalTotal = subtotal;
    let appliedCouponCode: string | undefined;
    let appliedCouponId: Types.ObjectId | undefined;
    let promotionSource: string | undefined;

    if (couponCode && couponCode.trim()) {
      const validation = await this.couponsService.validateCoupon(userId, {
        code: couponCode,
        items: items.map((i) => ({
          productId: i.productId,
          licensePlanId: i.licensePlanId,
          quantity: i.quantity || 1,
        })),
      });
      if (validation && validation.valid) {
        discountAmount = validation.discountAmount;
        finalTotal = validation.finalTotal;
        appliedCouponCode = validation.coupon.code;
        appliedCouponId = validation.coupon.id;
        promotionSource = validation.coupon.campaignName || validation.coupon.name;
      }
    }

    const order = await this.orderModel.create({
      orderNumber: this.generateOrderNumber(),
      userId: user._id,
      customerEmail: user.email,
      customerName: user.fullName,
      items: orderItems,
      subtotal,
      originalSubtotal: subtotal,
      discountAmount,
      discount: discountAmount,
      couponCode: appliedCouponCode,
      couponId: appliedCouponId,
      promotionSource,
      tax: 0,
      total: finalTotal,
      currency: 'USD',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.MANUAL,
      ip: options?.ip,
      userAgent: options?.userAgent,
    });

    await this.auditLogModel.create({
      actorEmail: user.email,
      action: 'ORDER_CREATED',
      targetType: 'order',
      targetId: order._id.toString(),
      after: {
        orderNumber: order.orderNumber,
        total: order.total,
        itemCount: orderItems.length,
      },
    });

    return order;
  }

  /**
   * Confirm payment and fulfill the order.
   * IDEMPOTENT: If order is already completed, return existing result.
   */
  async confirmPayment(
    orderId: string,
    paymentData: {
      paymentReference?: string;
      paymentMethod?: PaymentMethod;
    },
    actorEmail?: string,
  ) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Idempotency: If already paid, return existing order
    if (order.paymentStatus === PaymentStatus.PAID && order.status === OrderStatus.COMPLETED) {
      return {
        order,
        message: 'Order was already processed',
        alreadyProcessed: true,
      };
    }

    // Prevent confirming cancelled/refunded orders
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException(`Cannot confirm payment for ${order.status} order`);
    }

    // Idempotency by paymentReference: Check if another order was already paid with this reference
    if (paymentData.paymentReference) {
      const existingByRef = await this.orderModel.findOne({
        paymentReference: paymentData.paymentReference,
        _id: { $ne: order._id },
        paymentStatus: PaymentStatus.PAID,
      });
      if (existingByRef) {
        throw new ConflictException(
          `Payment reference "${paymentData.paymentReference}" has already been used for order ${existingByRef.orderNumber}`,
        );
      }
    }

    const user = await this.userModel.findById(order.userId);
    if (!user) {
      throw new NotFoundException('Order user not found');
    }

    // Fulfill each item: Create Purchase → Create License
    const fulfillmentResults: any[] = [];
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const product = await this.productModel.findById(item.productId);
      if (!product) {
        this.logger.warn(`Product ${item.productId} not found during fulfillment`);
        continue;
      }

      // Check if purchase already exists for this order item (idempotency)
      let existingPurchase = null;
      if (item.purchaseId) {
        existingPurchase = await this.purchaseModel.findById(item.purchaseId);
      }

      let purchase: any;
      let license: any;

      if (existingPurchase) {
        purchase = existingPurchase;
        license = await this.licenseModel.findOne({ purchaseId: purchase._id });
      } else {
        // Create purchase
        const purchaseKey = `PUR-${crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,4}/g)?.join('-')}`;
        purchase = await this.purchaseModel.create({
          productId: product._id,
          userId: user._id,
          source: MarketplaceProviderType.INTERNAL,
          purchaseKey,
          orderNumber: order.orderNumber,
          licenseType: 'regular',
          status: PurchaseStatus.COMPLETED,
          isClaimed: true,
          purchasedAt: new Date(),
        });

        // Create license from purchase
        license = await this.licensesService.createLicenseForPurchase(
          purchase,
          product,
          user,
          {
            licenseType: LicenseType.REGULAR,
            actorEmail: actorEmail || user.email,
          },
        );

        // Update order item with purchase and license IDs
        order.items[i].purchaseId = purchase._id;
        order.items[i].licenseId = license._id;
      }

      fulfillmentResults.push({
        productName: item.productName,
        purchaseKey: purchase.purchaseKey,
        licenseKey: license?.licenseKey,
      });
    }

    // Mark order as paid and completed
    order.paymentStatus = PaymentStatus.PAID;
    order.status = OrderStatus.COMPLETED;
    order.paidAt = new Date();
    if (paymentData.paymentReference) {
      order.paymentReference = paymentData.paymentReference;
    }
    if (paymentData.paymentMethod) {
      order.paymentMethod = paymentData.paymentMethod;
    }
    await order.save();

    if (order.couponId) {
      await this.couponsService.recordUsage(
        order.couponId,
        order.userId,
        order._id,
        order.orderNumber,
        order.discountAmount || 0,
        order.total,
      );
    }

    await this.auditLogModel.create({
      actorEmail: actorEmail || 'system',
      action: 'ORDER_PAYMENT_CONFIRMED',
      targetType: 'order',
      targetId: order._id.toString(),
      after: {
        orderNumber: order.orderNumber,
        total: order.total,
        paymentReference: paymentData.paymentReference,
        fulfilledItems: fulfillmentResults.length,
      },
    });

    return {
      order,
      fulfillmentResults,
      alreadyProcessed: false,
    };
  }

  async findByUser(userId: string) {
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(orderId: string) {
    const order = await this.orderModel.findById(orderId).lean();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findAll(query?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.status) filter.status = query.status;
    if (query?.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query?.search) {
      filter.$or = [
        { orderNumber: { $regex: query.search, $options: 'i' } },
        { customerEmail: { $regex: query.search, $options: 'i' } },
        { customerName: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const [totalOrders, pendingOrders, completedOrders, totalRevenue] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: OrderStatus.PENDING }),
      this.orderModel.countDocuments({ status: OrderStatus.COMPLETED }),
      this.orderModel.aggregate([
        { $match: { paymentStatus: PaymentStatus.PAID } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
  }

  async cancelOrder(orderId: string, actorEmail: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed order');
    }
    order.status = OrderStatus.CANCELLED;
    await order.save();

    await this.auditLogModel.create({
      actorEmail,
      action: 'ORDER_CANCELLED',
      targetType: 'order',
      targetId: order._id.toString(),
      after: { orderNumber: order.orderNumber },
    });

    return order;
  }
}
