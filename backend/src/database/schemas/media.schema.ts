import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { StorageProviderType } from './storage-config.schema';
import { FileCategory, FileVisibility } from './stored-file.schema';

export type MediaDocument = Media & Document;

@Schema({ _id: false })
export class MediaUsageReference {
  @Prop({ required: true })
  entityType: string; // 'product', 'category', 'documentation', 'ticket'

  @Prop({ required: true })
  entityId: string;

  @Prop({ required: true })
  entityName: string;

  @Prop({ required: true })
  field: string; // 'thumbnailUrl', 'iconUrl', 'bannerUrl', 'screenshot', 'attachment'

  @Prop({ default: Date.now })
  associatedAt: Date;
}

@Schema({ timestamps: true, collection: 'media' })
export class Media {
  @Prop({ required: true, unique: true, index: true })
  mediaId: string; // UUID v4

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  altText: string;

  @Prop({ default: '' })
  caption: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ default: '' })
  extension: string;

  @Prop({ required: true, default: 0 })
  sizeBytes: number;

  @Prop({ default: 0 })
  width?: number;

  @Prop({ default: 0 })
  height?: number;

  @Prop({
    required: true,
    enum: StorageProviderType,
    default: StorageProviderType.LOCAL,
    index: true,
  })
  storageProvider: StorageProviderType;

  @Prop({ required: true })
  storageKey: string; // Path in storage

  @Prop({
    required: true,
    enum: FileVisibility,
    default: FileVisibility.PUBLIC,
    index: true,
  })
  visibility: FileVisibility;

  @Prop({
    required: true,
    enum: FileCategory,
    default: FileCategory.GENERAL,
    index: true,
  })
  folder: FileCategory;

  @Prop({ default: '' })
  publicUrl: string;

  @Prop({ default: '' })
  checksum: string; // SHA-256

  @Prop({ default: 'system' })
  uploadedBy: string;

  @Prop({ type: [MediaUsageReference], default: [] })
  usedIn: MediaUsageReference[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

MediaSchema.index({ title: 'text', originalName: 'text', caption: 'text' });
MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ folder: 1 });
MediaSchema.index({ mimeType: 1 });
MediaSchema.index({ 'usedIn.entityId': 1 });
