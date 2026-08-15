import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  NotificationType,
  NotificationSeverity,
  NotificationChannel,
  NotificationRecipientType,
} from '../../common/enums/app.enums';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({
    type: String,
    enum: Object.values(NotificationRecipientType),
    required: true,
    index: true,
  })
  recipientType: NotificationRecipientType;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  recipientId?: Types.ObjectId;

  @Prop({ type: String, default: null, index: true })
  recipientEmail?: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true,
  })
  type: NotificationType;

  @Prop({
    type: String,
    enum: Object.values(NotificationSeverity),
    default: NotificationSeverity.INFO,
    index: true,
  })
  severity: NotificationSeverity;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop({
    type: [String],
    enum: Object.values(NotificationChannel),
    default: [NotificationChannel.IN_APP],
  })
  channelsSent: NotificationChannel[];

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt?: Date;

  @Prop({ type: String, default: null })
  dedupKey?: string;

  @Prop({ type: String, default: null })
  actionUrl?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1 });
NotificationSchema.index({ recipientType: 1, createdAt: -1 });
NotificationSchema.index({ dedupKey: 1 }, { unique: true, sparse: true });
