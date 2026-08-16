import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from './product.schema';

export type ProductCredentialDocument = ProductCredential & Document;

@Schema({ timestamps: true })
export class ProductCredential {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, index: true })
  clientId: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  apiKey: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: [String], default: ['activate', 'validate', 'update', 'download'] })
  scopes: string[];

  @Prop({
    type: String,
    enum: ['active', 'rotated', 'disabled'],
    default: 'active',
    index: true,
  })
  status: 'active' | 'rotated' | 'disabled';

  @Prop({
    type: String,
    enum: ['production', 'sandbox'],
    default: 'production',
    index: true,
  })
  environment: 'production' | 'sandbox';

  @Prop({ type: Boolean, default: false, index: true })
  isSandbox: boolean;

  @Prop({ type: Date })
  rotatedAt?: Date;

  @Prop({ type: Date })
  expiresAt?: Date; // expiration date of rotated key (e.g. 30 days grace period)
}

export const ProductCredentialSchema = SchemaFactory.createForClass(ProductCredential);

ProductCredentialSchema.index({ productId: 1, status: 1 });
