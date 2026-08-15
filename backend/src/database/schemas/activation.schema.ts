import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ActivationStatus,
  EnvironmentType,
} from '../../common/enums/app.enums';

export type ActivationDocument = Activation & Document;

@Schema({ timestamps: true, collection: 'activations' })
export class Activation {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  activationId: string;

  @Prop({ type: Types.ObjectId, ref: 'License', required: true })
  licenseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  installationId: string;

  @Prop({ required: true, trim: true })
  domain: string;

  @Prop({ required: true, lowercase: true, trim: true })
  normalizedDomain: string;

  @Prop({ type: String, default: '' })
  installationUrl: string;

  @Prop({
    type: String,
    enum: Object.values(EnvironmentType),
    default: EnvironmentType.PRODUCTION,
  })
  environment: EnvironmentType;

  @Prop({
    type: String,
    enum: Object.values(ActivationStatus),
    default: ActivationStatus.ACTIVE,
  })
  status: ActivationStatus;

  @Prop({ type: String, default: '1.0.0' })
  productVersion: string;

  @Prop({ type: String, default: null })
  ip?: string;

  @Prop({ type: String, default: null })
  userAgent?: string;

  @Prop({ type: Date, default: Date.now })
  activatedAt: Date;

  @Prop({ type: Date, default: Date.now })
  lastValidatedAt: Date;

  @Prop({ type: Date, default: null })
  deactivatedAt?: Date;

  @Prop({ type: String, default: null })
  deactivationReason?: string;
}

export const ActivationSchema = SchemaFactory.createForClass(Activation);

ActivationSchema.index({ licenseId: 1, status: 1 });
ActivationSchema.index({ installationId: 1 });
ActivationSchema.index({ normalizedDomain: 1 });
ActivationSchema.index({ productId: 1 });
ActivationSchema.index({ activatedAt: -1 });
