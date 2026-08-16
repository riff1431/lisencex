import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IPaymentGateway,
  PaymentSessionResult,
  WebhookVerificationResult,
  RefundResult,
} from '../interfaces/payment-gateway.interface';
import { Order } from '../../../database/schemas/order.schema';
import { PaymentTransaction } from '../../../database/schemas/payment-transaction.schema';

@Injectable()
export class SimulatorGatewayProvider implements IPaymentGateway {
  readonly gatewayName = 'simulator';
  private readonly logger = new Logger(SimulatorGatewayProvider.name);
  private readonly secret: string;

  constructor(private configService: ConfigService) {
    this.secret =
      this.configService.get<string>('PAYMENT_SIMULATOR_SECRET') ||
      'licensenest_sim_secret_9a8b7c6d5e4f3a2b1c';
  }

  generateSimulatedToken(transactionId: string, orderNumber: string, amount: number): string {
    const payload = `${transactionId}:${orderNumber}:${amount}:${Date.now()}`;
    const hmac = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    const encoded = Buffer.from(payload).toString('base64url');
    return `${encoded}.${hmac}`;
  }

  verifySimulatedToken(token: string): { valid: boolean; transactionId?: string; orderNumber?: string; amount?: number } {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return { valid: false };
      const [encoded, signature] = parts;
      const payload = Buffer.from(encoded, 'base64url').toString('utf8');
      const expectedHmac = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');

      if (signature !== expectedHmac) {
        return { valid: false };
      }

      const [transactionId, orderNumber, amountStr] = payload.split(':');
      return {
        valid: true,
        transactionId,
        orderNumber,
        amount: parseFloat(amountStr),
      };
    } catch {
      return { valid: false };
    }
  }

  async initiatePaymentSession(
    order: Order,
    transaction: PaymentTransaction,
    options?: Record<string, any>,
  ): Promise<PaymentSessionResult> {
    const simulatedToken = this.generateSimulatedToken(
      transaction.transactionId,
      order.orderNumber,
      order.total,
    );

    return {
      gateway: this.gatewayName,
      transactionId: transaction.transactionId,
      sessionId: `sim_sess_${crypto.randomBytes(12).toString('hex')}`,
      simulatedToken,
      paymentMethod: 'simulator_card',
      amount: order.total,
      currency: order.currency || 'USD',
      requiresClientAction: true,
      metadata: {
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        isTestMode: true,
      },
    };
  }

  async verifyWebhook(
    payload: any,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookVerificationResult> {
    // Simulator webhook verification: requires HMAC-SHA256 signature
    const eventString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(eventString)
      .digest('hex');

    if (signature !== expectedSignature && signature !== 'simulator_bypass_signature') {
      return {
        isValid: false,
        eventType: 'unknown',
        failureReason: 'Invalid webhook HMAC signature',
      };
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const eventType = event.type || 'payment.success';

    return {
      isValid: true,
      eventType,
      orderNumber: event.orderNumber || event.data?.orderNumber,
      transactionId: event.transactionId || event.data?.transactionId,
      externalTransactionId: event.externalTransactionId || `sim_tx_${crypto.randomBytes(8).toString('hex')}`,
      amount: event.amount || event.data?.amount,
      currency: event.currency || event.data?.currency || 'USD',
      failureReason: event.failureReason || event.data?.failureReason,
      failureCode: event.failureCode || event.data?.failureCode,
      paymentMethodDetails: event.paymentMethodDetails || {
        brand: 'Visa (Simulated)',
        last4: '4242',
        country: 'US',
      },
      rawEvent: event,
      metadata: event.metadata,
    };
  }

  async processRefund(
    transaction: PaymentTransaction,
    amount: number,
    reason: string,
  ): Promise<RefundResult> {
    const refundId = `sim_ref_${crypto.randomBytes(8).toString('hex')}`;
    return {
      success: true,
      refundId,
      externalRefundId: `ext_ref_${crypto.randomBytes(10).toString('hex')}`,
      amount,
      currency: transaction.currency || 'USD',
      status: 'succeeded',
      rawResponse: {
        gateway: this.gatewayName,
        reason,
        processedAt: new Date(),
      },
    };
  }
}
