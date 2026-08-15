import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsMongoId,
  Min,
} from 'class-validator';
import {
  LicenseStatus,
  LicenseType,
  MarketplaceProviderType,
} from '../../../common/enums/app.enums';

export class CreateManualLicenseDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerFullName?: string;

  @IsOptional()
  @IsMongoId()
  licensePlanId?: string;

  @IsOptional()
  @IsMongoId()
  purchaseId?: string;

  @IsOptional()
  @IsEnum(LicenseType)
  licenseType?: LicenseType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  activationLimit?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string; // ISO date string or null

  @IsOptional()
  @IsString()
  supportExpiresAt?: string; // ISO date string or null

  @IsOptional()
  @IsEnum(MarketplaceProviderType)
  source?: MarketplaceProviderType;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBulkLicensesDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId()
  licensePlanId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  activationLimit?: number;

  @IsOptional()
  @IsEnum(LicenseType)
  licenseType?: LicenseType;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  supportExpiresAt?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsEnum(MarketplaceProviderType)
  source?: MarketplaceProviderType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;
}

export class UpdateLicenseDto {
  @IsOptional()
  @IsEnum(LicenseStatus)
  status?: LicenseStatus;

  @IsOptional()
  @IsEnum(LicenseType)
  licenseType?: LicenseType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  activationLimit?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  supportExpiresAt?: string | null;
}

export class LicenseActionDto {
  @IsString()
  @IsNotEmpty()
  action: 'suspend' | 'revoke' | 'restore' | 'reset_activations' | 'extend' | 'change_limit' | 'renew';

  @IsOptional()
  @IsNumber()
  extendDays?: number;

  @IsOptional()
  @IsNumber()
  extendSupportDays?: number;

  @IsOptional()
  @IsString()
  renewType?: 'both' | 'license' | 'support';

  @IsOptional()
  @IsNumber()
  @Min(1)
  newActivationLimit?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddLicenseNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;
}
