import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProductsSandboxService } from './products-sandbox.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { IsString, IsOptional } from 'class-validator';

export class SandboxActivateDto {
  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @IsString()
  purchaseCode?: string;

  @IsString()
  productSlug: string;

  @IsString()
  installationId: string;

  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  productVersion?: string;
}

export class SandboxValidateDto {
  @IsString()
  token: string;

  @IsString()
  productSlug: string;

  @IsString()
  installationId: string;

  @IsString()
  domain: string;
}

export class SandboxDeactivateDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsString()
  installationId: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('admin/products/:productId/sandbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ProductsSandboxAdminController {
  constructor(private readonly sandboxService: ProductsSandboxService) {}

  @Get()
  async getSandboxOverview(@Param('productId') productId: string) {
    return this.sandboxService.getSandboxOverview(productId);
  }

  @Post('reset')
  async resetSandboxData(
    @Param('productId') productId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.sandboxService.resetSandboxData(productId, adminEmail);
  }
}

@Controller('public/sandbox/licenses')
export class PublicSandboxLicensingController {
  constructor(private readonly sandboxService: ProductsSandboxService) {}

  @Post('activate')
  async activate(@Body() dto: SandboxActivateDto) {
    return this.sandboxService.processSandboxActivate(dto);
  }

  @Post('validate')
  async validate(@Body() dto: SandboxValidateDto) {
    return this.sandboxService.processSandboxValidate(dto);
  }

  @Post('deactivate')
  async deactivate(@Body() dto: SandboxDeactivateDto) {
    return this.sandboxService.processSandboxDeactivate(dto);
  }
}
