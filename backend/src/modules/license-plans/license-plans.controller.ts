import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LicensePlansService } from './license-plans.service';
import {
  CreateLicensePlanDto,
  UpdateLicensePlanDto,
} from './dto/license-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/license-plans')
export class LicensePlansController {
  constructor(private readonly plansService: LicensePlansService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.plansService.findAll(query);
  }

  @Get('active')
  async findActive() {
    return this.plansService.findActive();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.plansService.findById(id);
  }

  @Post()
  async create(
    @Body() dto: CreateLicensePlanDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.plansService.create(dto, adminEmail);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLicensePlanDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.plansService.update(id, dto, adminEmail);
  }

  @Delete(':id')
  async archive(
    @Param('id') id: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.plansService.archive(id, adminEmail);
  }
}
