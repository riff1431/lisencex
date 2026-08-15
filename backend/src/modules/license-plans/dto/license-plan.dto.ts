import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateLicensePlanDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  activationLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  licenseDurationDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  supportDurationDays?: number;

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
  @Min(0)
  deactivationCooldownHours?: number;

  @IsOptional()
  @IsBoolean()
  periodicValidation?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  validationIntervalHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offlineGracePeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  automaticUpdatesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  downloadsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  blockValidationOnExpiry?: boolean;

  @IsOptional()
  @IsBoolean()
  blockUpdatesOnExpiry?: boolean;

  @IsOptional()
  @IsBoolean()
  blockDownloadsOnExpiry?: boolean;

  @IsOptional()
  @IsBoolean()
  blockSupportOnExpiry?: boolean;

  @IsOptional()
  @IsBoolean()
  blockActivationsOnExpiry?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderThresholdDays?: number;
}

export class UpdateLicensePlanDto extends CreateLicensePlanDto {
  @IsOptional()
  @IsString()
  declare name: string;

  @IsOptional()
  @IsString()
  declare slug: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
