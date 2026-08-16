import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CouponDocument = Coupon & Document;

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum OfferType {
  STANDARD = 'standard',
  UPGRADE_DISCOUNT = 'upgrade_discount',
  BUNDLE_DISCOUNT = 'bundle_discount',
  LIFETIME_LAUNCH = 'lifetime_launch',
  FIRST_PURCHASE = 'first_purchase',
}

@Schema({ timestamps: true, collection: 'coupons' })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, default: null })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(DiscountType),
    default: DiscountType.PERCENTAGE,
  })
  discountType: DiscountType;

  @Prop({ required: true, type: Number })
  discountValue: number; // e.g. 20 (for 20% or $20)

  @Prop({ type: Number, default: null })
  maxDiscountAmount?: number; // Cap for percentage discounts (e.g. max $50 off)

  @Prop({ type: Number, default: 0 })
  minOrderAmount: number; // Minimum order subtotal required to use coupon

  @Prop({ type: Boolean, default: false })
  isFirstPurchaseOnly: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  eligibleProducts: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'LicensePlan' }], default: [] })
  eligiblePlans: Types.ObjectId[];

  @Prop({ type: Number, default: null })
  usageLimit?: number; // Global maximum number of times coupon can be used

  @Prop({ type: Number, default: 0 })
  usedCount: number;

  @Prop({ type: Number, default: 1 })
  perCustomerLimit: number; // Max uses per individual user account

  @Prop({ type: Date, default: null })
  startDate?: Date;

  @Prop({ type: Date, default: null })
  endDate?: Date;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  campaignName?: string;

  @Prop({
    type: String,
    enum: Object.values(OfferType),
    default: OfferType.STANDARD,
  })
  offerType: OfferType;

  @Prop({ type: Boolean, default: false })
  isFeaturedPublicOffer: boolean; // Show in public store promotion banners

  @Prop({ type: String, default: null })
  publicBannerText?: string;

  @Prop({ type: Number, default: 0 })
  totalDiscountGiven: number;

  @Prop({ type: Number, default: 0 })
  totalRevenueGenerated: number;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
CouponSchema.index({ isFeaturedPublicOffer: 1, isActive: 1 });
