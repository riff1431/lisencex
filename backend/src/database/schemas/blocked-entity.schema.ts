import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BlockedEntityDocument = BlockedEntity & Document;

export enum BlockedEntityType {
  IP = 'ip',
  DOMAIN = 'domain',
  LICENSE = 'license',
  USER = 'user',
  INSTALLATION = 'installation',
}

@Schema({ timestamps: true, collection: 'blocked_entities' })
export class BlockedEntity {
  @Prop({
    type: String,
    enum: Object.values(BlockedEntityType),
    required: true,
  })
  type: BlockedEntityType;

  @Prop({ required: true, trim: true })
  value: string; // e.g. "192.168.1.1" or "bad-domain.com" or "LIC-XXX"

  @Prop({ type: String, default: 'Security rule or administrative action' })
  reason: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy?: Types.ObjectId;

  @Prop({ type: Date, default: null }) // null = permanent
  expiresAt?: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const BlockedEntitySchema = SchemaFactory.createForClass(BlockedEntity);

BlockedEntitySchema.index({ type: 1, value: 1 }, { unique: true });
BlockedEntitySchema.index({ isActive: 1 });
BlockedEntitySchema.index({ expiresAt: 1 });
