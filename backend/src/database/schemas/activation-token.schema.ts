import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivationTokenDocument = ActivationToken & Document;

@Schema({ timestamps: true, collection: 'activation_tokens' })
export class ActivationToken {
  @Prop({ required: true, unique: true })
  tokenId: string;

  @Prop({ required: true })
  activationId: string;

  @Prop({ type: Types.ObjectId, ref: 'License', required: true })
  licenseId: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ type: String, default: null })
  tokenHash?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  isRevoked: boolean;
}

export const ActivationTokenSchema =
  SchemaFactory.createForClass(ActivationToken);

ActivationTokenSchema.index({ activationId: 1 });
ActivationTokenSchema.index({ tokenHash: 1 });
ActivationTokenSchema.index({ expiresAt: 1 });
