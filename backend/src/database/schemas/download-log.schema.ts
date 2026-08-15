import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DownloadLogDocument = DownloadLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'download_logs' })
export class DownloadLog {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'License', default: null })
  licenseId?: Types.ObjectId;

  @Prop({ required: true })
  version: string;

  @Prop({ type: String, default: null })
  ip?: string;

  @Prop({ type: String, default: null })
  userAgent?: string;

  @Prop({ type: String, default: 'direct' })
  source: string;

  @Prop({ type: Date, default: Date.now })
  downloadedAt: Date;
}

export const DownloadLogSchema = SchemaFactory.createForClass(DownloadLog);

DownloadLogSchema.index({ productId: 1, downloadedAt: -1 });
DownloadLogSchema.index({ userId: 1 });
DownloadLogSchema.index({ downloadedAt: -1 });
