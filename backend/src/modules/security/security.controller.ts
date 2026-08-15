import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SecurityService } from './security.service';
import { BlockEntityDto } from './dto/security.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('overview')
  async getOverview() {
    return this.securityService.getSecurityOverview();
  }

  @Get('blocked')
  async getBlockedEntities() {
    return this.securityService.getBlockedEntities();
  }

  @Post('blocked')
  async blockEntity(
    @Body() dto: BlockEntityDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.securityService.blockEntity(dto, adminEmail);
  }

  @Get('suspicious')
  async getSuspiciousLicenses() {
    return this.securityService.getSuspiciousLicenses();
  }

  @Post('licenses/:id/suspend')
  async suspendLicense(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.securityService.suspendLicense(id, reason, adminEmail);
  }

  @Post('licenses/:id/revoke')
  async revokeLicense(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.securityService.revokeLicense(id, reason, adminEmail);
  }

  @Delete('blocked/:id')
  async unblockEntity(
    @Param('id') id: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.securityService.unblockEntity(id, adminEmail);
  }
}
