import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import {
  ProductVersion,
  ProductVersionDocument,
  PackageStatus,
} from '../../database/schemas/product-version.schema';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  DownloadLog,
  DownloadLogDocument,
} from '../../database/schemas/download-log.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import { TokenService } from '../token/token.service';
import { StorageService } from '../storage/storage.service';
import {
  StorageProviderType,
} from '../../database/schemas/storage-config.schema';
import { ZipPackageValidator } from '../../common/utils/zip-validator.util';
import {
  signDownloadToken,
  verifyDownloadToken,
} from '../../common/utils/download-token.util';
import { ProductType, ReleaseChannel, LicenseStatus } from '../../common/enums/app.enums';

export interface UploadPackageDto {
  version: string;
  releaseName?: string;
  releaseNotes?: string;
  releaseChannel?: ReleaseChannel;
  minPhpVersion?: string;
  minWordPressVersion?: string;
  minNodeVersion?: string;
  publishImmediately?: boolean;
  uploadedByEmail?: string;
  uploadedBy?: string;
}

export class PackageActionDto {
  action: 'approve' | 'archive' | 'disable' | 'enable' | 'publish' | 'unpublish';
  reason?: string;
}

@Injectable()
export class PackagesService {
  private readonly storageRoot: string;
  private readonly logger = new Logger(PackagesService.name);

  constructor(
    @InjectModel(ProductVersion.name)
    private versionModel: Model<ProductVersionDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(DownloadLog.name)
    private downloadLogModel: Model<DownloadLogDocument>,
    @InjectModel(License.name)
    private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
    private tokenService: TokenService,
    private configService: ConfigService,
    private storageService: StorageService,
  ) {
    // Packages are stored OUTSIDE the public web root
    this.storageRoot = this.configService.get<string>('PACKAGE_STORAGE_PATH')
      ?? path.join(process.cwd(), 'storage', 'packages');
    this.ensureStorageRoot();
  }

  // ─── Upload & Validate ──────────────────────────────────────────────────

