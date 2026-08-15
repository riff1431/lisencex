import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ProductsIntegrationService } from './products-integration.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, IntegrationStatus } from '../../common/enums/app.enums';

import { IsEnum, IsNotEmpty, IsOptional, IsObject, IsString } from 'class-validator';

export class UpdateIntegrationStatusDto {
  @IsEnum(IntegrationStatus)
  @IsNotEmpty()
  status: IntegrationStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RunTestScenarioDto {
  @IsString()
  @IsNotEmpty()
  scenario: string;
}

@Controller('admin/products/:productId/integration')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ProductsIntegrationController {
  constructor(
    private readonly integrationService: ProductsIntegrationService,
  ) {}

  @Get()
  async getIntegration(@Param('productId') productId: string) {
    return this.integrationService.getIntegrationSettings(productId);
  }

  @Patch('status')
  async updateStatus(
    @Param('productId') productId: string,
    @Body() dto: UpdateIntegrationStatusDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.integrationService.updateIntegrationStatus(
      productId,
      dto.status,
      dto.metadata,
      adminEmail,
    );
  }

  @Post('test-scenario')
  async testScenario(
    @Param('productId') productId: string,
    @Body() dto: RunTestScenarioDto,
  ) {
    return this.integrationService.runTestScenario(productId, dto.scenario);
  }
}
