import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentTransactionDocument = PaymentTransaction & Document;

export enum PaymentGatewayType {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SIMULATOR = 'simulator',
  MANUAL = 'manual',
  RAZORPAY = 'razorpay',
  CRYPTO = 'crypto',
  PIPRAPAY = 'piprapay',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

@Schema({ _id: false })
export class RefundRecord {
  @Prop({ required: true })
  refundId: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ type: String, default: null })
  currency?: string;

  @Prop({ type: String, default: null })
  reason?: string;

  @Prop({ type: String, default: null })
  actorEmail?: string;

  @Prop({ type: String, default: null })
  externalRefundId?: string;

  @Prop({ type: Boolean, default: true })
  revokedLicense: boolean;

  @Prop({ type: Date, default: Date.now })
  refundedAt: Date;
}
export const RefundRecordSchema = SchemaFactory.createForClass(RefundRecord);

@Schema({ _id: false })
export class WebhookEventRecord {
  @Prop({ required: true })
  eventId: string;

  @Prop({ required: true })
  eventType: string;

  @Prop({ type: Date, default: Date.now })
  receivedAt: Date;

  @Prop({ type: String, default: 'processed' })
  status: string;

  @Prop({ type: Object, default: {} })
  details?: Record<string, any>;
}
export const WebhookEventRecordSchema = SchemaFactory.createForClass(WebhookEventRecord);

@Schema({ timestamps: true, collection: 'payment_transactions' })
export class PaymentTransaction {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  transactionId: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, default: null })
  customerEmail?: string;

  @Prop({ type: String, default: null })
  customerName?: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentGatewayType),
    default: PaymentGatewayType.SIMULATOR,
    index: true,
  })
  gateway: PaymentGatewayType;

  // External gateway transaction/payment_intent/charge ID
  @Prop({ type: String, default: null, index: true })
  externalTransactionId?: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.PENDING,
    index: true,
  })
  status: TransactionStatus;

  @Prop({ type: Object, default: {} })
  paymentMethodDetails?: {
    type?: string;
    brand?: string;
    last4?: string;
    country?: string;
    expMonth?: number;
    expYear?: number;
  };

  @Prop({ type: String, default: null })
  failureReason?: string;

  @Prop({ type: String, default: null })
  failureCode?: string;

  @Prop({ type: Number, default: 0 })
  refundedAmount: number;

  @Prop({ type: [RefundRecordSchema], default: [] })
  refunds: RefundRecord[];

  @Prop({ type: [WebhookEventRecordSchema], default: [] })
  webhookEvents: WebhookEventRecord[];

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Object, default: {} })
  rawPayload?: Record<string, any>;

  @Prop({ type: String, default: null })
  ip?: string;

  @Prop({ type: String, default: null })
  userAgent?: string;

  @Prop({ type: Date, default: null })
  paidAt?: Date;
}

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);

PaymentTransactionSchema.index({ userId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ gateway: 1, status: 1 });
PaymentTransactionSchema.index({ status: 1, createdAt: -1 });
PaymentTransactionSchema.index(
  { gateway: 1, externalTransactionId: 1 },
  {
    sparse: true,
    partialFilterExpression: { externalTransactionId: { $type: 'string' } },
  },
);

