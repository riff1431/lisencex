import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProductStatus,
  ProductType,
  MarketplaceProviderType,
  EnvatoMarket,
  LicenseType,
  ReleaseChannel,
} from '../../../common/enums/app.enums';
import { MarketplaceSource } from '../../../database/schemas/product.schema';

export class LicenseSettingsDto {
  @IsOptional()
  @IsBoolean()
  licenseRequired?: boolean;

  @IsOptional()
  @IsEnum(LicenseType)
  defaultLicenseType?: LicenseType;

  @IsOptional()
  @IsNumber()
  licenseDurationDays?: number;

  @IsOptional()
  @IsNumber()
  supportDurationDays?: number;

  @IsOptional()
  @IsNumber()
  defaultActivationLimit?: number;

  @IsOptional()
  @IsBoolean()
  domainBinding?: boolean;

  @IsOptional()
  @IsBoolean()
  installationBinding?: boolean;

  @IsOptional()
  @IsBoolean()
  allowLocalhost?: boolean;

  @IsOptional()
  @IsBoolean()
  countLocalhost?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStaging?: boolean;

  @IsOptional()
  @IsBoolean()
  countStaging?: boolean;

  @IsOptional()
  @IsBoolean()
  allowDeactivation?: boolean;

  @IsOptional()
  @IsNumber()
  deactivationCooldownHours?: number;

  @IsOptional()
  @IsBoolean()
  periodicValidation?: boolean;

  @IsOptional()
  @IsNumber()
  validationIntervalHours?: number;

  @IsOptional()
  @IsNumber()
  offlineGracePeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  automaticUpdatesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  downloadsEnabled?: boolean;
}

export class DistributionChannelDto {
  @IsEnum(MarketplaceProviderType)
  provider: MarketplaceProviderType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  externalItemId?: string;

  @IsOptional()
  @IsEnum(EnvatoMarket)
  market?: EnvatoMarket;

  @IsOptional()
  @IsString()
  productUrl?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  extendedPrice?: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsEnum(MarketplaceSource)
  marketplaceSource?: MarketplaceSource;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  extendedPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

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
  @IsString()
  packageFileUrl?: string;

  @IsOptional()
  @IsString()
  currentVersion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LicenseSettingsDto)
  licenseSettings?: LicenseSettingsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistributionChannelDto)
  distributionChannels?: DistributionChannelDto[];

  @IsOptional()
  @IsString()
  defaultLicensePlanId?: string;

  @IsOptional()
  @IsString()
  envatoLicensePlanId?: string;

  @IsOptional()
  @IsObject()
  licenseSettingsOverrides?: Record<string, any>;
}

export class UpdateProductDto extends CreateProductDto {}

export class CreateProductVersionDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsOptional()
  @IsString()
  releaseName?: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsEnum(ReleaseChannel)
  releaseChannel?: ReleaseChannel;

  @IsOptional()
  @IsString()
  minPhpVersion?: string;

  @IsOptional()
  @IsString()
  minWordPressVersion?: string;

  @IsOptional()
  @IsString()
  minNodeVersion?: string;

  @IsOptional()
  @IsString()
  downloadPackageUrl?: string;

  @IsOptional()
  @IsString()
  fileChecksum?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
