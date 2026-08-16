import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { extname, basename } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { Category, CategoryDocument } from '../../database/schemas/category.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { Media, MediaDocument, MediaUsageReference } from '../../database/schemas/media.schema';
import { StorageService } from '../storage/storage.service';
import { FileCategory, FileVisibility } from '../../database/schemas/stored-file.schema';
import { StorageProviderType } from '../../database/schemas/storage-config.schema';

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
  mediaId?: string;
  storageProvider?: string;
}

import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(FileCategory)
  folder?: FileCategory;

  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;
}

export class QueryMediaDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  mediaType?: 'image' | 'package' | 'document' | 'audio' | 'video' | 'all';

  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsEnum(StorageProviderType)
  storageProvider?: StorageProviderType;

  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @IsOptional()
  @IsString()
  sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
    private readonly storageService: StorageService,
  ) {}

  private mapFolderToCategory(folder?: string): FileCategory {
    switch (folder?.toLowerCase()) {
      case 'thumbnail':
      case 'thumbnails':
        return FileCategory.THUMBNAIL;
      case 'icon':
      case 'icons':
        return FileCategory.ICON;
      case 'banner':
      case 'banners':
        return FileCategory.BANNER;
      case 'screenshot':
      case 'screenshots':
        return FileCategory.SCREENSHOT;
      case 'package':
      case 'packages':
        return FileCategory.PACKAGE;
      case 'document':
      case 'documents':
      case 'documentation':
        return FileCategory.DOCUMENT;
      case 'support':
        return FileCategory.SUPPORT;
      default:
        return FileCategory.GENERAL;
    }
  }

  /**
   * 1. Upload Media File (Images, Packages, Documents, etc.)
   */
  async uploadMedia(
    file: Express.Multer.File,
    folder: string = 'general',
    actorEmail: string = 'system',
    customTitle?: string,
    visibility: FileVisibility = FileVisibility.PUBLIC,
  ): Promise<MediaDocument> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file content uploaded');
    }

    const maxSizeBytes = 100 * 1024 * 1024; // 100MB max limit
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds 100MB limit (size: ${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    const category = this.mapFolderToCategory(folder);

    // Upload through unified dynamic StorageService
    const storedFile = await this.storageService.uploadFile(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      category,
      visibility,
      actorEmail,
    );

    // Clean up filename to create human-readable title
    const originalExt = extname(file.originalname);
    const rawTitle = basename(file.originalname, originalExt)
      .replace(/[-_]+/g, ' ')
      .trim();
    const title = customTitle || rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    // Approximate dimensions for images
    let width = 0;
    let height = 0;
    if (file.mimetype.startsWith('image/')) {
      if (category === FileCategory.ICON) {
        width = 512;
        height = 512;
      } else if (category === FileCategory.BANNER) {
        width = 1920;
        height = 800;
      } else if (category === FileCategory.THUMBNAIL) {
        width = 800;
        height = 500;
      } else {
        width = 1200;
        height = 800;
      }
    }

    const mediaId = uuidv4();
    const publicUrl = storedFile.publicUrl || `/api/v1/public/storage/serve/${storedFile.fileId}`;

    const mediaDoc = await this.mediaModel.create({
      mediaId,
      originalName: file.originalname,
      fileName: storedFile.generatedFilename,
      title,
      altText: title,
      caption: '',
      description: '',
      mimeType: file.mimetype,
      extension: originalExt.replace(/^\./, '').toLowerCase(),
      sizeBytes: file.size,
      width,
      height,
      storageProvider: storedFile.storageProvider,
      storageKey: storedFile.path,
      visibility,
      folder: category,
      publicUrl,
      checksum: storedFile.checksum,
      uploadedBy: actorEmail,
      usedIn: [],
    });

    await this.auditLogModel.create({
      action: 'MEDIA_ITEM_CREATED',
      actorEmail,
      targetType: 'media',
      targetId: mediaId,
      ip: '127.0.0.1',
      after: {
        mediaId,
        title,
        filename: file.originalname,
        provider: storedFile.storageProvider,
        folder: category,
      },
    });

    return mediaDoc;
  }

  /**
   * Backwards compatible helper for single image uploads
   */
  async processAndSaveImage(
    file: Express.Multer.File,
    mediaType: string = 'general',
    actorEmail: string,
  ): Promise<UploadedMediaResult> {
    const media = await this.uploadMedia(file, mediaType, actorEmail);
    return {
      url: media.publicUrl,
      fileName: media.fileName,
      originalName: media.originalName,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      width: media.width,
      height: media.height,
      mediaType,
      uploadedAt: (media as any).createdAt || new Date(),
      fileId: media.mediaId,
      mediaId: media.mediaId,
      storageProvider: media.storageProvider,
    };
  }

  /**
   * 2. Query Media Library with Filtering, Search & Sorting
   */
  async getMediaList(query: QueryMediaDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 24));
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Search query across title, originalName, caption, fileName
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [
        { title: regex },
        { originalName: regex },
        { fileName: regex },
        { caption: regex },
        { altText: regex },
      ];
    }

    // Media Type filter
    if (query.mediaType && query.mediaType !== 'all') {
      if (query.mediaType === 'image') {
        filter.mimeType = { $regex: '^image/', $options: 'i' };
      } else if (query.mediaType === 'package') {
        filter.$or = [
          { mimeType: { $in: ['application/zip', 'application/x-zip-compressed', 'application/x-tar', 'application/gzip'] } },
          { extension: { $in: ['zip', 'tar', 'gz', 'rar', '7z'] } },
        ];
      } else if (query.mediaType === 'document') {
        filter.$or = [
          { mimeType: { $regex: 'pdf|document|text|msword', $options: 'i' } },
          { extension: { $in: ['pdf', 'doc', 'docx', 'txt', 'md'] } },
        ];
      } else if (query.mediaType === 'audio') {
        filter.mimeType = { $regex: '^audio/', $options: 'i' };
      } else if (query.mediaType === 'video') {
        filter.mimeType = { $regex: '^video/', $options: 'i' };
      }
    }

    if (query.folder) filter.folder = this.mapFolderToCategory(query.folder);
    if (query.storageProvider) filter.storageProvider = query.storageProvider;
    if (query.visibility) filter.visibility = query.visibility;

    // Sorting
    let sortObj: any = { createdAt: -1 };
    if (query.sort === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (query.sort === 'name_asc') {
      sortObj = { title: 1 };
    } else if (query.sort === 'name_desc') {
      sortObj = { title: -1 };
    } else if (query.sort === 'size_desc') {
      sortObj = { sizeBytes: -1 };
    } else if (query.sort === 'size_asc') {
      sortObj = { sizeBytes: 1 };
    }

    const [items, total, folderStats] = await Promise.all([
      this.mediaModel.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      this.mediaModel.countDocuments(filter),
      this.getMediaFoldersStats(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      folderStats,
    };
  }

  /**
   * 3. Get Single Media Item & Live Sync Usage
   */
  async getMediaById(mediaId: string): Promise<MediaDocument> {
    const media = await this.mediaModel.findOne({
      $or: [{ mediaId }, { fileName: mediaId }, { _id: Types.ObjectId.isValid(mediaId) ? new Types.ObjectId(mediaId) : null }],
    });

    if (!media) {
      throw new NotFoundException('Media item not found');
    }

    // Refresh live usage references
    const liveUsage = await this.scanLiveUsage(media);
    media.usedIn = liveUsage;
    await media.save();

    return media;
  }

  /**
   * 4. Update Media Metadata
   */
  async updateMediaMetadata(
    mediaId: string,
    dto: UpdateMediaDto,
    actorEmail: string,
  ): Promise<MediaDocument> {
    const media = await this.getMediaById(mediaId);

    if (dto.title !== undefined) media.title = dto.title;
    if (dto.altText !== undefined) media.altText = dto.altText;
    if (dto.caption !== undefined) media.caption = dto.caption;
    if (dto.description !== undefined) media.description = dto.description;
    if (dto.folder !== undefined) media.folder = dto.folder;
    if (dto.visibility !== undefined) media.visibility = dto.visibility;

    await media.save();

    await this.auditLogModel.create({
      action: 'MEDIA_ITEM_UPDATED',
      actorEmail,
      targetType: 'media',
      targetId: media.mediaId,
      ip: '127.0.0.1',
      after: {
        mediaId: media.mediaId,
        title: media.title,
        folder: media.folder,
        visibility: media.visibility,
      },
    });

    return media;
  }

  /**
   * 5. Replace Media Binary while keeping ID & references
   */
  async replaceMediaFile(
    mediaId: string,
    newFile: Express.Multer.File,
    actorEmail: string,
  ): Promise<MediaDocument> {
    const media = await this.getMediaById(mediaId);

    if (!newFile || !newFile.buffer) {
      throw new BadRequestException('No replacement file uploaded');
    }

    // 1. Delete old storage object
    await this.storageService.deleteStoredFile(media.storageKey, actorEmail);

    // 2. Upload new binary through storage service
    const storedFile = await this.storageService.uploadFile(
      {
        buffer: newFile.buffer,
        originalname: newFile.originalname,
        mimetype: newFile.mimetype,
        size: newFile.size,
      },
      media.folder,
      media.visibility,
      actorEmail,
    );

    media.originalName = newFile.originalname;
    media.fileName = storedFile.generatedFilename;
    media.mimeType = newFile.mimetype;
    media.sizeBytes = newFile.size;
    media.extension = extname(newFile.originalname).replace(/^\./, '').toLowerCase();
    media.storageProvider = storedFile.storageProvider;
    media.storageKey = storedFile.path;
    media.publicUrl = storedFile.publicUrl || `/api/v1/public/storage/serve/${storedFile.fileId}`;
    media.checksum = storedFile.checksum;

    await media.save();

    await this.auditLogModel.create({
      action: 'MEDIA_FILE_REPLACED',
      actorEmail,
      targetType: 'media',
      targetId: media.mediaId,
      ip: '127.0.0.1',
      after: {
        mediaId: media.mediaId,
        newFilename: newFile.originalname,
        sizeBytes: newFile.size,
      },
    });

    return media;
  }

  /**
   * 6. Safe Delete Media Protection
   */
  async deleteMedia(
    mediaId: string,
    force: boolean = false,
    actorEmail: string,
  ): Promise<{ deleted: boolean; message: string; references?: MediaUsageReference[] }> {
    const media = await this.mediaModel.findOne({
      $or: [{ mediaId }, { fileName: mediaId }, { _id: Types.ObjectId.isValid(mediaId) ? new Types.ObjectId(mediaId) : null }],
    });

    if (!media) {
      return { deleted: false, message: 'Media not found' };
    }

    // Live scan usage references
    const liveUsage = await this.scanLiveUsage(media);

    if (liveUsage.length > 0 && !force) {
      const entityNames = liveUsage.map((u) => `${u.entityName} (${u.field})`).join(', ');
      throw new BadRequestException(
        `Safe Delete Guard: This media item is currently referenced in ${liveUsage.length} place(s): ${entityNames}. Use force=true to override.`,
      );
    }

    // Delete from underlying storage
    await this.storageService.deleteStoredFile(media.storageKey, actorEmail);

    // Delete media record
    await this.mediaModel.deleteOne({ _id: media._id });

    await this.auditLogModel.create({
      action: 'MEDIA_ITEM_DELETED',
      actorEmail,
      targetType: 'media',
      targetId: media.mediaId,
      ip: '127.0.0.1',
      after: {
        mediaId: media.mediaId,
        title: media.title,
        filename: media.originalName,
        forced: force,
      },
    });

    return {
      deleted: true,
      message: 'Media deleted successfully',
      references: liveUsage,
    };
  }

  /**
   * 7. Bulk Delete Media with Safe Delete Protection
   */
  async bulkDeleteMedia(
    mediaIds: string[],
    force: boolean = false,
    actorEmail: string,
  ): Promise<{
    deletedCount: number;
    blockedCount: number;
    blockedItems: Array<{ mediaId: string; title: string; reason: string }>;
  }> {
    let deletedCount = 0;
    let blockedCount = 0;
    const blockedItems: Array<{ mediaId: string; title: string; reason: string }> = [];

    for (const id of mediaIds) {
      try {
        await this.deleteMedia(id, force, actorEmail);
        deletedCount++;
      } catch (err: any) {
        blockedCount++;
        const item = await this.mediaModel.findOne({ mediaId: id });
        blockedItems.push({
          mediaId: id,
          title: item?.title || id,
          reason: err.message || 'Deletion blocked',
        });
      }
    }

    return {
      deletedCount,
      blockedCount,
      blockedItems,
    };
  }

  /**
   * 8. Bulk Update Folder
   */
  async bulkUpdateFolder(
    mediaIds: string[],
    folder: FileCategory,
    actorEmail: string,
  ): Promise<{ updatedCount: number }> {
    const res = await this.mediaModel.updateMany(
      { mediaId: { $in: mediaIds } },
      { $set: { folder } },
    );

    await this.auditLogModel.create({
      action: 'MEDIA_BULK_FOLDER_UPDATED',
      actorEmail,
      targetType: 'media',
      targetId: folder,
      ip: '127.0.0.1',
      after: { mediaIds, targetFolder: folder },
    });

    return { updatedCount: res.modifiedCount };
  }

  /**
   * 9. Folder Breakdown Stats
   */
  async getMediaFoldersStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {
      all: 0,
      products: 0,
      thumbnails: 0,
      icons: 0,
      banners: 0,
      screenshots: 0,
      packages: 0,
      documentation: 0,
      support: 0,
      general: 0,
    };

    const counts = await this.mediaModel.aggregate([
      { $group: { _id: '$folder', count: { $sum: 1 } } },
    ]);

    let total = 0;
    counts.forEach((c) => {
      total += c.count;
      if (stats[c._id] !== undefined) {
        stats[c._id] = c.count;
      }
    });
    stats.all = total;

    return stats;
  }

  /**
   * Internal Live Usage Scanner across Products and Categories
   */
  private async scanLiveUsage(media: MediaDocument): Promise<MediaUsageReference[]> {
    const refs: MediaUsageReference[] = [];
    const url = media.publicUrl;
    const filename = media.fileName;

    if (!url && !filename) return refs;

    // Search in Products
    const products = await this.productModel
      .find({
        $or: [
          { thumbnailUrl: { $regex: filename, $options: 'i' } },
          { iconUrl: { $regex: filename, $options: 'i' } },
          { logoUrl: { $regex: filename, $options: 'i' } },
          { bannerUrl: { $regex: filename, $options: 'i' } },
          { screenshots: { $elemMatch: { $regex: filename, $options: 'i' } } },
        ],
      })
      .lean();

    for (const p of products) {
      if (p.thumbnailUrl?.includes(filename)) {
        refs.push({
          entityType: 'product',
          entityId: p._id.toString(),
          entityName: p.name,
          field: 'thumbnailUrl',
          associatedAt: new Date(),
        });
      }
      if (p.iconUrl?.includes(filename)) {
        refs.push({
          entityType: 'product',
          entityId: p._id.toString(),
          entityName: p.name,
          field: 'iconUrl',
          associatedAt: new Date(),
        });
      }
      if (p.bannerUrl?.includes(filename)) {
        refs.push({
          entityType: 'product',
          entityId: p._id.toString(),
          entityName: p.name,
          field: 'bannerUrl',
          associatedAt: new Date(),
        });
      }
      if (p.screenshots?.some((s) => s.includes(filename))) {
        refs.push({
          entityType: 'product',
          entityId: p._id.toString(),
          entityName: p.name,
          field: 'screenshots',
          associatedAt: new Date(),
        });
      }
    }

    // Search in Categories
    const categories = await this.categoryModel
      .find({
        $or: [
          { thumbnailUrl: { $regex: filename, $options: 'i' } },
          { icon: { $regex: filename, $options: 'i' } },
        ],
      })
      .lean();

    for (const c of categories) {
      refs.push({
        entityType: 'category',
        entityId: c._id.toString(),
        entityName: c.name,
        field: 'thumbnailUrl',
        associatedAt: new Date(),
      });
    }

    return refs;
  }
}
