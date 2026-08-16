import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  QueryCouponsDto,
} from './dto/coupon.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ---------------- PUBLIC PROMOTION OFFERS ----------------
  @Get('public/coupons/offers')
  async getPublicOffers() {
    return this.couponsService.getPublicOffers();
  }

  // ---------------- CUSTOMER VALIDATION ----------------
  @UseGuards(JwtAuthGuard)
  @Post('customer/coupons/validate')
  @HttpCode(HttpStatus.OK)
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.couponsService.validateCoupon(userId, dto);
  }

  // ---------------- ADMIN MANAGEMENT ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/coupons')
  async getCoupons(@Query() query: QueryCouponsDto) {
    return this.couponsService.getAdminCoupons(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/coupons/stats')
  async getStats() {
    return this.couponsService.getCouponStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/coupons/:id')
  async getCouponDetail(@Param('id') id: string) {
    return this.couponsService.getCouponById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/coupons')
  async createCoupon(
    @Body() dto: CreateCouponDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.couponsService.createCoupon(dto, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch('admin/coupons/:id')
  async updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.couponsService.updateCoupon(id, dto, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete('admin/coupons/:id')
  async deleteCoupon(
    @Param('id') id: string,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.couponsService.deleteCoupon(id, adminEmail);
  }
}
