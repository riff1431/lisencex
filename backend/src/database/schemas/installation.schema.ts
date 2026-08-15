import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EnvironmentType } from '../../common/enums/app.enums';

export type InstallationDocument = Installation & Document;

@Schema({ timestamps: true, collection: 'installations' })
export class Installation {
  @Prop({ required: true, unique: true, trim: true })
  installationId: string;

  @Prop({ type: Types.ObjectId, ref: 'License', required: true })
  licenseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

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

  @Prop({ type: String, default: null })
  serverFingerprint?: string;

  @Prop({ type: String, default: null })
  productVersion?: string;

  @Prop({ type: String, default: null })
  platform?: string;

  @Prop({ type: String, default: null })
  ip?: string;

  @Prop({ type: String, default: null })
  country?: string;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt: Date;
}

export const InstallationSchema = SchemaFactory.createForClass(Installation);

InstallationSchema.index({ licenseId: 1 });
InstallationSchema.index({ normalizedDomain: 1 });
InstallationSchema.index({ productId: 1 });
InstallationSchema.index({ lastSeenAt: -1 });
