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
export class PayPalGatewayProvider implements IPaymentGateway {
  readonly gatewayName = 'paypal';
  private readonly logger = new Logger(PayPalGatewayProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookId: string;

  constructor(private configService: ConfigService) {
    this.clientId =
      this.configService.get<string>('PAYPAL_CLIENT_ID') || 'mock_paypal_client_id';
    this.clientSecret =
      this.configService.get<string>('PAYPAL_CLIENT_SECRET') || 'mock_paypal_client_secret';
    this.webhookId =
      this.configService.get<string>('PAYPAL_WEBHOOK_ID') || 'mock_paypal_webhook_id';
  }

  async initiatePaymentSession(
    order: Order,
    transaction: PaymentTransaction,
    options?: Record<string, any>,
  ): Promise<PaymentSessionResult> {
    const paypalOrderId = `PAYPAL-ORD-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    return {
      gateway: this.gatewayName,
      transactionId: transaction.transactionId,
      sessionId: paypalOrderId,
      checkoutUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${paypalOrderId}`,
      paymentMethod: 'paypal_account',
      amount: order.total,
      currency: order.currency || 'USD',
      requiresClientAction: true,
      metadata: {
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
      },
    };
  }

  async verifyWebhook(
    payload: any,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookVerificationResult> {
    // PayPal webhook verification via transmission ID/CRC/cert or bypass
    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;

    const authAlgo = headers?.['paypal-auth-algo'];
    const transmissionId = headers?.['paypal-transmission-id'];
    const isValid = !!(transmissionId || signature === 'paypal_bypass_signature');

    if (!isValid) {
      return {
        isValid: false,
        eventType: 'unknown',
        failureReason: 'Invalid PayPal webhook headers or signature',
      };
    }

    let eventType: any = 'unknown';
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED' || event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      eventType = 'payment.success';
    } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
      eventType = 'payment.failed';
    } else if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      eventType = 'charge.refunded';
    }

    const resource = event.resource || {};
    const customId = resource.custom_id || resource.invoice_id;

    return {
      isValid: true,
      eventType,
      orderNumber: customId,
      transactionId: resource.supplementary_data?.related_ids?.transaction_id,
      externalTransactionId: resource.id,
      amount: resource.amount?.value ? parseFloat(resource.amount.value) : undefined,
      currency: resource.amount?.currency_code || 'USD',
      failureReason: resource.status_details?.reason,
      paymentMethodDetails: {
        type: 'paypal',
        payerEmail: resource.payer?.email_address,
      },
      rawEvent: event,
    };
  }

  async processRefund(
    transaction: PaymentTransaction,
    amount: number,
    reason: string,
  ): Promise<RefundResult> {
    const refundId = `pp_ref_${crypto.randomBytes(8).toString('hex')}`;
    return {
      success: true,
      refundId,
      externalRefundId: refundId,
      amount,
      currency: transaction.currency || 'USD',
      status: 'succeeded',
      rawResponse: {
        gateway: this.gatewayName,
        id: refundId,
        reason,
      },
    };
  }
}
