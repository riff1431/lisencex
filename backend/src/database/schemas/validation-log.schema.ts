import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ValidationLogDocument = ValidationLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'validation_logs' })
export class ValidationLog {
  @Prop({ type: Types.ObjectId, ref: 'License', default: null })
  licenseId?: Types.ObjectId;

  @Prop({ type: String, default: null })
  activationId?: string;

  @Prop({ type: String, default: null })
  installationId?: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', default: null })
  productId?: Types.ObjectId;

  @Prop({ type: String, default: null })
  domain?: string;

  @Prop({ required: true })
  status: string; // e.g. VALID, EXPIRED, REVOKED, DOMAIN_MISMATCH

  @Prop({ type: String, default: null })
  message?: string;

  @Prop({ type: String, default: null })
  ip?: string;

  @Prop({ type: String, default: null })
  productVersion?: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const ValidationLogSchema = SchemaFactory.createForClass(ValidationLog);

ValidationLogSchema.index({ licenseId: 1, timestamp: -1 });
ValidationLogSchema.index({ activationId: 1 });
ValidationLogSchema.index({ timestamp: -1 });
