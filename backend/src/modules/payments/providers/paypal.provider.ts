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
  paymentsSimulationEnabled,
} from '../../../common/utils/security.util';

@Injectable()
export class PayPalGatewayProvider implements IPaymentGateway {
  readonly gatewayName = 'paypal';
  private readonly logger = new Logger(PayPalGatewayProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookId: string;
  private readonly configured: boolean;
  private readonly apiBase: string;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');

    this.configured = !!(clientId && clientSecret && webhookId);
    this.clientId = clientId || 'mock_paypal_client_id';
    this.clientSecret = clientSecret || 'mock_paypal_client_secret';
    this.webhookId = webhookId || 'mock_paypal_webhook_id';
    this.apiBase =
      this.configService.get<string>('PAYPAL_ENV') === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async initiatePaymentSession(
    order: Order,
    transaction: PaymentTransaction,
    options?: Record<string, any>,
  ): Promise<PaymentSessionResult> {
    if (isProduction() && !this.configured) {
      throw new BadRequestException(
        'PayPal is not configured on this server (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID)',
      );
    }

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

  /**
   * OAuth2 client-credentials access token for the verification API call.
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.clientId}:${this.clientSecret}`,
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) return null;
      const data = await response.json();
      return data?.access_token || null;
    } catch (err: any) {
      this.logger.warn(`PayPal token request failed: ${err.message}`);
      return null;
    }
  }

  async verifyWebhook(
    payload: any,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookVerificationResult> {
    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const isProd = isProduction();

    if (isProd) {
      // Production: verify through PayPal's verification API — fail-closed.
      if (!this.configured) {
        return {
          isValid: false,
          eventType: 'unknown',
          failureReason:
            'PayPal webhook rejected: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID are not configured',
        };
      }

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          isValid: false,
          eventType: 'unknown',
          failureReason:
            'Could not authenticate with PayPal to verify the webhook',
        };
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `${this.apiBase}/v1/notifications/verify-webhook-signature`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              auth_algo: headers?.['paypal-auth-algo'],
              cert_url: headers?.['paypal-cert-url'],
              transmission_id: headers?.['paypal-transmission-id'],
              transmission_sig: headers?.['paypal-transmission-sig'],
              transmission_time: headers?.['paypal-transmission-time'],
              webhook_id: this.webhookId,
              webhook_event: event,
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeout);
        const data = await response.json();

        if (!response.ok || data?.verification_status !== 'SUCCESS') {
          return {
            isValid: false,
            eventType: 'unknown',
            failureReason: `PayPal webhook verification failed (${
              data?.verification_status || `HTTP ${response.status}`
            })`,
          };
        }
      } catch (err: any) {
        return {
          isValid: false,
          eventType: 'unknown',
          failureReason: `PayPal webhook verification error: ${err.message}`,
        };
      }
    } else {
      // Development/test-suite behavior: presence of PayPal transmission headers.
      const transmissionId = headers?.['paypal-transmission-id'];
      const isValid =
        paymentsSimulationEnabled() &&
        !!(transmissionId || signature === 'paypal_bypass_signature');

      if (!isValid) {
        return {
          isValid: false,
          eventType: 'unknown',
          failureReason: 'Invalid PayPal webhook headers or signature',
        };
      }
    }

    let eventType: any = 'unknown';
    if (
      event.event_type === 'PAYMENT.CAPTURE.COMPLETED' ||
      event.event_type === 'CHECKOUT.ORDER.APPROVED'
    ) {
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
      amount: resource.amount?.value
        ? parseFloat(resource.amount.value)
        : undefined,
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
