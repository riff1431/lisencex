import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
import {
  isProduction,
  safeEqual,
  paymentsSimulationEnabled,
} from '../../../common/utils/security.util';

@Injectable()
export class StripeGatewayProvider implements IPaymentGateway {
  readonly gatewayName = 'stripe';
  private readonly logger = new Logger(StripeGatewayProvider.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly secretKeyConfigured: boolean;
  private readonly webhookSecretConfigured: boolean;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    this.secretKeyConfigured = !!secretKey;
    this.webhookSecretConfigured = !!webhookSecret;
    // Mock defaults are only usable outside production (see isConfigured).
    this.secretKey = secretKey || 'sk_test_mock_stripe_key_123';
    this.webhookSecret = webhookSecret || 'whsec_mock_stripe_secret_123';
  }

  isConfigured(): boolean {
    return this.secretKeyConfigured && this.webhookSecretConfigured;
  }

  async initiatePaymentSession(
    order: Order,
    transaction: PaymentTransaction,
    options?: Record<string, any>,
  ): Promise<PaymentSessionResult> {
    if (isProduction() && !this.isConfigured()) {
      throw new BadRequestException(
        'Stripe is not configured on this server (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET)',
      );
    }

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
    const rawPayload =
      typeof payload === 'string' ? payload : JSON.stringify(payload);
    const isProd = isProduction();

    // Production is fail-closed: no configured webhook secret -> reject everything.
    if (isProd && !this.webhookSecretConfigured) {
      return {
        isValid: false,
        eventType: 'unknown',
        failureReason:
          'Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured on this server',
      };
    }

    // Stripe signature scheme: t=<timestamp>,v1=<hex hmac of "<t>.<payload>"
    let isValid = false;
    if (signature && signature.includes('v1=')) {
      const parts = signature.split(',').map((p) => p.trim());
      const timestamp = parts.find((p) => p.startsWith('t='))?.split('=')[1];
      const sig = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

      if (timestamp && sig) {
        if (isProd) {
          // Replay protection: reject events older/newer than 5 minutes.
          const age = Math.abs(
            Math.floor(Date.now() / 1000) - parseInt(timestamp, 10),
          );
          if (Number.isNaN(age) || age > 300) {
            return {
              isValid: false,
              eventType: 'unknown',
              failureReason:
                'Stripe webhook timestamp outside the 5-minute tolerance window',
            };
          }
        }

        const signedPayload = `${timestamp}.${rawPayload}`;
        const expectedSig = crypto
          .createHmac('sha256', this.webhookSecret)
          .update(signedPayload)
          .digest('hex');
        isValid = safeEqual(sig, expectedSig);
      }
    }

    // Dev-only convenience signature for the bundled test suite — never valid in production.
    if (
      paymentsSimulationEnabled() &&
      signature === 'stripe_bypass_signature'
    ) {
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

    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'checkout.session.completed'
    ) {
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
      amount: dataObj.amount
        ? dataObj.amount / 100
        : dataObj.amount_total
          ? dataObj.amount_total / 100
          : undefined,
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
