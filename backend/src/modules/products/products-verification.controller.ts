import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProductsVerificationService } from './products-verification.service';
import type { VerificationEnvironment } from './products-verification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { IsOptional, IsEnum } from 'class-validator';

export class RunVerificationDto {
  @IsOptional()
  @IsEnum(['development', 'testing', 'production'])
  environment?: VerificationEnvironment;
}

@Controller('admin/products/:productId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ProductsVerificationController {
  constructor(
    private readonly verificationService: ProductsVerificationService,
  ) {}

  @Get('verify')
  async getVerificationOverview(@Param('productId') productId: string) {
    return this.verificationService.getVerificationOverview(productId);
  }

  @Post('verify')
  async runVerificationSuite(
    @Param('productId') productId: string,
    @Body() dto: RunVerificationDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.verificationService.runVerificationSuite(
      productId,
      dto.environment || 'testing',
      adminEmail,
    );
  }

  @Post('certify')
  async certifyProductionReady(
    @Param('productId') productId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.verificationService.certifyProductionReady(
      productId,
      adminEmail,
    );
  }
}
