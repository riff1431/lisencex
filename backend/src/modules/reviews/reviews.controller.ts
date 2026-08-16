import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import {
  SubmitReviewDto,
  UpdateReviewStatusDto,
  AdminReplyReviewDto,
} from './dto/review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ---------------- PUBLIC STOREFRONT ROUTES ----------------

  @Get('public/products/:slugOrId/reviews')
  async getProductReviews(@Param('slugOrId') slugOrId: string) {
    return this.reviewsService.getProductReviews(slugOrId);
  }

  // ---------------- CUSTOMER DASHBOARD ROUTES ----------------

  @Get('customer/reviews')
  @UseGuards(JwtAuthGuard)
  async getCustomerReviews(@CurrentUser() user: any) {
    return this.reviewsService.getCustomerReviews(user.id);
  }

  @Post('customer/reviews')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitReview(
    @Body() dto: SubmitReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.submitReview(user.id, user.fullName || user.name || user.email, dto);
  }

  // ---------------- ADMIN ROUTES ----------------

  @Get('admin/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAdminReviews(
    @Query('status') status?: string,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getAllAdminReviews({ status, productId, search, page, limit });
  }

  @Patch('admin/reviews/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateReviewStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.reviewsService.updateReviewStatus(id, dto, actorEmail);
  }

  @Post('admin/reviews/:id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async replyToReview(
    @Param('id') id: string,
    @Body() dto: AdminReplyReviewDto,
    @CurrentUser() user: any,
  ) {
    const actorEmail = user?.email || 'admin@licensenest.internal';
    return this.reviewsService.replyToReview(id, dto, actorEmail);
  }
}
