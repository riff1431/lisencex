import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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

    // 2. Prevent duplicate version
    const existing = await this.versionModel.findOne({
      productId: new Types.ObjectId(productId),
      version: dto.version.trim(),
    });
    if (existing) {
      this.cleanupFile(file.path);
      throw new BadRequestException(
        `Version ${dto.version} already exists for this product. Use "replace" action to update the package.`,
      );
    }

    // 3. Validate ZIP structure
    const validation = await ZipPackageValidator.validate(file.path, product.productType as ProductType);

    if (!validation.valid) {
      this.cleanupFile(file.path);
      throw new BadRequestException({
        message: 'Package validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // 4. Compute checksum
    const checksum = await ZipPackageValidator.computeChecksum(file.path);

    // 5. Move to permanent storage location
    const destDir  = path.join(this.storageRoot, productId);
    const filename = `${product.slug}-${dto.version}-${Date.now()}.zip`;
    const destPath = path.join(destDir, filename);

    fs.mkdirSync(destDir, { recursive: true });
    fs.renameSync(file.path, destPath);

    // 6. Create version record
    const isPublic = Boolean(dto.publishImmediately);
    const versionDoc = await this.versionModel.create({
      productId: new Types.ObjectId(productId),
      version:              dto.version.trim(),
      releaseName:          dto.releaseName ?? '',
      releaseNotes:         dto.releaseNotes ?? '',
      releaseChannel:       dto.releaseChannel ?? ReleaseChannel.STABLE,
      packageStatus:        isPublic ? PackageStatus.APPROVED : PackageStatus.PENDING,
      originalFileName:     file.originalname,
      storagePath:          destPath,
      fileChecksum:         checksum,
      fileSize:             file.size,
      mimeType:             file.mimetype,
      minPhpVersion:        dto.minPhpVersion ?? undefined,
      minWordPressVersion:  dto.minWordPressVersion ?? undefined,
      minNodeVersion:       dto.minNodeVersion ?? undefined,
      validationPassed:     validation.valid,
      validationMessages:   [...validation.errors, ...validation.warnings],
      zipEntries:           validation.entries,
      isPublic,
      downloadsEnabled:     true,
      publishedAt:          isPublic ? new Date() : undefined,
      uploadedBy:           dto.uploadedBy ? new Types.ObjectId(dto.uploadedBy) : undefined,
      uploadedByEmail:      dto.uploadedByEmail ?? undefined,
    });

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
      throw new BadRequestException({ message: 'Replacement package validation failed', errors: validation.errors });
    }

    // Compute checksum
    const checksum = await ZipPackageValidator.computeChecksum(file.path);

    // Move to storage
    const destDir  = path.join(this.storageRoot, productId);
    const filename = `${product.slug}-${version.version}-replace-${Date.now()}.zip`;
    const destPath = path.join(destDir, filename);
    fs.mkdirSync(destDir, { recursive: true });

    // Remove old file
    if (version.storagePath && fs.existsSync(version.storagePath)) {
      try { fs.unlinkSync(version.storagePath); } catch {}
    }

    fs.renameSync(file.path, destPath);

    await this.versionModel.findByIdAndUpdate(versionId, {
      $set: {
        storagePath:       destPath,
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

  // ─── Download (signed token, time-limited URL) ──────────────────────────

  async generateDownloadToken(
    productId: string,
    versionId: string,
    requestingUserId?: string,
    licenseId?: string,
  ) {
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
      licenseId,
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

    // Return the storage path (controller will stream the file)
    return {
      storagePath:      version.storagePath,
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
