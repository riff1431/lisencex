import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SettingsService, PipraPayConfig } from './settings.service';
import { UpdateSettingDto } from './dto/settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAll() {
    return this.settingsService.getAllSettings();
  }

  @Patch()
  async update(@Body() dto: UpdateSettingDto) {
    return this.settingsService.updateSetting(
      dto.key,
      dto.value,
      dto.description,
    );
  }

  @Get('piprapay')
  async getPipraPayConfig() {
    return this.settingsService.getPipraPayConfig(true);
  }

  @Patch('piprapay')
  async updatePipraPayConfig(@Body() dto: Partial<PipraPayConfig>) {
    return this.settingsService.updatePipraPayConfig(dto);
  }

  @Post('piprapay/test')
  async testPipraPayConnection(@Body() dto: Partial<PipraPayConfig>) {
    return this.settingsService.testPipraPayConnection(dto);
  }
}
