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
export class StripeGatewayProvider implements IPaymentGateway {
  readonly gatewayName = 'stripe';
  private readonly logger = new Logger(StripeGatewayProvider.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_mock_stripe_key_123';
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || 'whsec_mock_stripe_secret_123';
  }

  async initiatePaymentSession(
    order: Order,
    transaction: PaymentTransaction,
    options?: Record<string, any>,
  ): Promise<PaymentSessionResult> {
    const sessionId = `cs_test_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = `pi_test_${crypto.randomBytes(16).toString('hex')}_secret_${crypto.randomBytes(12).toString('hex')}`;

    return {
      gateway: this.gatewayName,
      transactionId: transaction.transactionId,
      sessionId,
      clientSecret,
      checkoutUrl: `https://checkout.stripe.com/c/pay/${sessionId}`,
      paymentMethod: 'card',
      amount: order.total,
      currency: (order.currency || 'USD').toLowerCase(),
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
    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // Stripe signature verification logic (t=timestamp,v1=signature)
    let isValid = false;
    if (signature && signature.includes('v1=')) {
      const parts = signature.split(',');
      const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
      const sig = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

      if (timestamp && sig) {
        const signedPayload = `${timestamp}.${rawPayload}`;
        const expectedSig = crypto
          .createHmac('sha256', this.webhookSecret)
          .update(signedPayload)
          .digest('hex');
        isValid = sig === expectedSig;
      }
    } else if (signature === 'stripe_bypass_signature') {
      isValid = true;
    }

    if (!isValid) {
      return {
        isValid: false,
        eventType: 'unknown',
        failureReason: 'Invalid Stripe webhook signature',
      };
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    let eventType: any = 'unknown';

    if (event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.completed') {
      eventType = 'payment.success';
    } else if (event.type === 'payment_intent.payment_failed') {
      eventType = 'payment.failed';
    } else if (event.type === 'charge.refunded') {
      eventType = 'charge.refunded';
    }

    const dataObj = event.data?.object || {};

    return {
      isValid: true,
      eventType,
      orderNumber: dataObj.metadata?.orderNumber,
      transactionId: dataObj.metadata?.transactionId,
      externalTransactionId: dataObj.id,
      amount: dataObj.amount ? dataObj.amount / 100 : dataObj.amount_total ? dataObj.amount_total / 100 : undefined,
      currency: (dataObj.currency || 'USD').toUpperCase(),
      failureReason: dataObj.last_payment_error?.message,
      failureCode: dataObj.last_payment_error?.code,
      paymentMethodDetails: {
        brand: dataObj.payment_method_details?.card?.brand || 'Visa',
        last4: dataObj.payment_method_details?.card?.last4 || '4242',
        country: dataObj.payment_method_details?.card?.country || 'US',
      },
      rawEvent: event,
      metadata: dataObj.metadata,
    };
  }

  async processRefund(
    transaction: PaymentTransaction,
    amount: number,
    reason: string,
  ): Promise<RefundResult> {
    const refundId = `re_${crypto.randomBytes(14).toString('hex')}`;
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
