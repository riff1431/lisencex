import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  actorId?: Types.ObjectId;

  @Prop({ type: String, default: 'system' })
  actorEmail?: string;

  @Prop({ required: true })
  action: string; // e.g. LICENSE_CREATED, LICENSE_REVOKED, DOMAIN_BLOCKED

  @Prop({ required: true })
  targetType: string; // e.g. product, license, activation, purchase, security

  @Prop({ type: String, default: null })
  targetId?: string;

  @Prop({ type: Object, default: null })
  before?: Record<string, any>;

  @Prop({ type: Object, default: null })
  after?: Record<string, any>;

  @Prop({ type: String, default: null })
  ip?: string;

  @Prop({ type: String, default: null })
  userAgent?: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ actorId: 1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
AuditLogSchema.index({ action: 1 });