  async uploadPackage(
    productId: string,
    file: Express.Multer.File,
    dto: UploadPackageDto,
  ) {
    // 1. Confirm product exists
    const product = await this.productModel.findById(productId);
    if (!product) {
      this.cleanupFile(file.path);
      throw new NotFoundException('Product not found');
    }

    // 2. Prevent duplicate version — but a file-less version auto-created by
    // products.create() is a placeholder: attach the uploaded file to it
    // instead of rejecting (creating fresh products with a ZIP would
    // otherwise always conflict on currentVersion).
    const existing = await this.versionModel.findOne({
      productId: new Types.ObjectId(productId),
      version: dto.version.trim(),
    });
    const isPlaceholder =
      Boolean(existing) && !existing!.storagePath && !existing!.downloadPackageUrl;
    if (existing && !isPlaceholder) {
      this.cleanupFile(file.path);
      throw new BadRequestException(
        `Version ${dto.version} already exists for this product. Use "replace" action to update the package.`,
      );
    }

    // 3. Validate ZIP structure
    const validation = await ZipPackageValidator.validate(file.path, product.productType as ProductType);

    if (!validation.valid) {
      this.cleanupFile(file.path);
      // `details` is the field the global exception filter passes through to
      // clients — validator errors/warnings go there so the admin UI can show
      // exactly what is wrong with the archive.
      throw new BadRequestException({
        message: 'Package validation failed',
        details: { errors: validation.errors, warnings: validation.warnings },
      });
    }

    // 4. Compute checksum
    const checksum = await ZipPackageValidator.computeChecksum(file.path);

    // 5. Persist to the active storage provider. Object storage (MinIO/S3/R2)
    // survives container rebuilds; local disk is the legacy fallback and
    // requires a persistent volume mount to survive deploys.
    const filename = `${product.slug}-${dto.version}-${Date.now()}.zip`;
    const stored = await this.persistPackageFile(file.path, productId, filename);

    // 6. Create (or attach to placeholder) version record
    const isPublic = Boolean(dto.publishImmediately);
    const fileFields = {
      releaseChannel:       dto.releaseChannel ?? existing?.releaseChannel ?? ReleaseChannel.STABLE,
      packageStatus:        isPublic ? PackageStatus.APPROVED : PackageStatus.PENDING,
      originalFileName:     file.originalname,
      storagePath:          stored.storagePath,
      storageMode:          stored.storageMode,
      storageKey:           stored.storageKey,
      storageProvider:      stored.storageProvider,
      fileChecksum:         checksum,
      fileSize:             file.size,
      mimeType:             file.mimetype,
      minPhpVersion:        dto.minPhpVersion ?? existing?.minPhpVersion ?? undefined,
      minWordPressVersion:  dto.minWordPressVersion ?? existing?.minWordPressVersion ?? undefined,
      minNodeVersion:       dto.minNodeVersion ?? existing?.minNodeVersion ?? undefined,
      validationPassed:     validation.valid,
      validationMessages:   [...validation.errors, ...validation.warnings],
      zipEntries:           validation.entries,
      downloadsEnabled:     true,
      uploadedBy:           dto.uploadedBy ? new Types.ObjectId(dto.uploadedBy) : undefined,
      uploadedByEmail:      dto.uploadedByEmail ?? undefined,
    };

    let versionDoc;
    if (existing) {
      // Attach to the auto-created placeholder — must be an in-place update,
      // the {productId, version} pair has a unique index.
      const $set: Record<string, any> = {
        ...fileFields,
        releaseName:  dto.releaseName  || existing.releaseName  || '',
        releaseNotes: dto.releaseNotes || existing.releaseNotes || '',
        isPublic,
      };
      if (isPublic) {
        $set.publishedAt = existing.publishedAt ?? new Date();
      }
      versionDoc = await this.versionModel.findByIdAndUpdate(
        existing._id, { $set }, { new: true },
      );
    } else {
      versionDoc = await this.versionModel.create({
        productId: new Types.ObjectId(productId),
        version:   dto.version.trim(),
        releaseName:  dto.releaseName  ?? '',
        releaseNotes: dto.releaseNotes ?? '',
        ...fileFields,
        isPublic,
        publishedAt: isPublic ? new Date() : undefined,
      });
    }

    // 7. If publishing immediately, bump product's currentVersion
    if (isPublic) {
      await this.productModel.findByIdAndUpdate(productId, {
        currentVersion:      dto.version.trim(),
        latestStableVersion: dto.version.trim(),
      });
    }

    return {
      version:          versionDoc.version,
      packageStatus:    versionDoc.packageStatus,
      isPublic:         versionDoc.isPublic,
      fileSize:         versionDoc.fileSize,
      fileChecksum:     versionDoc.fileChecksum,
      validationPassed: versionDoc.validationPassed,
      warnings:         validation.warnings,
      entries:          validation.entries.slice(0, 20), // first 20 for preview
      _id:              versionDoc._id,
    };
  }

  // ─── List Versions ──────────────────────────────────────────────────────

  async listVersions(productId: string, query: any = {}) {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    const filter: any = { productId: new Types.ObjectId(productId) };
    if (query.channel) filter.releaseChannel = query.channel;
    if (query.status)  filter.packageStatus  = query.status;

    const versions = await this.versionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return { product: { _id: product._id, name: product.name, slug: product.slug, productType: product.productType }, versions };
  }

  // ─── Package Actions (approve / archive / disable / enable / publish / unpublish) ──

