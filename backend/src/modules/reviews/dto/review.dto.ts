import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ReviewStatus } from '../../../database/schemas/review.schema';

export class SubmitReviewDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  title: string;

  @IsString()
  comment: string;

  @IsOptional()
  @IsArray()
  screenshots?: string[];

  @IsOptional()
  @IsString()
  productVersion?: string;
}

export class UpdateReviewStatusDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}

export class AdminReplyReviewDto {
  @IsString()
  reply: string;
}
