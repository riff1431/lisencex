import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { MarketplaceProviderType } from '../../../common/enums/app.enums';

export class CreateInternalPurchaseDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  licenseType?: string;
}

export class ClaimEnvatoPurchaseDto {
  @IsString()
  @IsNotEmpty()
  purchaseCode: string;

  @IsMongoId()
  @IsNotEmpty()
  productId: string;
}