  async packageAction(productId: string, versionId: string, dto: PackageActionDto, actorEmail?: string) {
    const version = await this.versionModel.findOne({
      _id: new Types.ObjectId(versionId),
      productId: new Types.ObjectId(productId),
    });
    if (!version) throw new NotFoundException('Package version not found');

    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    const update: Partial<ProductVersionDocument> = {};

    switch (dto.action) {
      case 'approve':
        update.packageStatus = PackageStatus.APPROVED;
        break;

      case 'publish':
        if (version.packageStatus !== PackageStatus.APPROVED) {
          throw new BadRequestException('Only approved packages can be published. Approve the package first.');
        }
        update.isPublic    = true;
        update.publishedAt = new Date();
        // Bump product version if this is newer or same channel=stable
        if (version.releaseChannel === ReleaseChannel.STABLE) {
          await this.productModel.findByIdAndUpdate(productId, {
            currentVersion:      version.version,
            latestStableVersion: version.version,
          });
        }
        break;

      case 'unpublish':
        update.isPublic = false;
        break;

      case 'archive':
        update.packageStatus   = PackageStatus.ARCHIVED;
        update.isPublic        = false;
        update.archivedAt      = new Date() as any;
        update.archivedReason  = dto.reason ?? 'Admin archived';
        break;

      case 'disable':
        update.packageStatus    = PackageStatus.DISABLED;
        update.isPublic         = false;
        update.downloadsEnabled = false;
        break;

      case 'enable':
        update.packageStatus    = PackageStatus.APPROVED;
        update.downloadsEnabled = true;
        break;

      default:
        throw new BadRequestException(`Unknown action: ${dto.action}`);
    }

    await this.versionModel.findByIdAndUpdate(versionId, { $set: update });

    return {
      success: true,
      action:  dto.action,
      versionId,
      message: `Package ${version.version} ${dto.action}d successfully.`,
    };
  }

  // ─── Replace Package File ───────────────────────────────────────────────

  async replacePackageFile(
    productId: string,
    versionId: string,
    file: Express.Multer.File,
    actorEmail?: string,
  ) {
    const version = await this.versionModel.findOne({
      _id: new Types.ObjectId(versionId),
      productId: new Types.ObjectId(productId),
    });
    if (!version) {
      this.cleanupFile(file.path);
      throw new NotFoundException('Package version not found');
    }

    const product = await this.productModel.findById(productId);
    if (!product) {
      this.cleanupFile(file.path);
      throw new NotFoundException('Product not found');
    }

    // Validate the new ZIP
    const validation = await ZipPackageValidator.validate(file.path, product.productType as ProductType);
    if (!validation.valid) {
      this.cleanupFile(file.path);
      throw new BadRequestException({
        message: 'Replacement package validation failed',
        details: { errors: validation.errors, warnings: validation.warnings },
      });
    }

    // Compute checksum
    const checksum = await ZipPackageValidator.computeChecksum(file.path);

    // Persist replacement to the active storage provider and remove the old artifact
    const filename = `${product.slug}-${version.version}-replace-${Date.now()}.zip`;
    const stored = await this.persistPackageFile(file.path, productId, filename);
    await this.deletePackageArtifact(version);

    await this.versionModel.findByIdAndUpdate(versionId, {
      $set: {
        storagePath:       stored.storagePath,
        storageMode:       stored.storageMode,
        storageKey:        stored.storageKey,
        storageProvider:   stored.storageProvider,
        originalFileName:  file.originalname,
        fileChecksum:      checksum,
        fileSize:          file.size,
        mimeType:          file.mimetype,
        validationPassed:  validation.valid,
        validationMessages:[...validation.errors, ...validation.warnings],
        zipEntries:        validation.entries,
        packageStatus:     PackageStatus.PENDING, // must re-approve after replacement
        isPublic:          false,
      },
    });

    return { success: true, checksum, fileSize: file.size, warnings: validation.warnings };
  }

  /**
   * Buffer of an object-stored package, fetched via the provider recorded on
   * the version. Downloads are streamed through the API rather than
   * redirecting the browser to a signed object-storage URL: self-hosted
   * MinIO endpoints are frequently plain http/internal, and browsers block
   * mixed-content downloads from an https page (the tab opens, then dies
   * with no download).
   */
  async getPackageObjectBuffer(
    dl: { storageKey?: string | null; storageProvider?: string | null },
  ): Promise<Buffer> {
    if (!dl.storageKey) {
      throw new BadRequestException('Package version has no object storage key');
    }
    const provider = this.storageService.getProviderInstance(
      (dl.storageProvider as StorageProviderType) || StorageProviderType.LOCAL,
    );
    return provider.download(dl.storageKey);
  }

