import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { DiscountType, OfferType } from '../../../database/schemas/coupon.schema';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0.01)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsBoolean()
  isFirstPurchaseOnly?: boolean;

  @IsOptional()
  @IsArray()
  eligibleProducts?: string[];

  @IsOptional()
  @IsArray()
  eligiblePlans?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perCustomerLimit?: number;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsEnum(OfferType)
  offerType?: OfferType;

  @IsOptional()
  @IsBoolean()
  isFeaturedPublicOffer?: boolean;

  @IsOptional()
  @IsString()
  publicBannerText?: string;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsBoolean()
  isFirstPurchaseOnly?: boolean;

  @IsOptional()
  @IsArray()
  eligibleProducts?: string[];

  @IsOptional()
  @IsArray()
  eligiblePlans?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perCustomerLimit?: number;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsEnum(OfferType)
  offerType?: OfferType;

  @IsOptional()
  @IsBoolean()
  isFeaturedPublicOffer?: boolean;

  @IsOptional()
  @IsString()
  publicBannerText?: string;
}

export class ValidateCouponItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  licensePlanId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsArray()
  items: ValidateCouponItemDto[];
}

export class QueryCouponsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive' | 'expired';

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
