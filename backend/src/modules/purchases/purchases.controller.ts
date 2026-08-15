import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import {
  CreateInternalPurchaseDto,
  ClaimEnvatoPurchaseDto,
} from './dto/purchase.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // ---------------- CUSTOMER ROUTES ----------------
  @UseGuards(JwtAuthGuard)
  @Post('customer/purchases/claim-envato')
  async claimEnvatoPurchase(
    @CurrentUser('id') userId: string,
    @Body() dto: ClaimEnvatoPurchaseDto,
  ) {
    return this.purchasesService.claimEnvatoPurchase(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/purchases')
  async getCustomerPurchases(@CurrentUser('id') userId: string) {
    return this.purchasesService.findByCustomer(userId);
  }

  // ---------------- ADMIN ROUTES ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/purchases')
  async getAdminPurchases(@Query() query: any) {
    return this.purchasesService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/purchases')
  async createInternalPurchase(
    @Body() createPurchaseDto: CreateInternalPurchaseDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.purchasesService.createInternalPurchase(
      createPurchaseDto,
      adminEmail,
    );
  }
}
