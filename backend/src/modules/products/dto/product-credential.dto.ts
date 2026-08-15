import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateProductCredentialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}
