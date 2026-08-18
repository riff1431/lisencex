import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProductsPackageGeneratorService } from './products-package-generator.service';
import type { IntegrationFramework } from './products-package-generator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class GeneratePackageDto {
  @IsEnum(['wordpress_plugin', 'wordpress_theme', 'php_script', 'nextjs_app', 'nextjs_plugin'])
  framework: IntegrationFramework;

  @IsOptional()
  @IsString()
  packageVersion?: string;
}

@Controller('admin/products/:productId/integration-package')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ProductsPackageGeneratorController {
  constructor(
    private readonly generatorService: ProductsPackageGeneratorService,
  ) {}

  @Get()
  async getPackageOverview(
    @Param('productId') productId: string,
    @Query('framework') framework: IntegrationFramework = 'wordpress_plugin',
    @Req() req: Request,
  ) {
    return this.generatorService.getPackageOverview(productId, framework, req);
  }

  @Post('generate')
  async generatePackage(
    @Param('productId') productId: string,
    @Body() dto: GeneratePackageDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.generatorService.generatePackageVersion(
      productId,
      dto.framework,
      dto.packageVersion || '2.0.0',
      adminEmail,
    );
  }

  @Get('download')
  async downloadZip(
    @Param('productId') productId: string,
    @Query('framework') framework: IntegrationFramework = 'wordpress_plugin',
    @Query('version') version: string = '2.0.0',
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.generatorService.streamPackageZip(productId, framework, version, res, req);
  }
}