  // ─── Artifact persistence (provider-aware) ──────────────────────────────

  /**
   * Store an uploaded package artifact via the active storage provider.
   * Object mode keeps artifacts across container rebuilds; local mode is the
   * legacy volume-mount-dependent path, retained for deployments without
   * object storage.
   */
  private async persistPackageFile(
    tempPath: string,
    productId: string,
    filename: string,
  ): Promise<{
    storageMode: 'local' | 'object';
    storagePath: string;
    storageKey?: string;
    storageProvider?: string;
  }> {
    const { type } = await this.storageService.getActiveProvider();

    if (type !== StorageProviderType.LOCAL) {
      const buffer = fs.readFileSync(tempPath);
      const key = `packages/${productId}/${filename}`;
      await this.storageService.putPrivateObject(buffer, key, 'application/zip');
      this.cleanupFile(tempPath);
      this.logger.log(`Package stored in object storage: ${key} (${type})`);
      return { storageMode: 'object', storagePath: key, storageKey: key, storageProvider: type };
    }

    const destDir  = path.join(this.storageRoot, productId);
    const destPath = path.join(destDir, filename);
    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(tempPath, destPath);
    this.logger.warn(
      `Package stored on LOCAL disk (${destPath}) — files here do not survive container ` +
      'rebuilds. Configure MinIO/S3/R2 storage (or mount a volume) for durable packages.',
    );
    return { storageMode: 'local', storagePath: destPath };
  }

  /**
   * Delete a version's artifact wherever it lives. Deletion uses the provider
   * recorded at upload time — the active provider may have changed since.
   */
  private async deletePackageArtifact(version: any): Promise<void> {
    if (!version?.storagePath) return;

    if (version.storageMode === 'object' && version.storageKey) {
      try {
        await this.storageService
          .getProviderInstance(version.storageProvider as StorageProviderType)
          .delete(version.storageKey);
      } catch (e: any) {
        this.logger.warn(`Failed to delete object ${version.storageKey}: ${e?.message}`);
      }
      return;
    }

    if (fs.existsSync(version.storagePath)) {
      try { fs.unlinkSync(version.storagePath); } catch {}
    }
  }

  // ─── Download (signed token, time-limited URL) ──────────────────────────

  async generateDownloadToken(
    productId: string,
    versionId: string,
    requestingUserId?: string,
    licenseId?: string,
  ) {
    // ── License gate ────────────────────────────────────────────────────────
    // The customer download-token route MUST prove the caller owns a usable
    // license for THIS product — mirrors UpdatesService.generateCustomerDownloadToken.
    if (!requestingUserId) {
      throw new ForbiddenException('Authentication is required to download this package');
    }

    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    const license = (await this.licenseModel
      .findOne({
        userId: new Types.ObjectId(requestingUserId),
        productId: product._id,
        status: { $in: [LicenseStatus.ACTIVE, LicenseStatus.EXPIRED] },
        // Sandbox/test licenses must never unlock real package downloads
        isSandbox: { $ne: true },
      })
      .populate('licensePlanId')) as LicenseDocument | null;

    if (!license) {
      throw new ForbiddenException(
        'You do not have an active or valid license for this product',
      );
    }

    const settings = this.resolveEffectiveSettings(product, license);
    const isExpired =
      license.status === LicenseStatus.EXPIRED ||
      (license.expiresAt && new Date(license.expiresAt) < new Date());
    if (isExpired && settings.blockDownloadsOnExpiry !== false) {
      throw new ForbiddenException(
        'Package downloads are disabled because the license has expired',
      );
    }
    if (!settings.downloadsEnabled) {
      throw new ForbiddenException(
        'Package downloads are disabled for this license plan',
      );
    }

    const version = await this.versionModel.findOne({
      _id:       new Types.ObjectId(versionId),
      productId: new Types.ObjectId(productId),
    });
    if (!version) throw new NotFoundException('Package version not found');
    if (!version.storagePath && !version.downloadPackageUrl) {
      throw new BadRequestException('Package has no file attached yet');
    }
    if (!version.downloadsEnabled) {
      throw new ForbiddenException('Downloads are disabled for this package version');
    }

    const payload = {
      productId,
      versionId: versionId,
      version:   version.version,
      licenseId: licenseId || license._id.toString(),
      userId:    requestingUserId,
      exp:       Math.floor(Date.now() / 1000) + 900, // 15 minutes
    };

    const token = signDownloadToken(payload);
    return {
      token,
      downloadUrl: `/api/v1/packages/download/${token}`,
      expiresInSeconds: 900,
      version: version.version,
    };
  }

