import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReleaseChannel } from '../../common/enums/app.enums';

export type ProductVersionDocument = ProductVersion & Document;

export enum PackageStatus {
  PENDING   = 'pending',
  APPROVED  = 'approved',
  ARCHIVED  = 'archived',
  DISABLED  = 'disabled',
}

@Schema({ timestamps: true, collection: 'product_versions' })
export class ProductVersion {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  version: string;

  @Prop({ type: String, default: '' })
  releaseName: string;

  @Prop({ type: String, default: '' })
  releaseNotes: string;

  @Prop({
    type: String,
    enum: Object.values(ReleaseChannel),
    default: ReleaseChannel.STABLE,
  })
  releaseChannel: ReleaseChannel;

  @Prop({
    type: String,
    enum: Object.values(PackageStatus),
    default: PackageStatus.PENDING,
  })
  packageStatus: PackageStatus;

  // ── File metadata ────────────────────────────────────────────────────────
  /** Original filename as uploaded */
  @Prop({ type: String, default: null })
  originalFileName?: string;

  /** Internal storage path (never exposed publicly) */
  @Prop({ type: String, default: null })
  storagePath?: string;

  /** SHA-256 hex checksum of the ZIP file */
  @Prop({ type: String, default: null })
  fileChecksum?: string;

  /** File size in bytes */
  @Prop({ type: Number, default: 0 })
  fileSize?: number;

  /** MIME type detected during upload */
  @Prop({ type: String, default: null })
  mimeType?: string;

  // ── Compatibility metadata ────────────────────────────────────────────────
  @Prop({ type: String, default: null })
  minPhpVersion?: string;

  @Prop({ type: String, default: null })
  minWordPressVersion?: string;

  @Prop({ type: String, default: null })
  minNodeVersion?: string;

  // ── ZIP validation results ───────────────────────────────────────────────
  /** True if the ZIP structure passed product-type validation */
  @Prop({ type: Boolean, default: false })
  validationPassed: boolean;

  /** Validation errors or warnings from the ZIP inspector */
  @Prop({ type: [String], default: [] })
  validationMessages: string[];

  /** List of top-level entries found in the ZIP (for audit) */
  @Prop({ type: [String], default: [] })
  zipEntries: string[];

  // ── Download control ─────────────────────────────────────────────────────
  /** Whether this version is visible in public update checks */
  @Prop({ type: Boolean, default: false })
  isPublic: boolean;

  /** Whether downloads are enabled (false = archived) */
  @Prop({ type: Boolean, default: true })
  downloadsEnabled: boolean;

  /** Optional external CDN/storage URL (overrides signed-URL generation) */
  @Prop({ type: String, default: null })
  downloadPackageUrl?: string;

  @Prop({ type: Date, default: null })
  publishedAt?: Date;

  // ── Uploader ─────────────────────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy?: Types.ObjectId;

  @Prop({ type: String, default: null })
  uploadedByEmail?: string;

  // ── Archival ─────────────────────────────────────────────────────────────
  @Prop({ type: Date, default: null })
  archivedAt?: Date;

  @Prop({ type: String, default: null })
  archivedReason?: string;
}

export const ProductVersionSchema = SchemaFactory.createForClass(ProductVersion);

ProductVersionSchema.index({ productId: 1, version: 1 }, { unique: true });
ProductVersionSchema.index({ productId: 1, releaseChannel: 1 });
ProductVersionSchema.index({ productId: 1, packageStatus: 1, isPublic: 1 });
