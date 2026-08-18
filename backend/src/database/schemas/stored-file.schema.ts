import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { StorageProviderType } from './storage-config.schema';

export type StoredFileDocument = StoredFile & Document;

export enum FileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum FileCategory {
  THUMBNAIL = 'thumbnail',
  ICON = 'icon',
  BANNER = 'banner',
  SCREENSHOT = 'screenshot',
  PACKAGE = 'package',
  DOCUMENT = 'document',
  SUPPORT = 'support',
  GENERAL = 'general',
}

@Schema({ timestamps: true })
export class StoredFile {
  @Prop({ required: true, unique: true, index: true })
  fileId: string; // UUID v4

  @Prop({
    type: String,
    required: true,
    enum: StorageProviderType,
    default: StorageProviderType.LOCAL,
    index: true,
  })
  storageProvider: StorageProviderType;

  @Prop({ default: '' })
  bucket: string;

  @Prop({ required: true })
  path: string; // Key / relative storage path

  @Prop({ required: true })
  originalFilename: string;

  @Prop({ required: true })
  generatedFilename: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ default: '' })
  extension: string;

  @Prop({ required: true, default: 0 })
  sizeBytes: number;

  @Prop({
    required: true,
    type: String,
    enum: FileVisibility,
    default: FileVisibility.PUBLIC,
    index: true,
  })
  visibility: FileVisibility;

  @Prop({ default: '' })
  publicUrl: string;

  @Prop({ default: '' })
  checksum: string; // SHA-256

  @Prop({ default: 'system' })
  uploadedBy: string;

  @Prop({
    required: true,
    type: String,
    enum: FileCategory,
    default: FileCategory.GENERAL,
    index: true,
  })
  category: FileCategory;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const StoredFileSchema = SchemaFactory.createForClass(StoredFile);
