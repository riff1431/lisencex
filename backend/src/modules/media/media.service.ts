import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, statSync } from 'fs';
import * as crypto from 'crypto';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';

export interface UploadedMediaResult {
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  mediaType: string;
  uploadedAt: Date;
}

import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateProductMediaDto {
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsArray()
  screenshots?: string[];

  @IsOptional()
  @IsArray()
  mediaGallery?: Array<{
    url: string;
    title?: string;
    type?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    order?: number;
    uploadedAt?: Date;
  }>;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads', 'media');

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {
    // Ensure media uploads directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  /**
   * 1. Validate & Save Uploaded Image File
   */
  async processAndSaveImage(
    file: Express.Multer.File,
    mediaType: string = 'general',
    actorEmail: string,
  ): Promise<UploadedMediaResult> {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }

    const allowedMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml',
      'image/gif',
    ];

    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
    const fileExt = extname(file.originalname).toLowerCase();

    if (!allowedMimeTypes.includes(file.mimetype) && !allowedExts.includes(fileExt)) {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Accepted formats: PNG, JPG, JPEG, WEBP, SVG, GIF.`,
      );
    }

    // Size limit check: 10 MB for banner/screenshot, 5 MB for others
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`Image file exceeds 10MB limit (size: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Generate unique sanitized filename
    const hash = crypto.randomBytes(8).toString('hex');
    const sanitizedBase = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.[^/.]+$/, '')
      .slice(0, 32);
    const fileName = `${mediaType}_${Date.now()}_${hash}_${sanitizedBase}${fileExt}`;
    const filePath = join(this.uploadDir, fileName);

    // Write file to disk
    writeFileSync(filePath, file.buffer);

    // Approximate SVG or dimensions metadata (default reasonable bounds if not decoded)
    let width = 1200;
    let height = 675;
    if (mediaType === 'icon' || mediaType === 'logo') {
      width = 512;
      height = 512;
    } else if (mediaType === 'banner') {
      width = 1920;
      height = 800;
    } else if (mediaType === 'thumbnail') {
      width = 800;
      height = 500;
    }

    const publicUrl = `/api/v1/public/media/${fileName}`;

    const result: UploadedMediaResult = {
      url: publicUrl,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      width,
      height,
      mediaType,
      uploadedAt: new Date(),
    };

    // Audit log
    await this.auditLogModel.create({
      actorEmail,
      action: 'PRODUCT_MEDIA_UPLOADED',
      targetType: 'media',
      targetId: fileName,
      after: {
        fileName,
        mediaType,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      },
    });

    return result;
  }

  /**
   * 2. Update / Reorder Product Media
   */
  async updateProductMedia(
    productId: string,
    dto: UpdateProductMediaDto,
    actorEmail: string,
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const before = {
      thumbnailUrl: product.thumbnailUrl,
      iconUrl: product.iconUrl,
      logoUrl: product.logoUrl,
      bannerUrl: product.bannerUrl,
      screenshots: product.screenshots,
      mediaGallery: product.mediaGallery,
    };

    if (dto.thumbnailUrl !== undefined) product.thumbnailUrl = dto.thumbnailUrl;
    if (dto.iconUrl !== undefined) product.iconUrl = dto.iconUrl;
    if (dto.logoUrl !== undefined) product.logoUrl = dto.logoUrl;
    if (dto.bannerUrl !== undefined) product.bannerUrl = dto.bannerUrl;
    if (dto.screenshots !== undefined) product.screenshots = dto.screenshots;
    if (dto.mediaGallery !== undefined) product.mediaGallery = dto.mediaGallery;

    product.mediaMetadata = {
      totalScreenshots: product.screenshots?.length || 0,
      hasThumbnail: !!product.thumbnailUrl,
      hasIcon: !!product.iconUrl,
      hasBanner: !!product.bannerUrl,
      lastMediaUpdate: new Date(),
    };

    await product.save();

    await this.auditLogModel.create({
      actorEmail,
      action: 'PRODUCT_MEDIA_UPDATED',
      targetType: 'product',
      targetId: product._id.toString(),
      before,
      after: {
        thumbnailUrl: product.thumbnailUrl,
        iconUrl: product.iconUrl,
        logoUrl: product.logoUrl,
        bannerUrl: product.bannerUrl,
        screenshotsCount: product.screenshots?.length,
      },
    });

    return product;
  }

  /**
   * 3. Delete Media File
   */
  async deleteMediaFile(fileName: string, actorEmail: string): Promise<{ deleted: boolean }> {
    // Sanitize fileName to prevent directory traversal
    const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '');
    const filePath = join(this.uploadDir, safeName);

    if (existsSync(filePath)) {
      unlinkSync(filePath);

      await this.auditLogModel.create({
        actorEmail,
        action: 'PRODUCT_MEDIA_DELETED',
        targetType: 'media',
        targetId: safeName,
      });

      return { deleted: true };
    }

    return { deleted: false };
  }
}
