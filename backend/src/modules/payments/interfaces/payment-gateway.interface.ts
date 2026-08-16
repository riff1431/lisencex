import { Order } from '../../../database/schemas/order.schema';
import { PaymentTransaction } from '../../../database/schemas/payment-transaction.schema';

export interface PaymentSessionResult {
  gateway: string;
  transactionId: string;
  checkoutUrl?: string;
  sessionId?: string;
  clientSecret?: string;
  simulatedToken?: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  requiresClientAction?: boolean;
  metadata?: Record<string, any>;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventType: 'payment.success' | 'payment.failed' | 'payment.processing' | 'charge.refunded' | 'unknown';
  orderNumber?: string;
  transactionId?: string;
  externalTransactionId?: string;
  amount?: number;
  currency?: string;
  failureReason?: string;
  failureCode?: string;
  paymentMethodDetails?: Record<string, any>;
  rawEvent?: any;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  externalRefundId?: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  failureReason?: string;
  rawResponse?: any;
}

export interface IPaymentGateway {
  readonly gatewayName: string;

  initiatePaymentSession(
    order: Order,
    transaction: PaymentTransaction,
    options?: Record<string, any>,
  ): Promise<PaymentSessionResult>;

  verifyWebhook(
    payload: any,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookVerificationResult>;

  processRefund(
    transaction: PaymentTransaction,
    amount: number,
    reason: string,
  ): Promise<RefundResult>;
}
