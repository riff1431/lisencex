import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponUsageDocument = CouponUsage & Document;

@Schema({ timestamps: true, collection: 'coupon_usages' })
export class CouponUsage {
  @Prop({ type: Types.ObjectId, ref: 'Coupon', required: true, index: true })
  couponId: Types.ObjectId;

  @Prop({ type: String, required: true, uppercase: true, trim: true, index: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: Number, required: true })
  discountAmount: number;

  @Prop({ type: Number, required: true })
  orderTotal: number;

  @Prop({ type: Date, default: Date.now })
  usedAt: Date;
}

export const CouponUsageSchema = SchemaFactory.createForClass(CouponUsage);

CouponUsageSchema.index({ couponId: 1, userId: 1 });
CouponUsageSchema.index({ userId: 1, createdAt: -1 });
