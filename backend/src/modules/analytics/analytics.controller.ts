import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@Query() query: any) {
    return this.analyticsService.getOverview(query);
  }

  @Get('charts')
  async getCharts(@Query() query: any) {
    return this.analyticsService.getCharts(query);
  }

  @Get('products-performance')
  async getProductsPerformance(@Query() query: any) {
    return this.analyticsService.getProductsPerformance(query);
  }

  @Get('failed-activations')
  async getFailedActivations(@Query() query: any) {
    return this.analyticsService.getFailedActivations(query);
  }

  @Get('status-breakdown')
  async getStatusBreakdown(@Query() query: any) {
    return this.analyticsService.getLicenseStatusBreakdown(query);
  }

  @Get('limit-usage')
  async getLimitUsage(@Query() query: any) {
    return this.analyticsService.getActivationLimitUsage(query);
  }

  @Post('export-csv')
  async exportCsv(
    @Body() body: { reportType: string; query: any },
  ) {
    const csv = await this.analyticsService.exportCsv(body.reportType, body.query);
    return { csv };
  }
}
