import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { EnvironmentType } from '../../../common/enums/app.enums';

export class ActivateLicenseDto {
  @IsString()
  @IsNotEmpty()
  productSlug: string;

  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @IsString()
  purchaseCode?: string;

  @IsString()
  @IsNotEmpty()
  installationId: string;

  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsOptional()
  @IsString()
  installationUrl?: string;

  @IsOptional()
  @IsEnum(EnvironmentType)
  environment?: EnvironmentType;

  @IsOptional()
  @IsString()
  productVersion?: string;

  @IsOptional()
  @IsString()
  serverFingerprint?: string;
}

export class ValidateLicenseDto {
  @IsString()
  @IsNotEmpty()
  productSlug: string;

  @IsString()
  @IsNotEmpty()
  installationId: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsOptional()
  @IsString()
  productVersion?: string;
}

export class DeactivateLicenseDto {
  @IsString()
  @IsNotEmpty()
  installationId: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferActivationDto {
  @IsString()
  @IsNotEmpty()
  newDomain: string;

  @IsString()
  @IsNotEmpty()
  newInstallationId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
