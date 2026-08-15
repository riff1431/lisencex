import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { LicensesService } from './licenses.service';
import {
  CreateManualLicenseDto,
  CreateBulkLicensesDto,
  LicenseActionDto,
  AddLicenseNoteDto,
  UpdateLicenseDto,
} from './dto/license.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  // ---------------- CUSTOMER ROUTES ----------------
  @UseGuards(JwtAuthGuard)
  @Get('customer/licenses')
  async getCustomerLicenses(@CurrentUser('id') userId: string) {
    return this.licensesService.findByCustomer(userId);
  }

  // ---------------- ADMIN ROUTES ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/customers')
  async searchCustomers(@Query('search') search?: string) {
    return this.licensesService.searchCustomers(search);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/licenses')
  async getAdminLicenses(@Query() query: any) {
    return this.licensesService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/licenses/:id')
  async getLicenseById(@Param('id') id: string) {
    return this.licensesService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/licenses')
  async createManualLicense(
    @Body() createDto: CreateManualLicenseDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.licensesService.createManual(createDto, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/licenses/bulk')
  async createBulkLicenses(
    @Body() bulkDto: CreateBulkLicensesDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.licensesService.createBulk(bulkDto, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/licenses/export-csv')
  async exportCsv(
    @Body() body: { licenseIds: string[] },
  ) {
    if (!body.licenseIds || !Array.isArray(body.licenseIds)) {
      throw new BadRequestException('licenseIds array is required');
    }
    const csv = await this.licensesService.exportBulkCsv(body.licenseIds);
    return { csv };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/licenses/:id/action')
  async performAction(
    @Param('id') id: string,
    @Body() actionDto: LicenseActionDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.licensesService.executeAction(id, actionDto, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/licenses/:id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() noteDto: AddLicenseNoteDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.licensesService.addNote(id, noteDto, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch('admin/licenses/:id')
  async updateLicense(
    @Param('id') id: string,
    @Body() updateDto: UpdateLicenseDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.licensesService.update(id, updateDto, adminEmail);
  }
}
