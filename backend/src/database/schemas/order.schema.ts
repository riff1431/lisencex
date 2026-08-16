import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  FAILED = 'failed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SIMULATOR = 'simulator',
  MANUAL = 'manual',
  RAZORPAY = 'razorpay',
  CRYPTO = 'crypto',
  FREE = 'free',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: true })
  productSlug: string;

  @Prop({ type: Types.ObjectId, ref: 'LicensePlan', default: null })
  licensePlanId?: Types.ObjectId;

  @Prop({ type: String, default: null })
  licensePlanName?: string;

  @Prop({ type: Number, default: 1, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true })
  unitPrice: number;

  @Prop({ type: Number, required: true })
  totalPrice: number;

  // Populated after payment confirmation
  @Prop({ type: Types.ObjectId, ref: 'Purchase', default: null })
  purchaseId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'License', default: null })
  licenseId?: Types.ObjectId;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, default: null })
  customerEmail?: string;

  @Prop({ type: String, default: null })
  customerName?: string;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ type: Number, default: 0 })
  subtotal: number;

  @Prop({ type: Number, default: 0 })
  discount: number;

  @Prop({ type: String, default: null })
  discountCode?: string;

  @Prop({ type: Number, default: 0 })
  tax: number;

  @Prop({ type: Number, required: true })
  total: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
    index: true,
  })
  status: OrderStatus;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true,
  })
  paymentStatus: PaymentStatus;

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    default: PaymentMethod.MANUAL,
  })
  paymentMethod: PaymentMethod;

  // External payment reference (Stripe session ID, PayPal order ID, etc.)
  @Prop({ type: String, default: null, index: true })
  paymentReference?: string;

  @Prop({ type: String, default: null, index: true })
  transactionId?: string;

  @Prop({ type: Number, default: 0 })
  refundedAmount: number;

  @Prop({ type: Number, default: 0 })
  originalSubtotal: number;

  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  @Prop({ type: String, default: null, uppercase: true, trim: true })
  couponCode?: string;

  @Prop({ type: Types.ObjectId, ref: 'Coupon', default: null })
  couponId?: Types.ObjectId;

  @Prop({ type: String, default: null })
  promotionSource?: string;

  @Prop({ type: Date, default: null })
  paidAt?: Date;

  @Prop({ type: String, default: null })
  notes?: string;

  @Prop({ type: String, default: null })
  ip?: string;

  @Prop({ type: String, default: null })
  userAgent?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, paymentStatus: 1 });


