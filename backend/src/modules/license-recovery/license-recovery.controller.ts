import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { LicenseRecoveryService } from './license-recovery.service';
import {
  CreateRecoveryRequestDto,
  GuestRecoveryRequestDto,
  ResolveRecoveryRequestDto,
  ManualRecoveryDto,
} from './dto/license-recovery.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class LicenseRecoveryController {
  constructor(private readonly recoveryService: LicenseRecoveryService) {}

  // ---------------- CUSTOMER ROUTES ----------------
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('customer/licenses/recover')
  @HttpCode(HttpStatus.OK)
  async customerRequestRecovery(
    @Body() dto: CreateRecoveryRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.recoveryService.requestRecovery(dto, userId, userEmail, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/licenses/:id/recoveries')
  async getCustomerLicenseRecoveries(
    @Param('id') licenseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.recoveryService.getLicenseRecoveriesForCustomer(
      licenseId,
      userId,
    );
  }

  // ---------------- PUBLIC GUEST ROUTES ----------------
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('public/licenses/recover')
  @HttpCode(HttpStatus.OK)
  async guestRequestRecovery(
    @Body() dto: GuestRecoveryRequestDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.recoveryService.requestGuestRecovery(dto, ip);
  }

  // ---------------- ADMIN ROUTES ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/licenses/recoveries')
  async getAdminRecoveries(@Query() query: any) {
    return this.recoveryService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/licenses/recoveries/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveRecovery(
    @Param('id') id: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.recoveryService.approveRecovery(id, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/licenses/recoveries/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectRecovery(
    @Param('id') id: string,
    @Body() dto: ResolveRecoveryRequestDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.recoveryService.rejectRecovery(
      id,
      dto.rejectionReason || 'Rejected by administrator',
      adminEmail,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/licenses/recoveries/manual')
  @HttpCode(HttpStatus.OK)
  async manualRecovery(
    @Body() dto: ManualRecoveryDto,
    @CurrentUser('email') adminEmail: string,
    @Req() req: any,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.recoveryService.manualRecovery(dto, adminEmail, ip);
  }
}
