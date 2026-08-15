import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ActivationsService } from './activations.service';
import {
  ActivateLicenseDto,
  ValidateLicenseDto,
  DeactivateLicenseDto,
  TransferActivationDto,
} from './dto/activation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { ProductClientAuthGuard } from '../../common/guards/product-client-auth.guard';
import { Scopes } from '../../common/decorators/scopes.decorator';

@Controller()
export class ActivationsController {
  constructor(private readonly activationsService: ActivationsService) {}

  // ---------------- PUBLIC / CLIENT SDK ROUTES ----------------
  @Post('public/licenses/activate')
  @UseGuards(ProductClientAuthGuard)
  @Scopes('activate')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Body() dto: ActivateLicenseDto,
    @Req() req: any,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '';
    const userAgent = req.headers['user-agent'] || '';

    return this.activationsService.activate(dto, ip, userAgent);
  }

  @Post('public/licenses/validate')
  @UseGuards(ProductClientAuthGuard)
  @Scopes('validate')
  @HttpCode(HttpStatus.OK)
  async validate(
    @Body() dto: ValidateLicenseDto,
    @Req() req: any,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '';

    return this.activationsService.validate(dto, ip);
  }

  @Post('public/licenses/deactivate')
  @UseGuards(ProductClientAuthGuard)
  @Scopes('activate')
  @HttpCode(HttpStatus.OK)
  async deactivatePublic(
    @Body() dto: DeactivateLicenseDto,
    @Req() req: any,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '';

    return this.activationsService.deactivate(dto, 'client', ip, req.product?._id);
  }

  // ---------------- CUSTOMER ROUTES ----------------
  @UseGuards(JwtAuthGuard)
  @Post('customer/activations/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateCustomer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activationsService.customerDeactivate(id, userId);
  }

  // ---------------- ADMIN ROUTES ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/activations')
  async getAdminActivations(@Query() query: any) {
    return this.activationsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/activations/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAdmin(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.activationsService.adminDeactivate(id, reason, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/activations/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendAdmin(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.activationsService.adminSuspend(id, reason, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/activations/:id/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeAdmin(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.activationsService.adminRevoke(id, reason, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/activations/reset-license/:licenseId')
  @HttpCode(HttpStatus.OK)
  async resetLicenseActivations(
    @Param('licenseId') licenseId: string,
    @Body('reason') reason: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.activationsService.adminResetLicenseActivations(
      licenseId,
      reason,
      adminEmail,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/activations/:id/transfer')
  @HttpCode(HttpStatus.OK)
  async transferActivation(
    @Param('id') id: string,
    @Body() transferDto: TransferActivationDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.activationsService.transferActivation(
      id,
      transferDto,
      adminEmail,
    );
  }
}
