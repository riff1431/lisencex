import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── CUSTOMER ROUTES ─────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('customer/orders')
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() body: CreateOrderDto,
    @Req() req: any,
  ) {
    return this.ordersService.createOrder(userId, body.items, body.couponCode, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  // NOTE: customer-side confirm-payment was removed — it let any order owner
  // mark their own order PAID and receive licenses without any payment proof.
  // Orders are now only confirmed by gateway webhooks (signature-verified) or
  // by the admin route below (manual/bank-transfer review).

  @UseGuards(JwtAuthGuard)
  @Get('customer/orders')
  async getCustomerOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customer/orders/:id')
  async getCustomerOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    const order = await this.ordersService.findById(orderId);
    if (order.userId.toString() !== userId) {
      throw new Error('Order does not belong to this user');
    }
    return order;
  }

  // ─── ADMIN ROUTES ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/orders')
  async getAdminOrders(@Query() query: any) {
    return this.ordersService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/orders/stats')
  async getOrderStats() {
    return this.ordersService.getStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/orders/:id')
  async getAdminOrder(@Param('id') orderId: string) {
    return this.ordersService.findById(orderId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/orders/:id/confirm-payment')
  async adminConfirmPayment(
    @CurrentUser('email') adminEmail: string,
    @Param('id') orderId: string,
    @Body() body: { paymentReference?: string; paymentMethod?: string },
  ) {
    return this.ordersService.confirmPayment(orderId, body as any, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/orders/:id/cancel')
  async cancelOrder(
    @CurrentUser('email') adminEmail: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.cancelOrder(orderId, adminEmail);
  }

  // ─── PUBLIC STORE ROUTES ─────────────────────────────────────────

  // NOTE: GET public/store/products was removed — it was a copy-paste bug
  // that returned ALL ORDERS (customer emails, names, IPs, totals) to
  // unauthenticated callers. The storefront uses /public/store/catalog from
  // the products module instead.

  // Order status + license keys are owner-scoped: order numbers are
  // semi-guessable, so this moved behind auth with an ownership check
  // (previously GET public/orders/status/:orderNumber leaked license keys).
  @UseGuards(JwtAuthGuard)
  @Get('customer/orders/status/:orderNumber')
  async getOrderStatus(
    @CurrentUser('id') userId: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.getOrderStatusWithLicenses(orderNumber, userId);
  }
}
