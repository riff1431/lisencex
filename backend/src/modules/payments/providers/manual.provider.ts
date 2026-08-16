import { Injectable, Logger } from '@nestjs/common';
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
export class ManualGatewayProvider implements IPaymentGateway {
  readonly gatewayName = 'manual';
  private readonly logger = new Logger(ManualGatewayProvider.name);

  async initiatePaymentSession(
    order: Order,
    transaction: PaymentTransaction,
    options?: Record<string, any>,
  ): Promise<PaymentSessionResult> {
    const reference = `WIRE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      gateway: this.gatewayName,
      transactionId: transaction.transactionId,
      paymentMethod: 'bank_transfer',
      amount: order.total,
      currency: order.currency || 'USD',
      requiresClientAction: true,
      metadata: {
        orderNumber: order.orderNumber,
        wireReference: reference,
        instructions: 'Please transfer to Company Bank Account and include wireReference.',
      },
    };
  }

  async verifyWebhook(
    payload: any,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookVerificationResult> {
    return {
      isValid: false,
      eventType: 'unknown',
      failureReason: 'Manual gateway does not support automated webhooks',
    };
  }

  async processRefund(
    transaction: PaymentTransaction,
    amount: number,
    reason: string,
  ): Promise<RefundResult> {
    return {
      success: true,
      refundId: `man_ref_${crypto.randomBytes(6).toString('hex')}`,
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
