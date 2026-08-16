import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StorageConfigDocument = StorageConfig & Document;

export enum StorageProviderType {
  LOCAL = 'local',
  S3 = 's3',
  R2 = 'r2',
}

@Schema({ _id: false })
export class LocalStorageOptions {
  @Prop({ default: 'uploads' })
  uploadDirectory: string;

  @Prop({ default: '/api/v1/public/media' })
  baseUrl: string;
}

@Schema({ _id: false })
export class S3StorageOptions {
  @Prop({ default: '' })
  accessKeyId: string;

  @Prop({ default: '' })
  secretAccessKey: string; // Encrypted in DB

  @Prop({ default: 'us-east-1' })
  region: string;

  @Prop({ default: '' })
  bucket: string;

  @Prop({ default: '' })
  publicUrl: string;

  @Prop({ default: '' })
  pathPrefix: string;

  @Prop({ default: '' })
  cdnUrl: string;
}

@Schema({ _id: false })
export class R2StorageOptions {
  @Prop({ default: '' })
  accountId: string;

  @Prop({ default: '' })
  accessKeyId: string;

  @Prop({ default: '' })
  secretAccessKey: string; // Encrypted in DB

  @Prop({ default: '' })
  bucket: string;

  @Prop({ default: '' })
  endpoint: string; // https://<accountid>.r2.cloudflarestorage.com

  @Prop({ default: '' })
  publicUrl: string;

  @Prop({ default: '' })
  customDomain: string;

  @Prop({ default: '' })
  pathPrefix: string;
}

@Schema({ timestamps: true })
export class StorageConfig {
  @Prop({
    required: true,
    enum: StorageProviderType,
    default: StorageProviderType.LOCAL,
    unique: true,
  })
  provider: StorageProviderType;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isEnabled: boolean;

  @Prop({ type: LocalStorageOptions, default: () => ({}) })
  localConfig: LocalStorageOptions;

  @Prop({ type: S3StorageOptions, default: () => ({}) })
  s3Config: S3StorageOptions;

  @Prop({ type: R2StorageOptions, default: () => ({}) })
  r2Config: R2StorageOptions;

  @Prop({ type: Date })
  lastTestedAt?: Date;

  @Prop({ default: 'untested', enum: ['untested', 'success', 'failed'] })
  lastTestStatus: string;

  @Prop({ default: '' })
  lastTestError?: string;

  @Prop({ default: 0 })
  lastTestLatencyMs?: number;
}

export const StorageConfigSchema = SchemaFactory.createForClass(StorageConfig);
