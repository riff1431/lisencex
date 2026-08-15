import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductsIntegrationService } from './products-integration.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import {
  RegisterProductWizardDto,
  RunWizardTestDto,
} from './dto/product-wizard.dto';

@Controller('admin/products/wizard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ProductsWizardController {
  constructor(
    private readonly integrationService: ProductsIntegrationService,
  ) {}

  @Post()
  async registerProduct(
    @Body() dto: RegisterProductWizardDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.integrationService.registerProductWizard(dto, adminEmail);
  }

  @Post(':productId/test')
  async runTest(
    @Param('productId') productId: string,
    @Body() dto: RunWizardTestDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.integrationService.runWizardTest(productId, dto, adminEmail);
  }

  @Post(':productId/finalize')
  async finalize(
    @Param('productId') productId: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.integrationService.finalizeWizard(productId, adminEmail);
  }

  @Get(':productId/checklist')
  async getChecklist(@Param('productId') productId: string) {
    return this.integrationService.getWizardChecklist(productId);
  }
}
