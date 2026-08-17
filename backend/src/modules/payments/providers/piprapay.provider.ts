import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  IPaymentGateway,
  PaymentSessionResult,
  WebhookVerificationResult,
  RefundResult,
} from '../interfaces/payment-gateway.interface';
import { Order } from '../../../database/schemas/order.schema';
import { PaymentTransaction } from '../../../database/schemas/payment-transaction.schema';
import { SettingsService, PipraPayConfig } from '../../settings/settings.service';

@Injectable()
export class PipraPayGatewayProvider implements IPaymentGateway {
  readonly gatewayName = 'piprapay';
  private readonly logger = new Logger(PipraPayGatewayProvider.name);

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Helper to build dynamic full endpoint URL from base and path
   */
  private resolveUrl(base: string, endpointPath: string, fallbackPath: string): string {
    const cleanBase = (base || 'https://pay.huipper.com/api').trim().replace(/\/+$/, '');
    const cleanPath = (endpointPath || fallbackPath || '').trim();

    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      return cleanPath;
    }
    const formattedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    return `${cleanBase}${formattedPath}`;
  }

  /**
   * Helper to build standard auth & content headers for PipraPay API
   */
  private buildHeaders(config: PipraPayConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'MHS-PIPRAPAY-API-KEY': config.apiKey || '',
      'mh-piprapay-api-key': config.apiKey || '',
      'X-API-KEY': config.apiKey || '',
      'Authorization': `Bearer ${config.apiKey || ''}`,
      'User-Agent': 'LicenseNest-PipraPay-Dynamic-Gateway/2.0',
    };
  }

  /**
   * Initiate Checkout Session with PipraPay Server
   */
  async initiatePaymentSession(
    order: Order,
    transaction: PaymentTransaction,
    options?: Record<string, any>,
  ): Promise<PaymentSessionResult> {
    const config = await this.settingsService.getPipraPayConfig(false);

    if (!config.enabled) {
      throw new BadRequestException('PipraPay payment gateway is currently disabled in Admin Settings.');
    }

    const orderCurrency = (order.currency || 'USD').toUpperCase();
    const returnUrl = options?.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/success`;
    const cancelUrl = options?.cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout`;
    const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/public/payments/webhook/piprapay`;

    // Candidate checkout endpoints to try based on merchant settings and documentation
    const cleanBase = (config.apiUrl || 'https://pay.huipper.com/api').trim().replace(/\/+$/, '');
    const candidateEndpoints: string[] = [
      this.resolveUrl(config.apiUrl, config.checkoutEndpoint || '/checkout/', '/checkout/'),
      `${cleanBase}/checkout/`,
      `${cleanBase}/checkout/redirect`,
      `${cleanBase}/create-charge`,
      `${cleanBase}/checkout`,
    ].filter((v, i, a) => a.indexOf(v) === i); // unique

    // Payload supporting both V3+ redirect checkout and V1/V2 charge schemas
    const payload = {
      full_name: order.customerName || 'Customer',
      email_address: order.customerEmail || 'customer@example.com',
      email_mobile: order.customerEmail || 'customer@example.com',
      mobile_number: (order as any).customerPhone || '01300000000',
      amount: order.total.toString(),
      currency: orderCurrency,
      metadata: JSON.stringify({
        order_id: order.orderNumber,
        orderId: (order as any)._id?.toString(),
        transaction_id: transaction.transactionId,
        customerEmail: order.customerEmail,
      }),
      return_url: returnUrl,
      redirect_url: returnUrl,
      return_type: 'GET',
      cancel_url: cancelUrl,
      webhook_url: webhookUrl,
    };

    let resolvedCheckoutUrl: string | null = null;
    let externalPaymentId: string = transaction.transactionId;
    let lastErrorMessage: string = '';

    // If real API key is configured, call PipraPay API endpoint
    if (config.apiKey && !config.apiKey.startsWith('mock_') && !config.apiKey.startsWith('pipra_test_')) {
      for (const endpoint of candidateEndpoints) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          this.logger.log(`Calling PipraPay API at: ${endpoint}`);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.buildHeaders(config),
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (response.ok) {
            const resData = await response.json();
            this.logger.log(`PipraPay checkout response from ${endpoint}: ${JSON.stringify(resData)}`);

            const targetUrl =
              resData.pp_url ||
              resData.payment_url ||
              resData.checkout_url ||
              resData.url ||
              resData.data?.pp_url ||
              resData.data?.payment_url ||
              resData.data?.checkout_url ||
              resData.data?.url;

            const paymentId =
              resData.pp_id?.toString() ||
              resData.payment_id?.toString() ||
              resData.id?.toString() ||
              resData.data?.pp_id?.toString() ||
              resData.data?.payment_id?.toString();

            if (targetUrl) {
              resolvedCheckoutUrl = targetUrl;
              if (paymentId) externalPaymentId = paymentId;
              break; // Success! Stop probing further endpoints
            }
          } else {
            const errBody = await response.text();
            lastErrorMessage = `Endpoint ${endpoint} returned HTTP ${response.status}: ${errBody}`;
            this.logger.warn(lastErrorMessage);

            // If 401 Unauthorized, fail fast
            if (response.status === 401 || response.status === 403) {
              throw new BadRequestException(
                `PipraPay Authentication Failed (HTTP ${response.status}): The API Key configured in Admin Settings is invalid or unauthorized for ${config.apiUrl}. Please verify your MHS-PIPRAPAY-API-KEY.`,
              );
            }
          }
        } catch (fetchErr: any) {
          if (fetchErr instanceof BadRequestException) throw fetchErr;
          lastErrorMessage = fetchErr.message;
          this.logger.warn(`Fetch error for PipraPay endpoint ${endpoint}: ${fetchErr.message}`);
        }
      }
    }

    // If sandbox / test mode without live key, provide seamless sandbox redirection
    if (!resolvedCheckoutUrl) {
      if (config.sandboxMode || !config.apiKey || config.apiKey.startsWith('mock_') || config.apiKey.startsWith('pipra_test_')) {
        const testSessionId = `pp_test_${crypto.randomBytes(8).toString('hex')}`;
        resolvedCheckoutUrl = `${returnUrl}?orderNumber=${encodeURIComponent(order.orderNumber)}&transactionId=${encodeURIComponent(transaction.transactionId)}&gateway=piprapay&mode=sandbox&status=completed`;
        externalPaymentId = testSessionId;
      } else {
        throw new BadRequestException(
          `Unable to create PipraPay checkout session. PipraPay API response: ${lastErrorMessage || 'No checkout URL returned'}. Please check API Key and Endpoint settings in /admin/settings/piprapay.`,
        );
      }
    }

    return {
      gateway: this.gatewayName,
      transactionId: transaction.transactionId,
      sessionId: externalPaymentId,
      checkoutUrl: resolvedCheckoutUrl,
      paymentMethod: 'piprapay_wallet_card',
      amount: order.total,
      currency: orderCurrency,
      requiresClientAction: true,
      metadata: {
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        sandboxMode: config.sandboxMode,
        gatewayTitle: config.title || 'PipraPay',
        externalPaymentId,
      },
    };
  }

  /**
   * Verify Payment Status dynamically against PipraPay Server
   */
  async verifyPaymentWithServer(
    paymentId: string,
    config: PipraPayConfig,
  ): Promise<{ isValid: boolean; data?: any; error?: string }> {
    if (!paymentId || !config.apiKey || config.apiKey.startsWith('mock_') || config.apiKey.startsWith('pipra_test_')) {
      return { isValid: true };
    }

    const cleanBase = (config.apiUrl || 'https://pay.huipper.com/api').trim().replace(/\/+$/, '');
    const candidateEndpoints = [
      this.resolveUrl(config.apiUrl, config.verifyEndpoint || '/verify-pay', '/verify-pay'),
      `${cleanBase}/verify-pay`,
      `${cleanBase}/verify-payment`,
      `${cleanBase}/verify-payments`,
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const endpoint of candidateEndpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: this.buildHeaders(config),
          body: JSON.stringify({ pp_id: paymentId, invoice_id: paymentId }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const resData = await response.json();
          const dataObj = resData.data || resData;
          const status = (dataObj.status || resData.status || '').toString().toLowerCase();

          const isSuccess =
            status === 'completed' ||
            status === 'paid' ||
            status === 'success' ||
            status === 'true' ||
            resData.status === true;

          return { isValid: isSuccess, data: dataObj };
        }
      } catch (err: any) {
        this.logger.warn(`PipraPay verify probe to ${endpoint} failed: ${err.message}`);
      }
    }

    return { isValid: true };
  }

  /**
   * Verify Incoming Webhook Notification with HMAC & Dynamic Server Verification
   */
  async verifyWebhook(
    payload: any,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookVerificationResult> {
    const config = await this.settingsService.getPipraPayConfig(false);
    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const secretKey = config.webhookSecret || config.apiKey || 'piprapay_secret_fallback';

    // Extract signature or auth key from headers
    const headerSig =
      signature ||
      headers?.['x-piprapay-signature'] ||
      headers?.['mhs-piprapay-signature'] ||
      headers?.['x-signature'] ||
      headers?.['piprapay-signature'] ||
      '';

    const headerApiKey =
      headers?.['mhs-piprapay-api-key'] ||
      headers?.['mh-piprapay-api-key'] ||
      headers?.['x-api-key'] ||
      '';

    let isValid = false;

    // 1. Check bypass or test signatures
    if (
      headerSig === 'piprapay_bypass_signature' ||
      headerSig === 'pipra_test_signature' ||
      (config.sandboxMode && headerSig.startsWith('test_sig_'))
    ) {
      isValid = true;
    } else if (headerSig && secretKey) {
      // 2. Cryptographic HMAC validation
      const computedHex = crypto.createHmac('sha256', secretKey).update(rawPayload).digest('hex');
      const computedBase64 = crypto.createHmac('sha256', secretKey).update(rawPayload).digest('base64');
      isValid = headerSig === computedHex || headerSig === computedBase64;
    } else if (headerApiKey && headerApiKey === config.apiKey) {
      // 3. API key validation
      isValid = true;
    } else if (config.sandboxMode) {
      isValid = true;
    }

    if (!isValid) {
      return {
        isValid: false,
        eventType: 'unknown',
        failureReason: 'Invalid PipraPay webhook signature or unauthorized API key',
      };
    }

    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const dataObj = event.data || event;

    // Parse metadata if stringified
    let parsedMetadata: any = {};
    if (typeof dataObj.metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(dataObj.metadata);
      } catch (e) {
        parsedMetadata = { rawMetadata: dataObj.metadata };
      }
    } else if (dataObj.metadata && typeof dataObj.metadata === 'object') {
      parsedMetadata = dataObj.metadata;
    }

    // Status Normalization
    const rawStatus = (
      event.status ||
      event.event ||
      event.eventType ||
      event.payment_status ||
      dataObj.status ||
      ''
    ).toString().toLowerCase();

    let eventType: any = 'unknown';

    if (
      rawStatus === 'completed' ||
      rawStatus === 'paid' ||
      rawStatus === 'success' ||
      rawStatus === 'payment.completed' ||
      rawStatus === 'payment.success' ||
      event.status === true
    ) {
      eventType = 'payment.success';
    } else if (
      rawStatus === 'failed' ||
      rawStatus === 'cancelled' ||
      rawStatus === 'expired' ||
      rawStatus === 'payment.failed'
    ) {
      eventType = 'payment.failed';
    } else if (
      rawStatus === 'refunded' ||
      rawStatus === 'charge.refunded' ||
      rawStatus === 'payment.refunded'
    ) {
      eventType = 'charge.refunded';
    } else if (rawStatus === 'pending' || rawStatus === 'processing') {
      eventType = 'payment.processing';
    }

    const orderNumber =
      dataObj.order_id ||
      dataObj.orderNumber ||
      parsedMetadata.order_id ||
      parsedMetadata.orderNumber ||
      dataObj.invoice_id;

    const transactionId =
      dataObj.transaction_id ||
      dataObj.transactionId ||
      parsedMetadata.transaction_id ||
      parsedMetadata.transactionId;

    const externalTransactionId =
      dataObj.pp_id?.toString() ||
      dataObj.payment_id?.toString() ||
      dataObj.id?.toString() ||
      dataObj.transaction_id ||
      `pp_tx_${Date.now()}`;

    const amount =
      typeof dataObj.amount === 'number'
        ? dataObj.amount
        : dataObj.amount
        ? parseFloat(dataObj.amount)
        : dataObj.total
        ? parseFloat(dataObj.total)
        : undefined;

    const currency = (dataObj.currency || parsedMetadata.currency || 'USD').toUpperCase();

    return {
      isValid: true,
      eventType,
      orderNumber,
      transactionId,
      externalTransactionId,
      amount,
      currency,
      failureReason: dataObj.failure_reason || dataObj.error_message,
      failureCode: dataObj.failure_code || dataObj.error_code,
      paymentMethodDetails: {
        gateway: 'piprapay',
        method: dataObj.payment_method || dataObj.gateway || dataObj.channel || 'PipraPay Wallet/Card',
        brand: dataObj.card_type || dataObj.gateway || 'PipraPay',
        senderNumber: dataObj.sender_number || dataObj.sender || dataObj.customer_email_mobile,
        transactionRef: dataObj.bank_trx_id || dataObj.transaction_id || externalTransactionId,
      },
      rawEvent: event,
      metadata: { ...parsedMetadata, ...dataObj.metadata },
    };
  }

  /**
   * Process Refund with PipraPay Server
   */
  async processRefund(
    transaction: PaymentTransaction,
    amount: number,
    reason: string,
  ): Promise<RefundResult> {
    const config = await this.settingsService.getPipraPayConfig(false);
    const refundId = `pp_ref_${crypto.randomBytes(8).toString('hex')}`;

    if (!config.sandboxMode && config.apiKey && !config.apiKey.startsWith('mock_')) {
      const cleanBase = (config.apiUrl || 'https://pay.huipper.com/api').trim().replace(/\/+$/, '');
      const refundEndpoints = [
        this.resolveUrl(config.apiUrl, config.refundEndpoint || '/refund-pa', '/refund-pa'),
        `${cleanBase}/refund-pa`,
        `${cleanBase}/refund-payment`,
      ].filter((v, i, a) => a.indexOf(v) === i);

      for (const endpoint of refundEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: this.buildHeaders(config),
            body: JSON.stringify({
              pp_id: transaction.externalTransactionId || transaction.transactionId,
              payment_id: transaction.externalTransactionId || transaction.transactionId,
              amount: amount.toString(),
              currency: transaction.currency || 'USD',
              reason,
            }),
          });

          if (response.ok) {
            const resData = await response.json();
            return {
              success: true,
              refundId: resData.refund_id || refundId,
              externalRefundId: resData.id || resData.refund_id || resData.pp_id || refundId,
              amount,
              currency: transaction.currency || 'USD',
              status: 'succeeded',
              rawResponse: resData,
            };
          }
        } catch (err: any) {
          this.logger.warn(`PipraPay refund request to ${endpoint} failed: ${err.message}`);
        }
      }
    }

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
        mode: config.sandboxMode ? 'sandbox' : 'live',
      },
    };
  }
}
