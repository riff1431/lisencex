import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { extname, basename } from 'path';
import {
  StorageConfig,
  StorageConfigDocument,
  StorageProviderType,
} from '../../database/schemas/storage-config.schema';
import {
  StoredFile,
  StoredFileDocument,
  FileVisibility,
  FileCategory,
} from '../../database/schemas/stored-file.schema';
import { AuditLog, AuditLogDocument } from '../../database/schemas/audit-log.schema';
import { Media, MediaDocument } from '../../database/schemas/media.schema';
import { StorageProvider } from './providers/storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { R2StorageProvider } from './providers/r2-storage.provider';
import { MinioStorageProvider } from './providers/minio-storage.provider';
import { existsSync, readFileSync } from 'fs';
import { join, resolve, sep } from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly localProvider: LocalStorageProvider = new LocalStorageProvider();
  private readonly s3Provider: S3StorageProvider = new S3StorageProvider();
  private readonly r2Provider: R2StorageProvider = new R2StorageProvider();
  private readonly minioProvider: MinioStorageProvider = new MinioStorageProvider();

  // Encryption key derived from JWT_SECRET or fallback
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectModel(StorageConfig.name)
    private readonly configModel: Model<StorageConfigDocument>,
    @InjectModel(StoredFile.name)
    private readonly fileModel: Model<StoredFileDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Media.name)
    private readonly mediaModel: Model<MediaDocument>,
  ) {
    const dedicatedSecret = process.env.STORAGE_ENCRYPTION_SECRET;
    if (dedicatedSecret) {
      this.encryptionKey = crypto.createHash('sha256').update(dedicatedSecret).digest();
    } else {
      // Legacy derivation — must stay byte-compatible so credentials already
      // encrypted in the database remain decryptable.
      const rawSecret =
        process.env.ACTIVATION_SECRET || process.env.JWT_SECRET ||
        'licensenest_storage_encryption_secret_32b';
      this.encryptionKey = crypto.createHash('sha256').update(rawSecret).digest();

      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(
          'STORAGE_ENCRYPTION_SECRET is not set — storage credentials are keyed from ' +
            'ACTIVATION_SECRET/JWT_SECRET. Set STORAGE_ENCRYPTION_SECRET and re-save provider ' +
            'credentials in the admin UI to decouple storage encryption from auth secrets.',
        );
      }
    }
  }

  async onModuleInit() {
    await this.seedDefaultConfigs();
    await this.refreshProviders();
    await this.repairObjectPublicUrls();
  }

  /**
   * Self-heal rows created before public URLs were proxied: object-stored
   * files whose publicUrl still points directly at the (plain-http) storage
   * endpoint are broken as mixed content on the https storefront. Rewrite
   * them to the API-streaming routes. Local-provider URLs were always
   * relative, so the absolute-URL filter targets only object rows.
   */
  private async repairObjectPublicUrls(): Promise<void> {
    try {
      const rawUrlFilter = { publicUrl: { $regex: /^https?:\/\// } } as any;

      const files = await this.fileModel.find(rawUrlFilter).select('fileId').lean();
      for (const f of files) {
        await this.fileModel.updateOne(
          { _id: f._id },
          { $set: { publicUrl: `/api/v1/public/storage/serve/${f.fileId}` } },
        );
      }

      const medias = await this.mediaModel.find(rawUrlFilter).select('fileName').lean();
      for (const m of medias) {
        await this.mediaModel.updateOne(
          { _id: m._id },
          { $set: { publicUrl: `/api/v1/public/media/${m.fileName}` } },
        );
      }

      if (files.length || medias.length) {
        this.logger.log(
          `Repaired ${files.length} stored-file and ${medias.length} media public URLs to API-proxied paths`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to repair public URLs', err);
    }
  }

  /**
   * Encrypt secret keys before saving in MongoDB
   */
  private encryptSecret(plainText: string): string {
    if (!plainText || plainText.startsWith('enc:')) return plainText;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt secret keys for provider initialization
   */
  private decryptSecret(cipherText: string): string {
    if (!cipherText || !cipherText.startsWith('enc:')) return cipherText;
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 4) return cipherText;
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      this.logger.error('Failed to decrypt storage credential', err);
      return '';
    }
  }

  /**
   * Seed default StorageConfig documents if they don't exist
   */
  async seedDefaultConfigs() {
    const local = await this.configModel.findOne({ provider: StorageProviderType.LOCAL });
    if (!local) {
      await this.configModel.create({
        provider: StorageProviderType.LOCAL,
        isDefault: true,
        isEnabled: true,
        localConfig: {
          uploadDirectory: 'uploads',
          baseUrl: '/api/v1/public/media',
        },
        lastTestStatus: 'success',
        lastTestedAt: new Date(),
      });
    }

    const s3 = await this.configModel.findOne({ provider: StorageProviderType.S3 });
    if (!s3) {
      await this.configModel.create({
        provider: StorageProviderType.S3,
        isDefault: false,
        isEnabled: false,
        s3Config: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: this.encryptSecret(process.env.AWS_SECRET_ACCESS_KEY || ''),
          region: process.env.AWS_REGION || 'us-east-1',
          bucket: process.env.AWS_S3_BUCKET || '',
          publicUrl: '',
          pathPrefix: 'licensenest',
          cdnUrl: '',
        },
        lastTestStatus: 'untested',
      });
    }

    const r2 = await this.configModel.findOne({ provider: StorageProviderType.R2 });
    if (!r2) {
      await this.configModel.create({
        provider: StorageProviderType.R2,
        isDefault: false,
        isEnabled: false,
        r2Config: {
          accountId: process.env.R2_ACCOUNT_ID || '',
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: this.encryptSecret(process.env.R2_SECRET_ACCESS_KEY || ''),
          bucket: process.env.R2_BUCKET || '',
          endpoint: '',
          publicUrl: '',
          customDomain: '',
          pathPrefix: 'licensenest',
        },
        lastTestStatus: 'untested',
      });
    }

    const minio = await this.configModel.findOne({ provider: StorageProviderType.MINIO });
    if (!minio) {
      await this.configModel.create({
        provider: StorageProviderType.MINIO,
        isDefault: false,
        isEnabled: false,
        minioConfig: {
          endpoint: process.env.MINIO_ENDPOINT || '',
          accessKeyId: process.env.MINIO_ACCESS_KEY_ID || '',
          secretAccessKey: this.encryptSecret(process.env.MINIO_SECRET_ACCESS_KEY || ''),
          region: process.env.MINIO_REGION || 'us-east-1',
          bucket: process.env.MINIO_BUCKET || 'marketplace',
          publicUrl: '',
          pathPrefix: '',
        },
        lastTestStatus: 'untested',
      });
    } else if (!minio.minioConfig?.endpoint && process.env.MINIO_ENDPOINT) {
      // Doc was seeded empty (deployed before env vars were set) — fill it
      // from env so an env-driven setup works without the admin UI. Once a
      // endpoint is present (env or UI), it is never overwritten again.
      minio.minioConfig = {
        endpoint: process.env.MINIO_ENDPOINT,
        accessKeyId: process.env.MINIO_ACCESS_KEY_ID || '',
        secretAccessKey: this.encryptSecret(process.env.MINIO_SECRET_ACCESS_KEY || ''),
        region: process.env.MINIO_REGION || 'us-east-1',
        bucket: process.env.MINIO_BUCKET || 'marketplace',
        publicUrl: '',
        pathPrefix: '',
      };
      await minio.save();
      this.logger.log('MinIO storage config auto-filled from environment variables');
    }
  }

  /**
   * Reinitialize providers from database configs
   */
  async refreshProviders() {
    const configs = await this.configModel.find().lean();

    for (const c of configs) {
      if (c.provider === StorageProviderType.LOCAL && c.localConfig) {
        this.localProvider.setOptions(c.localConfig);
      } else if (c.provider === StorageProviderType.S3 && c.s3Config) {
        this.s3Provider.setConfig({
          ...c.s3Config,
          secretAccessKey: this.decryptSecret(c.s3Config.secretAccessKey),
        });
      } else if (c.provider === StorageProviderType.R2 && c.r2Config) {
        this.r2Provider.setConfig({
          ...c.r2Config,
          secretAccessKey: this.decryptSecret(c.r2Config.secretAccessKey),
        });
      } else if (c.provider === StorageProviderType.MINIO && c.minioConfig) {
        this.minioProvider.setConfig({
          ...c.minioConfig,
          secretAccessKey: this.decryptSecret(c.minioConfig.secretAccessKey),
        });
      }
    }
  }

  /**
   * Get active/default storage provider
   */
  async getActiveProvider(): Promise<{
    provider: StorageProvider;
    type: StorageProviderType;
    config: StorageConfigDocument;
  }> {
    let activeConfig = await this.configModel.findOne({ isDefault: true, isEnabled: true });
    if (!activeConfig) {
      activeConfig = await this.configModel.findOne({ provider: StorageProviderType.LOCAL });
    }

    const type = activeConfig?.provider || StorageProviderType.LOCAL;
    return {
      provider: this.getProviderInstance(type),
      type,
      config: activeConfig!,
    };
  }

  /**
   * Get provider instance by type
   */
  getProviderInstance(type: StorageProviderType): StorageProvider {
    switch (type) {
      case StorageProviderType.S3:
        return this.s3Provider;
      case StorageProviderType.R2:
        return this.r2Provider;
      case StorageProviderType.MINIO:
        return this.minioProvider;
      case StorageProviderType.LOCAL:
      default:
        return this.localProvider;
    }
  }

  /**
   * Private-object API for non-media artifacts (distributable package ZIPs).
   * These bypass StoredFile/media semantics entirely — no public serving, no
   * media rows; access only through short-lived signed URLs.
   */
  async isObjectStorageActive(): Promise<boolean> {
    const { type } = await this.getActiveProvider();
    return type !== StorageProviderType.LOCAL;
  }

  async putPrivateObject(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<{ key: string; sizeBytes: number }> {
    const { provider } = await this.getActiveProvider();
    const result = await provider.upload(buffer, key, mimeType, false);
    return { key: result.path, sizeBytes: result.sizeBytes };
  }

  /**
   * Central Upload Handler for all file types
   */
  async uploadFile(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    category: FileCategory = FileCategory.GENERAL,
    visibility: FileVisibility = FileVisibility.PUBLIC,
    actorEmail: string = 'system',
    customSubPath?: string,
  ): Promise<StoredFileDocument> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file content provided for upload');
    }

    const { provider, type } = await this.getActiveProvider();

    const fileId = crypto.randomUUID();
    const originalExt = extname(file.originalname).toLowerCase();
    const cleanBasename = basename(file.originalname, originalExt)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'file';

    const generatedFilename = `${fileId.slice(0, 8)}-${cleanBasename}${originalExt}`;
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '/'); // "2026/08"

    const relativePath = customSubPath
      ? `${category}/${customSubPath}/${generatedFilename}`
      : `${category}/${datePrefix}/${generatedFilename}`;

    // Compute SHA-256 Checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Upload via active provider
    const isPublic = visibility === FileVisibility.PUBLIC;
    const uploadResult = await provider.upload(
      file.buffer,
      relativePath,
      file.mimetype,
      isPublic,
    );

    // Save tracking document in MongoDB
    const storedFile = await this.fileModel.create({
      fileId,
      storageProvider: type,
      bucket: (uploadResult as any).bucket || '',
      path: uploadResult.path,
      originalFilename: file.originalname,
      generatedFilename,
      mimeType: file.mimetype,
      extension: originalExt.replace(/^\./, ''),
      sizeBytes: file.size || file.buffer.length,
      visibility,
      // Self-hosted MinIO/S3 endpoints are frequently plain http on internal
      // hosts — a browser on the https storefront refuses them as
      // mixed-content. Public URLs therefore always point at the API's own
      // streaming route, which fetches the object server-side.
      publicUrl:
        isPublic && type !== StorageProviderType.LOCAL
          ? `/api/v1/public/storage/serve/${fileId}`
          : isPublic
            ? uploadResult.url
            : '',
      checksum,
      uploadedBy: actorEmail,
      category,
      metadata: {
        dimensions: (file as any).dimensions || undefined,
      },
    });

    // Record Audit Trail
    await this.auditLogModel.create({
      action: 'FILE_UPLOADED',
      actorEmail,
      targetType: 'storage',
      targetId: fileId,
      ip: '127.0.0.1',
      after: {
        fileId,
        provider: type,
        filename: file.originalname,
        category,
        visibility,
        sizeBytes: file.size,
      },
    });

    return storedFile;
  }

  /**
   * Delete Stored File
   */
  async deleteStoredFile(fileIdOrPath: string, actorEmail: string = 'system'): Promise<boolean> {
    const file = await this.fileModel.findOne({
      $or: [{ fileId: fileIdOrPath }, { path: fileIdOrPath }, { generatedFilename: fileIdOrPath }],
    });

    if (!file) {
      return false;
    }

    const provider = this.getProviderInstance(file.storageProvider);
    await provider.delete(file.path);

    await this.fileModel.deleteOne({ _id: file._id });

    await this.auditLogModel.create({
      action: 'FILE_DELETED',
      actorEmail,
      targetType: 'storage',
      targetId: file.fileId,
      ip: '127.0.0.1',
      after: {
        fileId: file.fileId,
        provider: file.storageProvider,
        filename: file.originalFilename,
      },
    });

    return true;
  }

  /**
   * Get Direct or Signed Download URL
   */
  async getDownloadUrl(fileIdOrPath: string, expiresInSeconds: number = 3600): Promise<string> {
    const file = await this.fileModel.findOne({
      $or: [{ fileId: fileIdOrPath }, { path: fileIdOrPath }, { generatedFilename: fileIdOrPath }],
    });

    if (!file) {
      throw new NotFoundException('Requested file not found');
    }

    const provider = this.getProviderInstance(file.storageProvider);

    if (file.visibility === FileVisibility.PUBLIC) {
      return provider.getUrl(file.path);
    }

    return provider.getSignedUrl(file.path, expiresInSeconds);
  }

  /**
   * Get Raw File Buffer with multi-strategy resolution
   */
  async getFileBuffer(fileIdOrPath: string): Promise<{ buffer: Buffer; file?: StoredFileDocument; mimeType: string; filename: string }> {
    let cleanId: string;
    try {
      cleanId = decodeURIComponent(fileIdOrPath);
    } catch {
      throw new NotFoundException('Invalid file identifier');
    }

    // Path traversal guard. This value ultimately reaches the filesystem in
    // step 3 below (`join(cwd, 'uploads', cleanId)`); stripping only LEADING
    // `../` sequences previously allowed `a/../../.env` to escape the uploads
    // dir and read arbitrary files (including the deployed .env).
    // Legitimate storage keys may contain `/` but never `..` segments,
    // null bytes, or absolute paths.
    if (
      cleanId.includes('..') ||
      cleanId.includes('\0') ||
      cleanId.startsWith('/') ||
      /^[a-zA-Z]:[\\/]/.test(cleanId)
    ) {
      throw new NotFoundException('Invalid file path');
    }

    // 1. Check StoredFile schema
    const file = await this.fileModel.findOne({
      $or: [
        { fileId: cleanId },
        { path: cleanId },
        { generatedFilename: cleanId },
        { originalFilename: cleanId },
        { path: { $regex: new RegExp(cleanId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
      ],
    });

    if (file) {
      const provider = this.getProviderInstance(file.storageProvider);
      const buffer = await provider.download(file.path);
      return {
        buffer,
        file,
        mimeType: file.mimeType || 'application/octet-stream',
        filename: file.originalFilename || file.generatedFilename,
      };
    }

    // 2. Check Media schema
    const media = await this.mediaModel.findOne({
      $or: [
        { mediaId: cleanId },
        { fileName: cleanId },
        { storageKey: cleanId },
        { originalName: cleanId },
        { storageKey: { $regex: new RegExp(cleanId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
      ],
    });

    if (media) {
      const provider = this.getProviderInstance(media.storageProvider as StorageProviderType);
      const buffer = await provider.download(media.storageKey);
      return {
        buffer,
        file: null as any,
        mimeType: media.mimeType || 'application/octet-stream',
        filename: media.originalName || media.fileName,
      };
    }

    // 3. Fallback: Search local uploads folder directly
    const localUploadsDir = join(process.cwd(), 'uploads');
    const directPath = resolve(localUploadsDir, cleanId);
    // Defense in depth: whatever survived the input checks above, the
    // resolved path must still resolve strictly inside the uploads root.
    if (
      directPath !== localUploadsDir &&
      !directPath.startsWith(localUploadsDir + sep)
    ) {
      throw new NotFoundException(`Requested file not found`);
    }
    if (existsSync(directPath)) {
      const buffer = readFileSync(directPath);
      const ext = extname(cleanId).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
        '.mp4': 'video/mp4',
        '.mp3': 'audio/mpeg',
      };
      return {
        buffer,
        file: null as any,
        mimeType: mimeMap[ext] || 'application/octet-stream',
        filename: basename(cleanId),
      };
    }

    throw new NotFoundException(`Requested file '${cleanId}' not found`);
  }

  /**
   * Test Provider Connection Live
   */
  async testProvider(
    providerType: StorageProviderType,
    customConfig?: any,
  ): Promise<{ success: boolean; message: string; latencyMs: number; details?: any }> {
    let provider: StorageProvider;

    // The admin UI sends an empty body for the saved-config test — an empty
    // object must not be treated as a custom config (it would instantiate an
    // unconfigured provider). Fall back to the configured provider instance.
    const hasCustomConfig =
      !!customConfig && Object.keys(customConfig).length > 0;

    if (hasCustomConfig) {
      switch (providerType) {
        case StorageProviderType.S3:
          provider = new S3StorageProvider({
            ...customConfig,
            secretAccessKey: customConfig.secretAccessKey?.startsWith('enc:')
              ? this.decryptSecret(customConfig.secretAccessKey)
              : customConfig.secretAccessKey,
          });
          break;
        case StorageProviderType.R2:
          provider = new R2StorageProvider({
            ...customConfig,
            secretAccessKey: customConfig.secretAccessKey?.startsWith('enc:')
              ? this.decryptSecret(customConfig.secretAccessKey)
              : customConfig.secretAccessKey,
          });
          break;
        case StorageProviderType.MINIO:
          provider = new MinioStorageProvider({
            ...customConfig,
            secretAccessKey: customConfig.secretAccessKey?.startsWith('enc:')
              ? this.decryptSecret(customConfig.secretAccessKey)
              : customConfig.secretAccessKey,
          });
          break;
        case StorageProviderType.LOCAL:
        default:
          provider = new LocalStorageProvider(customConfig);
          break;
      }
    } else {
      provider = this.getProviderInstance(providerType);
    }

    const result = await provider.testConnection();

    // Persist test outcome
    await this.configModel.updateOne(
      { provider: providerType },
      {
        $set: {
          lastTestedAt: new Date(),
          lastTestStatus: result.success ? 'success' : 'failed',
          lastTestError: result.success ? '' : result.message,
          lastTestLatencyMs: result.latencyMs,
        },
      },
    );

    return result;
  }

  /**
   * Update Storage Provider Configuration
   */
  async updateConfig(
    providerType: StorageProviderType,
    payload: any,
    actorEmail: string,
  ): Promise<StorageConfigDocument> {
    const doc = await this.configModel.findOne({ provider: providerType });
    if (!doc) {
      throw new NotFoundException(`Provider configuration for ${providerType} not found`);
    }

    if (payload.isEnabled !== undefined) doc.isEnabled = Boolean(payload.isEnabled);
    if (payload.isDefault !== undefined && payload.isDefault) {
      await this.configModel.updateMany({}, { $set: { isDefault: false } });
      doc.isDefault = true;
      doc.isEnabled = true;
    }

    if (providerType === StorageProviderType.LOCAL && payload.localConfig) {
      doc.localConfig = {
        ...doc.localConfig,
        ...payload.localConfig,
      };
    } else if (providerType === StorageProviderType.S3 && payload.s3Config) {
      const existingSecret = doc.s3Config?.secretAccessKey || '';
      const newSecret = payload.s3Config.secretAccessKey;

      doc.s3Config = {
        ...doc.s3Config,
        ...payload.s3Config,
        secretAccessKey: newSecret
          ? (newSecret.includes('••••') ? existingSecret : this.encryptSecret(newSecret))
          : existingSecret,
      };
    } else if (providerType === StorageProviderType.R2 && payload.r2Config) {
      const existingSecret = doc.r2Config?.secretAccessKey || '';
      const newSecret = payload.r2Config.secretAccessKey;

      doc.r2Config = {
        ...doc.r2Config,
        ...payload.r2Config,
        secretAccessKey: newSecret
          ? (newSecret.includes('••••') ? existingSecret : this.encryptSecret(newSecret))
          : existingSecret,
      };
    } else if (providerType === StorageProviderType.MINIO && payload.minioConfig) {
      const existingSecret = doc.minioConfig?.secretAccessKey || '';
      const newSecret = payload.minioConfig.secretAccessKey;

      doc.minioConfig = {
        ...doc.minioConfig,
        ...payload.minioConfig,
        secretAccessKey: newSecret
          ? (newSecret.includes('••••') ? existingSecret : this.encryptSecret(newSecret))
          : existingSecret,
      };
    }

    await doc.save();
    await this.refreshProviders();

    await this.auditLogModel.create({
      action: 'STORAGE_CONFIG_UPDATED',
      actorEmail,
      targetType: 'storage',
      targetId: providerType,
      ip: '127.0.0.1',
      after: {
        provider: providerType,
        isDefault: doc.isDefault,
        isEnabled: doc.isEnabled,
      },
    });

    return doc;
  }

  /**
   * Set Default Provider
   */
  async setDefaultProvider(
    providerType: StorageProviderType,
    actorEmail: string,
  ): Promise<StorageConfigDocument> {
    const target = await this.configModel.findOne({ provider: providerType });
    if (!target) {
      throw new NotFoundException(`Provider ${providerType} not found`);
    }

    await this.configModel.updateMany({}, { $set: { isDefault: false } });
    target.isDefault = true;
    target.isEnabled = true;
    await target.save();

    await this.refreshProviders();

    await this.auditLogModel.create({
      action: 'STORAGE_DEFAULT_PROVIDER_CHANGED',
      actorEmail,
      targetType: 'storage',
      targetId: providerType,
      ip: '127.0.0.1',
      after: { defaultProvider: providerType },
    });

    return target;
  }

  /**
   * Batch File Migration between providers
   */
  async migrateFiles(
    options: {
      fromProvider: StorageProviderType;
      toProvider: StorageProviderType;
      category?: FileCategory;
      fileIds?: string[];
    },
    actorEmail: string,
  ): Promise<{
    totalSelected: number;
    migratedCount: number;
    failedCount: number;
    errors: Array<{ fileId: string; error: string }>;
  }> {
    const { fromProvider, toProvider, category, fileIds } = options;

    if (fromProvider === toProvider) {
      throw new BadRequestException('Source and target storage providers must be different');
    }

    const srcProviderInstance = this.getProviderInstance(fromProvider);
    const destProviderInstance = this.getProviderInstance(toProvider);

    const query: any = { storageProvider: fromProvider };
    if (category) query.category = category;
    if (fileIds && fileIds.length > 0) query.fileId = { $in: fileIds };

    const files = await this.fileModel.find(query);

    let migratedCount = 0;
    let failedCount = 0;
    const errors: Array<{ fileId: string; error: string }> = [];

    for (const file of files) {
      try {
        // 1. Download buffer from source
        const buffer = await srcProviderInstance.download(file.path);

        // 2. Upload to destination
        const isPublic = file.visibility === FileVisibility.PUBLIC;
        const uploadResult = await destProviderInstance.upload(
          buffer,
          file.path,
          file.mimeType,
          isPublic,
        );

        // 3. Update StoredFile document
        file.storageProvider = toProvider;
        file.publicUrl = isPublic ? uploadResult.url : '';
        await file.save();

        // 4. Optionally delete source after successful migration
        await srcProviderInstance.delete(file.path);

        migratedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          fileId: file.fileId,
          error: err.message || 'Transfer failed',
        });
        this.logger.error(`Migration failed for file ${file.fileId}`, err);
      }
    }

    await this.auditLogModel.create({
      action: 'STORAGE_FILES_MIGRATED',
      actorEmail,
      targetType: 'storage',
      targetId: `${fromProvider}->${toProvider}`,
      ip: '127.0.0.1',
      after: {
        fromProvider,
        toProvider,
        category: category || 'all',
        totalSelected: files.length,
        migratedCount,
        failedCount,
      },
    });

    return {
      totalSelected: files.length,
      migratedCount,
      failedCount,
      errors,
    };
  }

  /**
   * Get Storage Statistics & Breakdown
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSizeBytes: number;
    publicFiles: number;
    privateFiles: number;
    byProvider: Record<string, { count: number; sizeBytes: number }>;
    byCategory: Record<string, { count: number; sizeBytes: number }>;
  }> {
    const files = await this.fileModel.find().lean();

    let totalSizeBytes = 0;
    let publicFiles = 0;
    let privateFiles = 0;

    const byProvider: Record<string, { count: number; sizeBytes: number }> = {
      local: { count: 0, sizeBytes: 0 },
      s3: { count: 0, sizeBytes: 0 },
      r2: { count: 0, sizeBytes: 0 },
      minio: { count: 0, sizeBytes: 0 },
    };

    const byCategory: Record<string, { count: number; sizeBytes: number }> = {};

    for (const f of files) {
      const size = f.sizeBytes || 0;
      totalSizeBytes += size;

      if (f.visibility === FileVisibility.PUBLIC) {
        publicFiles++;
      } else {
        privateFiles++;
      }

      if (byProvider[f.storageProvider]) {
        byProvider[f.storageProvider].count++;
        byProvider[f.storageProvider].sizeBytes += size;
      }

      if (!byCategory[f.category]) {
        byCategory[f.category] = { count: 0, sizeBytes: 0 };
      }
      byCategory[f.category].count++;
      byCategory[f.category].sizeBytes += size;
    }

    return {
      totalFiles: files.length,
      totalSizeBytes,
      publicFiles,
      privateFiles,
      byProvider,
      byCategory,
    };
  }

  /**
   * List Stored Files with Filters
   */
  async getStoredFiles(query: {
    provider?: StorageProviderType;
    category?: FileCategory;
    visibility?: FileVisibility;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.provider) filter.storageProvider = query.provider;
    if (query.category) filter.category = query.category;
    if (query.visibility) filter.visibility = query.visibility;
    if (query.search) {
      filter.$or = [
        { originalFilename: { $regex: query.search, $options: 'i' } },
        { generatedFilename: { $regex: query.search, $options: 'i' } },
        { fileId: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.fileModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.fileModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieve all sanitized configs for the Admin UI
   */
  async getAllSanitizedConfigs() {
    const configs = await this.configModel.find().lean();
    return configs.map((c) => {
      const sanitized: any = { ...c };
      if (sanitized.s3Config?.secretAccessKey) {
        sanitized.s3Config.secretAccessKey = '••••••••••••••••';
      }
      if (sanitized.r2Config?.secretAccessKey) {
        sanitized.r2Config.secretAccessKey = '••••••••••••••••';
      }
      if (sanitized.minioConfig?.secretAccessKey) {
        sanitized.minioConfig.secretAccessKey = '••••••••••••••••';
      }
      return sanitized;
    });
  }
}
