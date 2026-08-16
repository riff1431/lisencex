import { IsNotEmpty, IsOptional, IsString, IsEmail, Min, IsInt } from 'class-validator';

export class CreateRecoveryRequestDto {
  @IsString()
  @IsNotEmpty()
  licenseId: string;

  @IsString()
  @IsNotEmpty()
  oldActivationId: string;

  @IsString()
  @IsNotEmpty()
  newDomain: string;

  @IsString()
  @IsNotEmpty()
  newInstallationId: string;

  @IsOptional()
  @IsString()
  newInstallationUrl?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  reasonDetail?: string;
}

export class GuestRecoveryRequestDto {
  @IsString()
  @IsNotEmpty()
  licenseKey: string;

  @IsOptional()
  @IsString()
  purchaseCode?: string;

  @IsString()
  @IsNotEmpty()
  oldDomain: string;

  @IsString()
  @IsNotEmpty()
  newDomain: string;

  @IsString()
  @IsNotEmpty()
  newInstallationId: string;

  @IsOptional()
  @IsString()
  newInstallationUrl?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @IsOptional()
  @IsEmail()
  verificationEmail?: string;
}

export class ResolveRecoveryRequestDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ManualRecoveryDto {
  @IsString()
  @IsNotEmpty()
  licenseId: string;

  @IsString()
  @IsNotEmpty()
  oldActivationId: string;

  @IsString()
  @IsNotEmpty()
  newDomain: string;

  @IsString()
  @IsNotEmpty()
  newInstallationId: string;

  @IsOptional()
  @IsString()
  newInstallationUrl?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  reasonDetail?: string;
}
