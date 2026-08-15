import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferenceDocument = NotificationPreference & Document;

@Schema({ timestamps: true, collection: 'notification_preferences' })
export class NotificationPreference {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  inAppEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  emailEnabled: boolean;

  @Prop({ type: String, default: null })
  webhookUrl?: string;

  @Prop({ type: Boolean, default: false })
  webhookEnabled: boolean;

  @Prop({ type: [Number], default: [30, 7, 1] })
  expiryReminderDays: number[];

  @Prop({ type: Object, default: () => ({
    license_activated: true,
    license_deactivated: true,
    license_expiring_soon: true,
    license_expired: true,
    support_expiring_soon: true,
    support_expired: true,
    suspicious_activity: true,
    product_update_available: true,
    activation_failed: true,
    activation_limit_reached: true,
    invalid_key_attempt: true,
    entity_blocked: true,
    envato_claim_failed: true,
  }) })
  subscribedEvents: Record<string, boolean>;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