  /**
   * Same precedence chain as UpdatesService/ActivationsService:
   * product overrides → license plan → product defaults.
   */
  private resolveEffectiveSettings(product: any, license?: any) {
    const resolvedPlan = license?.licensePlanId as any;
    const overrides = product?.licenseSettingsOverrides || {};
    const productSettings = product?.licenseSettings || {};

    const resolveField = (key: string, defaultValue: any) => {
      if (overrides[key] !== undefined && overrides[key] !== null) {
        return overrides[key];
      }
      if (resolvedPlan && resolvedPlan[key] !== undefined && resolvedPlan[key] !== null) {
        return resolvedPlan[key];
      }
      if (productSettings[key] !== undefined && productSettings[key] !== null) {
        return productSettings[key];
      }
      return defaultValue;
    };

    return {
      downloadsEnabled: resolveField('downloadsEnabled', true),
      blockDownloadsOnExpiry: resolveField('blockDownloadsOnExpiry', true),
    };
  }

  async processDownload(token: string, clientIp?: string, userAgent?: string) {
    const payload = verifyDownloadToken(token);
    if (!payload) {
      throw new ForbiddenException('Download link is invalid or has expired');
    }

    const version = await this.versionModel.findById(payload.versionId);
    if (!version || !version.downloadsEnabled) {
      throw new ForbiddenException('Package is not available for download');
    }

    // Log the download
    await this.downloadLogModel.create({
      ...(payload.userId   ? { userId:    new Types.ObjectId(payload.userId)   } : {}),
      ...(payload.licenseId? { licenseId: new Types.ObjectId(payload.licenseId)} : {}),
      productId: new Types.ObjectId(payload.productId),
      version:   payload.version,
      ip:        clientIp,
      userAgent,
      source: payload.userId ? 'customer_dashboard' : 'auto_update',
    });

    // Return the storage location (controller streams local files directly,
    // or redirects object-stored ones to a short-lived signed URL)
    return {
      storagePath:      version.storagePath,
      storageMode:      version.storageMode || 'local',
      storageKey:       version.storageKey,
      storageProvider:  version.storageProvider,
      downloadPackageUrl: version.downloadPackageUrl,
      filename:         version.originalFileName ?? `package-${version.version}.zip`,
      version:          version.version,
      fileSize:         version.fileSize,
      fileChecksum:     version.fileChecksum,
    };
  }

  // ─── Admin: Generate download token for any version ──────────────────────

  async adminGenerateDownloadToken(versionId: string, adminEmail: string) {
    const version = await this.versionModel.findById(versionId).populate<{ productId: ProductDocument }>('productId');
    if (!version) throw new NotFoundException('Version not found');

    const payload = {
      versionId,
      productId: (version.productId as any)._id.toString(),
      version:   version.version,
      adminEmail,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour for admin
    };

    const token = signDownloadToken(payload);
    return { token, downloadUrl: `/api/v1/packages/download/${token}`, expiresInSeconds: 3600 };
  }

  // ─── Latest public version for update API ────────────────────────────────

  async getLatestPublicVersion(productId: string, channel = ReleaseChannel.STABLE) {
    return this.versionModel
      .findOne({
        productId:     new Types.ObjectId(productId),
        isPublic:      true,
        packageStatus: PackageStatus.APPROVED,
        releaseChannel: channel,
        downloadsEnabled: true,
      })
      .sort({ publishedAt: -1 })
      .lean();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private ensureStorageRoot(): void {
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  private cleanupFile(filePath?: string): void {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }
}
