import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LicenseRecoveryRequestDocument = LicenseRecoveryRequest & Document;

@Schema({ timestamps: true, collection: 'license_recovery_requests' })
export class LicenseRecoveryRequest {
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'License', required: true })
  licenseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  requesterEmail: string;

  @Prop({ required: true, trim: true })
  reason: string;

  @Prop({ type: String, default: '' })
  reasonDetail?: string;

  @Prop({ required: true, trim: true })
  oldDomain: string;

  @Prop({ required: true, trim: true })
  oldInstallationId: string;

  @Prop({ type: String, default: null })
  oldActivationId?: string;

  @Prop({ required: true, trim: true })
  newDomain: string;

  @Prop({ required: true, trim: true })
  newInstallationId: string;

  @Prop({ type: String, default: '' })
  newInstallationUrl?: string;

  @Prop({ required: true, trim: true, default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Prop({ type: String, default: null })
  approverEmail?: string;

  @Prop({ type: String, default: null })
  rejectionReason?: string;

  @Prop({ type: String, default: null })
  requestedIp?: string;

  @Prop({ type: Date, default: null })
  resolvedAt?: Date;
}

export const LicenseRecoveryRequestSchema = SchemaFactory.createForClass(LicenseRecoveryRequest);

LicenseRecoveryRequestSchema.index({ licenseId: 1 });
LicenseRecoveryRequestSchema.index({ productId: 1 });
LicenseRecoveryRequestSchema.index({ status: 1 });
LicenseRecoveryRequestSchema.index({ createdAt: -1 });
