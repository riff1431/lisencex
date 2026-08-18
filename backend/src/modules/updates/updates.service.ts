import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Product,
  ProductDocument,
} from '../../database/schemas/product.schema';
import {
  ProductVersion,
  ProductVersionDocument,
  PackageStatus,
} from '../../database/schemas/product-version.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import {
  DownloadLog,
  DownloadLogDocument,
} from '../../database/schemas/download-log.schema';
import { TokenService } from '../token/token.service';
import { StorageService } from '../storage/storage.service';
import { StorageProviderType } from '../../database/schemas/storage-config.schema';
import { LicenseStatus } from '../../common/enums/app.enums';
import {
  signDownloadToken,
  verifyDownloadToken as verifyDownloadTokenUtil,
} from '../../common/utils/download-token.util';

@Injectable()
export class UpdatesService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(ProductVersion.name)
    private versionModel: Model<ProductVersionDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
    @InjectModel(DownloadLog.name)
    private downloadLogModel: Model<DownloadLogDocument>,
    private tokenService: TokenService,
    private storageService: StorageService,
  ) {}

  /**
   * Short-lived signed URL for an object-stored package, using the provider
   * recorded on the version at upload time.
   */
  async getPackageSignedUrl(
    v: { storageKey?: string | null; storageProvider?: string | null },
    expiresInSeconds = 300,
  ): Promise<string> {
    if (!v.storageKey) {
      throw new ForbiddenException('Package version has no object storage key');
    }
    const provider = this.storageService.getProviderInstance(
      (v.storageProvider as StorageProviderType) || StorageProviderType.LOCAL,
    );
    return provider.getSignedUrl(v.storageKey, expiresInSeconds);
  }

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
      automaticUpdatesEnabled: resolveField('automaticUpdatesEnabled', true),
      blockUpdatesOnExpiry: resolveField('blockUpdatesOnExpiry', true),
      blockDownloadsOnExpiry: resolveField('blockDownloadsOnExpiry', true),
    };
  }

  async checkForUpdates(
    slug: string,
    currentVersion: string,
    token: string,
    domain?: string,
  ) {
    const product = await this.productModel.findOne({
      slug: slug.toLowerCase().trim(),
      isArchived: false,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.emergencyKillSwitch?.disableUpdatesDownloads || product.emergencyKillSwitch?.isProductSuspended) {
      throw new ForbiddenException(
        `Updates and downloads for this product are temporarily disabled by administrator. Reason: ${product.emergencyKillSwitch?.activeReason || 'Emergency maintenance'}`,
      );
    }

    const payload = this.tokenService.verifyActivationToken(token);

    // Sandbox tokens are for the vendor playground only — never valid here.
    if (payload.environment === 'sandbox') {
      throw new ForbiddenException(
        'Sandbox activation tokens cannot be used against production update endpoints',
      );
    }

    const license = await this.licenseModel.findById(payload.licenseId).populate('licensePlanId');
    if (!license) {
      throw new ForbiddenException('License record not found');
    }

    // The license must belong to THIS product — otherwise a token for one
    // product could be replayed to obtain update/download tokens for another.
    if (license.isSandbox || String((license as any).productId) !== product._id.toString()) {
      throw new ForbiddenException('License record not found');
    }

    const settings = this.resolveEffectiveSettings(product, license);

    const isExpired = license.status === LicenseStatus.EXPIRED || (license.expiresAt && new Date(license.expiresAt) < new Date());
    if (isExpired) {
      if (license.status !== LicenseStatus.EXPIRED) {
        license.status = LicenseStatus.EXPIRED;
        await license.save();
      }

      if (settings.blockUpdatesOnExpiry !== false) {
        throw new ForbiddenException(
          'Updates are disabled because the license has expired',
        );
      }
    } else if (license.status !== LicenseStatus.ACTIVE) {
      throw new ForbiddenException(
        'Updates are disabled because the license is inactive or revoked',
      );
    }

    if (!settings.automaticUpdatesEnabled) {
      throw new ForbiddenException(
        'Automatic updates are disabled for this license plan',
      );
    }

    const latestVersion = await this.versionModel
      .findOne({
        $or: [
          { productId: product._id },
          { productId: product._id.toString() as any },
        ],
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    const targetLatestVersion =
      latestVersion?.version ||
      product.latestStableVersion ||
      product.currentVersion ||
      currentVersion;

    const isNewer = this.compareVersions(targetLatestVersion, currentVersion) > 0;

    let downloadUrl: string | null = null;
    if (isNewer && (latestVersion?.downloadPackageUrl || (latestVersion as any)?.storagePath)) {
      const downloadToken = this.generateDownloadToken({
        productId: product._id.toString(),
        version: targetLatestVersion,
        licenseId: license._id.toString(),
      });
      downloadUrl = `/api/v1/public/downloads/${downloadToken}`;
    }

    return {
      updateAvailable: isNewer,
      currentVersion,
      latestVersion: targetLatestVersion,
      releaseName: latestVersion?.releaseName || `Release v${targetLatestVersion}`,
      releaseNotes: latestVersion?.releaseNotes || 'Product update available.',
      minPhpVersion: latestVersion?.minPhpVersion,
      minWordPressVersion: latestVersion?.minWordPressVersion,
      minNodeVersion: latestVersion?.minNodeVersion,
      fileSize: latestVersion?.fileSize,
      fileChecksum: latestVersion?.fileChecksum,
      publishedAt: latestVersion?.publishedAt || new Date(),
      downloadUrl,
    };
  }

  async generateCustomerDownloadToken(userId: string, productId: string) {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const license = await this.licenseModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: product._id,
      status: { $in: [LicenseStatus.ACTIVE, LicenseStatus.EXPIRED] },
    }).populate('licensePlanId');

    if (!license) {
      throw new ForbiddenException(
        'You do not have an active or valid license for this product',
      );
    }

    const settings = this.resolveEffectiveSettings(product, license);

    const isExpired = license.status === LicenseStatus.EXPIRED || (license.expiresAt && new Date(license.expiresAt) < new Date());
    if (isExpired) {
      if (license.status !== LicenseStatus.EXPIRED) {
        license.status = LicenseStatus.EXPIRED;
        await license.save();
      }

      if (settings.blockDownloadsOnExpiry !== false) {
        throw new ForbiddenException(
          'Package downloads are disabled because the license has expired',
        );
      }
    }

    if (!settings.downloadsEnabled) {
      throw new ForbiddenException(
        'Package downloads are disabled for this license plan',
      );
    }

    const latestVersion = await this.versionModel
      .findOne({ productId: product._id, isPublic: true })
      .sort({ publishedAt: -1 });

    const versionStr = latestVersion ? latestVersion.version : product.currentVersion;

    const token = this.generateDownloadToken({
      productId: product._id.toString(),
      version: versionStr,
      licenseId: license._id.toString(),
      userId,
    });

    return {
      downloadToken: token,
      downloadUrl: `/api/v1/public/downloads/${token}`,
      version: versionStr,
      productName: product.name,
    };
  }

  async processDownload(token: string, clientIp?: string, userAgent?: string) {
    let payload: any;
    try {
      payload = this.verifyDownloadToken(token);
    } catch {
      throw new UnauthorizedException('Download link is invalid or has expired');
    }

    const product = await this.productModel.findById(payload.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const version = await this.versionModel.findOne({
      productId: product._id,
      version: payload.version,
    });

    await this.downloadLogModel.create({
      ...(payload.userId ? { userId: new Types.ObjectId(payload.userId) } : {}),
      productId: product._id,
      ...(payload.licenseId ? { licenseId: new Types.ObjectId(payload.licenseId) } : {}),
      version: payload.version,
      ip: clientIp,
      userAgent,
      source: payload.userId ? 'customer_dashboard' : 'auto_update',
    });

    return {
      productName: product.name,
      version: payload.version,
      storagePath: version?.storagePath,
      storageMode: (version as any)?.storageMode || 'local',
      storageKey: (version as any)?.storageKey,
      storageProvider: (version as any)?.storageProvider,
      filename: version?.originalFileName || `${product.slug}-${payload.version}.zip`,
      fileSize: version?.fileSize,
      fileChecksum: version?.fileChecksum,
      packageUrl:
        version?.downloadPackageUrl ||
        (version?.storagePath ? null : `https://storage.company.com/packages/${product.slug}-${payload.version}.zip`),
    };
  }

  private generateDownloadToken(data: any, validityMinutes = 15): string {
    const payload = {
      ...data,
      exp: Math.floor(Date.now() / 1000) + validityMinutes * 60,
    };
    return signDownloadToken(payload);
  }

  private verifyDownloadToken(token: string): any {
    const data = verifyDownloadTokenUtil(token);
    if (!data) {
      throw new ForbiddenException('Download link is invalid or has expired');
    }
    return data;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.replace(/^v/, '').split('.').map(Number);
    const parts2 = v2.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}
