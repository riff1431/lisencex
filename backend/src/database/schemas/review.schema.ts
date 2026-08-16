import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Purchase', default: null, index: true })
  purchaseId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  orderId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  customerName: string;

  @Prop({ required: true, min: 1, max: 5, index: true })
  rating: number;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  comment: string;

  @Prop({ type: [String], default: [] })
  screenshots: string[];

  @Prop({ type: String, default: '1.0.0' })
  productVersion: string;

  @Prop({ type: Boolean, default: true, index: true })
  isVerifiedPurchase: boolean;

  @Prop({ type: String, default: 'own_marketplace' })
  marketplaceSource: string; // 'own_marketplace' | 'envato'

  @Prop({
    type: String,
    enum: ReviewStatus,
    default: ReviewStatus.APPROVED,
    index: true,
  })
  status: ReviewStatus;

  @Prop({ type: String, default: null })
  adminReply?: string;

  @Prop({ type: Date, default: null })
  adminRepliedAt?: Date;

  @Prop({ type: String, default: null })
  adminRepliedBy?: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
