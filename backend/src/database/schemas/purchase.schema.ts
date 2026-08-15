import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MarketplaceProviderType } from '../../common/enums/app.enums';

export type PurchaseDocument = Purchase & Document;

export enum PurchaseStatus {
  COMPLETED = 'completed',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'purchases' })
export class Purchase {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MarketplaceProviderType),
    required: true,
  })
  source: MarketplaceProviderType;

  // Internal purchase fields
  @Prop({ type: String, trim: true })
  purchaseKey?: string;

  @Prop({ type: String })
  purchaseKeyHash?: string;

  @Prop({ type: String })
  orderNumber?: string;

  // Envato purchase fields
  @Prop({ type: String, trim: true })
  externalPurchaseCode?: string;

  @Prop({ type: String })
  externalPurchaseCodeHash?: string;

  @Prop({ type: String })
  externalItemId?: string;

  @Prop({ type: String })
  buyerUsername?: string;

  @Prop({ type: String, default: 'regular' })
  licenseType: string;

  @Prop({ type: Date })
  supportExpiresAt?: Date;

  @Prop({
    type: String,
    enum: Object.values(PurchaseStatus),
    default: PurchaseStatus.COMPLETED,
  })
  status: PurchaseStatus;

  @Prop({ type: Boolean, default: true })
  isClaimed: boolean;

  @Prop({ type: Date, default: Date.now })
  purchasedAt: Date;

  @Prop({ type: Object, default: {} })
  rawVerificationData?: Record<string, any>;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);

PurchaseSchema.index({ purchaseKey: 1 }, { unique: true, sparse: true });
PurchaseSchema.index(
  { source: 1, externalPurchaseCode: 1 },
  { unique: true, sparse: true },
);
PurchaseSchema.index({ userId: 1 });
PurchaseSchema.index({ productId: 1 });
PurchaseSchema.index({ status: 1 });
