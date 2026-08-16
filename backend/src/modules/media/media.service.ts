import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { StorageService } from '../storage/storage.service';
import { FileCategory, FileVisibility } from '../../database/schemas/stored-file.schema';

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
  fileId?: string;
  storageProvider?: string;
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
    private readonly storageService: StorageService,
  ) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  private mapMediaTypeToCategory(mediaType: string): FileCategory {
    switch (mediaType?.toLowerCase()) {
      case 'thumbnail':
        return FileCategory.THUMBNAIL;
      case 'icon':
        return FileCategory.ICON;
      case 'banner':
        return FileCategory.BANNER;
      case 'screenshot':
        return FileCategory.SCREENSHOT;
      case 'document':
        return FileCategory.DOCUMENT;
      case 'support':
        return FileCategory.SUPPORT;
      default:
        return FileCategory.GENERAL;
    }
  }

  /**
   * 1. Validate & Save Uploaded Image File via Storage Provider
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

    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `Image file exceeds 15MB limit (size: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    const category = this.mapMediaTypeToCategory(mediaType);

    // Upload through unified dynamic StorageService
    const storedFile = await this.storageService.uploadFile(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      category,
      FileVisibility.PUBLIC,
      actorEmail,
    );

    // Approximate dimensions metadata based on type
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

    const result: UploadedMediaResult = {
      url: storedFile.publicUrl || `/api/v1/public/storage/serve/${storedFile.fileId}`,
      fileName: storedFile.generatedFilename,
      originalName: storedFile.originalFilename,
      mimeType: storedFile.mimeType,
      sizeBytes: storedFile.sizeBytes,
      width,
      height,
      mediaType,
      uploadedAt: (storedFile as any).createdAt || new Date(),
      fileId: storedFile.fileId,
      storageProvider: storedFile.storageProvider,
    };

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
    const product = await this.productModel.findById(
      Types.ObjectId.isValid(productId) ? new Types.ObjectId(productId) : null,
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const before = {
      thumbnailUrl: product.thumbnailUrl,
      iconUrl: product.iconUrl,
      logoUrl: product.logoUrl,
      bannerUrl: product.bannerUrl,
      screenshotsCount: product.screenshots?.length || 0,
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
    const deleted = await this.storageService.deleteStoredFile(fileName, actorEmail);
    return { deleted };
  }
}
