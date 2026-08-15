import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  LicenseStatus,
  LicenseType,
  MarketplaceProviderType,
} from '../../common/enums/app.enums';

export type LicenseDocument = License & Document;

@Schema({ _id: false })
export class LicenseNote {
  @Prop({ required: true })
  note: string;

  @Prop({ required: true })
  author: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const LicenseNoteSchema = SchemaFactory.createForClass(LicenseNote);

@Schema({ timestamps: true, collection: 'licenses' })
export class License {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  licenseKey: string;

  @Prop({ type: String, default: null })
  licenseKeyHash?: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Purchase', default: null })
  purchaseId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(LicenseType),
    default: LicenseType.REGULAR,
  })
  licenseType: LicenseType;

  @Prop({
    type: String,
    enum: Object.values(LicenseStatus),
    default: LicenseStatus.ACTIVE,
  })
  status: LicenseStatus;

  @Prop({ default: 1, min: 1 })
  activationLimit: number;

  @Prop({ default: 0, min: 0 })
  currentActivationCount: number;

  @Prop({ type: Date, default: null })
  expiresAt?: Date;

  @Prop({ type: Date, default: null })
  supportExpiresAt?: Date;

  @Prop({
    type: String,
    enum: Object.values(MarketplaceProviderType),
    default: MarketplaceProviderType.INTERNAL,
  })
  source: MarketplaceProviderType;

  @Prop({ type: [LicenseNoteSchema], default: [] })
  notes: LicenseNote[];

  @Prop({ type: Date, default: Date.now })
  issuedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'LicensePlan', default: null })
  licensePlanId?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;
}

export const LicenseSchema = SchemaFactory.createForClass(License);

LicenseSchema.index({ userId: 1 });
LicenseSchema.index({ productId: 1 });
LicenseSchema.index({ status: 1 });
LicenseSchema.index({ expiresAt: 1 });
LicenseSchema.index({ purchaseId: 1 }, { unique: true, sparse: true });
LicenseSchema.index({ licenseKeyHash: 1 }, { sparse: true });
