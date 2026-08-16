import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LicensePlanDocument = LicensePlan & Document;

@Schema({ timestamps: true, collection: 'license_plans' })
export class LicensePlan {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ type: String, default: '' })
  description: string;

  // ── Pricing ───────────────────────────────────────────────────────
  @Prop({ type: Number, default: 0 })
  price: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Boolean, default: false })
  isFeatured: boolean;

  // ── Activation Rules ──────────────────────────────────────────────
  @Prop({ type: Number, default: 1, min: 0 }) // 0 = unlimited
  activationLimit: number;

  @Prop({ type: Number, default: 0 }) // 0 = lifetime
  licenseDurationDays: number;

  @Prop({ type: Number, default: 180 }) // 180 = 6 months
  supportDurationDays: number;

  // ── Environment Rules ─────────────────────────────────────────────
  @Prop({ type: Boolean, default: true })
  allowLocalhost: boolean;

  @Prop({ type: Boolean, default: false })
  countLocalhost: boolean;

  @Prop({ type: Boolean, default: true })
  allowStaging: boolean;

  @Prop({ type: Boolean, default: false })
  countStaging: boolean;

  // ── Deactivation Rules ────────────────────────────────────────────
  @Prop({ type: Boolean, default: true })
  allowDeactivation: boolean;

  @Prop({ type: Number, default: 0 })
  deactivationCooldownHours: number;

  // ── Validation & Offline ──────────────────────────────────────────
  @Prop({ type: Boolean, default: true })
  periodicValidation: boolean;

  @Prop({ type: Number, default: 24 })
  validationIntervalHours: number;

  @Prop({ type: Number, default: 7 })
  offlineGracePeriodDays: number;

  // ── Update & Download Eligibility ─────────────────────────────────
  @Prop({ type: Boolean, default: true })
  automaticUpdatesEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  downloadsEnabled: boolean;

  // ── Recovery Rules ────────────────────────────────────────────────
  @Prop({ type: Boolean, default: true })
  recoveryEnabled: boolean;

  @Prop({ type: Boolean, default: true })
  autoApproveRecovery: boolean;

  @Prop({ type: Number, default: 3 })
  recoveryLimit: number;

  @Prop({ type: Number, default: 720 }) // 720 hours = 30 days
  recoveryCooldownHours: number;

  // ── Expiry & Renewal Rules ────────────────────────────────────────
  @Prop({ type: Boolean, default: true })
  blockValidationOnExpiry: boolean;

  @Prop({ type: Boolean, default: true })
  blockUpdatesOnExpiry: boolean;

  @Prop({ type: Boolean, default: true })
  blockDownloadsOnExpiry: boolean;

  @Prop({ type: Boolean, default: true })
  blockSupportOnExpiry: boolean;

  @Prop({ type: Boolean, default: true })
  blockActivationsOnExpiry: boolean;

  @Prop({ type: Number, default: 30 })
  reminderThresholdDays: number;

  // ── System Flags ──────────────────────────────────────────────────
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDefault: boolean;
}

export const LicensePlanSchema = SchemaFactory.createForClass(LicensePlan);

LicensePlanSchema.index({ slug: 1 }, { unique: true });
LicensePlanSchema.index({ isActive: 1 });
LicensePlanSchema.index({ isDefault: 1 });
