import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EmergencyService } from './emergency.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { IsString, IsOptional, IsBoolean, IsArray, MinLength } from 'class-validator';

export class ActionReasonDto {
  @IsString()
  @MinLength(5, { message: 'Reason must be at least 5 characters long' })
  reason: string;

  @IsOptional()
  @IsBoolean()
  critical?: boolean;
}

export class ProductKillSwitchDto {
  @IsOptional()
  @IsBoolean()
  disableNewActivations?: boolean;

  @IsOptional()
  @IsBoolean()
  disableValidation?: boolean;

  @IsOptional()
  @IsBoolean()
  disableUpdatesDownloads?: boolean;

  @IsOptional()
  @IsBoolean()
  isProductSuspended?: boolean;

  @IsOptional()
  @IsBoolean()
  suspendAllActiveInstallations?: boolean;

  @IsOptional()
  @IsBoolean()
  restoreAllInstallations?: boolean;

  @IsString()
  @MinLength(5, { message: 'Reason must be at least 5 characters long' })
  reason: string;
}

export class BulkEmergencyActionDto {
  @IsOptional()
  @IsArray()
  licenseIds?: string[];

  @IsOptional()
  @IsArray()
  activationIds?: string[];

  @IsString()
  @MinLength(5, { message: 'Reason must be at least 5 characters long' })
  reason: string;

  @IsOptional()
  @IsBoolean()
  critical?: boolean;
}

@Controller('admin/emergency')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Get('overview')
  async getOverview(@Query('productId') productId?: string) {
    return this.emergencyService.getEmergencyOverview(productId);
  }

  @Post('products/:productId/kill-switch')
  async setProductKillSwitch(
    @Param('productId') productId: string,
    @Body() dto: ProductKillSwitchDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.setProductKillSwitch(
      productId,
      dto,
      adminEmail,
    );
  }

  @Post('licenses/:licenseId/revoke')
  async revokeLicense(
    @Param('licenseId') licenseId: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.revokeLicense(
      licenseId,
      dto.reason,
      dto.critical,
      adminEmail,
    );
  }

  @Post('licenses/:licenseId/suspend')
  async suspendLicense(
    @Param('licenseId') licenseId: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.suspendLicense(
      licenseId,
      dto.reason,
      adminEmail,
    );
  }

  @Post('licenses/:licenseId/restore')
  async restoreLicense(
    @Param('licenseId') licenseId: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.restoreLicense(
      licenseId,
      dto.reason || 'Restored by admin',
      adminEmail,
    );
  }

  @Post('activations/:activationId/revoke')
  async revokeActivation(
    @Param('activationId') activationId: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.revokeActivation(
      activationId,
      dto.reason,
      dto.critical,
      adminEmail,
    );
  }

  @Post('activations/:activationId/suspend')
  async suspendActivation(
    @Param('activationId') activationId: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.suspendActivation(
      activationId,
      dto.reason,
      adminEmail,
    );
  }

  @Post('activations/:activationId/restore')
  async restoreActivation(
    @Param('activationId') activationId: string,
    @Body() dto: ActionReasonDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.restoreActivation(
      activationId,
      dto.reason || 'Restored by admin',
      adminEmail,
    );
  }

  @Post('bulk-revoke')
  async bulkRevoke(
    @Body() dto: BulkEmergencyActionDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.bulkRevoke(dto, adminEmail);
  }

  @Post('bulk-suspend')
  async bulkSuspend(
    @Body() dto: BulkEmergencyActionDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.bulkSuspend(dto, adminEmail);
  }

  @Post('bulk-restore')
  async bulkRestore(
    @Body() dto: BulkEmergencyActionDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.emergencyService.bulkRestore(dto, adminEmail);
  }
}
