import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BlockedEntityType } from '../../../common/enums/app.enums';

export class BlockEntityDto {
  @IsEnum(BlockedEntityType)
  @IsNotEmpty()
  type: BlockedEntityType;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
