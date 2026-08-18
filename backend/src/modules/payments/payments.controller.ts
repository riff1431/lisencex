import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { PaymentGatewayRegistry } from './payments.registry';
import {
  InitiateCheckoutDto,
  SimulatorCompleteDto,
  ProcessRefundDto,
  ManualVerifyDto,
  PaymentTransactionsQueryDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { getClientIp } from '../../common/utils/client-ip.util';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly gatewayRegistry: PaymentGatewayRegistry,
  ) {}

  // ---------------- PUBLIC ROUTES ----------------
  @Get('public/payments/gateways')
  async getSupportedGateways() {
    return this.gatewayRegistry.getSupportedGatewaysAsync();
  }

  @Post('public/payments/webhook/:gateway')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Body() payload: any,
    @Headers('stripe-signature') stripeSig: string,
    @Headers('paypal-transmission-sig') paypalSig: string,
    @Headers('x-simulator-signature') simSig: string,
    @Headers('x-piprapay-signature') pipraSig: string,
    @Headers() allHeaders: Record<string, string>,
    @Req() req: Request,
  ) {
    const signature =
      stripeSig ||
      paypalSig ||
      simSig ||
      pipraSig ||
      allHeaders['x-signature'] ||
      '';
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    return this.paymentsService.handleWebhook(
      gateway,
      payload,
      signature,
      allHeaders,
      ip,
      userAgent,
    );
  }

  // ---------------- CUSTOMER ROUTES ----------------
  @UseGuards(JwtAuthGuard)
  @Post('customer/payments/initiate-checkout')
  async initiateCheckout(
    @Body() dto: InitiateCheckoutDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    return this.paymentsService.initiateCheckout(userId, dto, {
      ip,
      userAgent,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer/payments/simulator-complete')
  async completeSimulator(
    @Body() dto: SimulatorCompleteDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    return this.paymentsService.completeSimulatorPayment(
      userId,
      dto,
      ip,
      userAgent,
    );
  }

  // ---------------- ADMIN ROUTES ----------------
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/payments/transactions')
  async getTransactions(@Query() query: PaymentTransactionsQueryDto) {
    return this.paymentsService.getTransactions(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/payments/transactions/:id')
  async getTransactionDetail(@Param('id') id: string) {
    return this.paymentsService.getTransactionById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('admin/payments/stats')
  async getStats() {
    return this.paymentsService.getStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/payments/refund')
  async processRefund(
    @Body() dto: ProcessRefundDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.paymentsService.processRefund(dto, adminEmail);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post('admin/payments/manual-verify/:transactionId')
  async manualVerify(
    @Param('transactionId') transactionId: string,
    @Body() dto: ManualVerifyDto,
    @CurrentUser('email') adminEmail: string,
  ) {
    return this.paymentsService.manualVerifyPayment(
      transactionId,
      dto,
      adminEmail,
    );
  }
}
