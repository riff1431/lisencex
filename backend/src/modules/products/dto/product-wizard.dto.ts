import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProductType,
  LicenseType,
} from '../../../common/enums/app.enums';
import { MarketplaceSource } from '../../../database/schemas/product.schema';

export class WizardLicenseSettingsDto {
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

export class RegisterProductWizardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsEnum(ProductType)
  @IsNotEmpty()
  productType: ProductType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  currentVersion?: string;

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
  @IsEnum(MarketplaceSource)
  marketplaceSource?: MarketplaceSource;

  @IsOptional()
  @IsString()
  primaryCategoryId?: string;

  @IsOptional()
  categoryIds?: string[];

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsBoolean()
  isNewRelease?: boolean;

  @IsOptional()
  @IsBoolean()
  isBestSeller?: boolean;

  @IsOptional()
  @IsString()
  badgeLabel?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WizardLicenseSettingsDto)
  licenseSettings?: WizardLicenseSettingsDto;
}

export class RunWizardTestDto {
  @IsString()
  @IsNotEmpty()
  testType: 'activate' | 'validate' | 'deactivate' | 'checkUpdate';

  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  installationId?: string;

  @IsOptional()
  @IsString()
  token?: string;
}
