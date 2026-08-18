import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  PaymentGatewayType,
  TransactionStatus,
} from '../../database/schemas/payment-transaction.schema';
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentStatus,
} from '../../database/schemas/order.schema';
import {
  License,
  LicenseDocument,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationDocument,
} from '../../database/schemas/activation.schema';
import {
  ActivationToken,
  ActivationTokenDocument,
} from '../../database/schemas/activation-token.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { OrdersService } from '../orders/orders.service';
import { PaymentGatewayRegistry } from './payments.registry';
import { SimulatorGatewayProvider } from './providers/simulator.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { CouponsService } from '../coupons/coupons.service';
import {
  InitiateCheckoutDto,
  SimulatorCompleteDto,
  ProcessRefundDto,
  ManualVerifyDto,
  PaymentTransactionsQueryDto,
} from './dto/payment.dto';
import {
  LicenseStatus,
  ActivationStatus,
  NotificationType,
  NotificationSeverity,
} from '../../common/enums/app.enums';
import { paymentsSimulationEnabled } from '../../common/utils/security.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(PaymentTransaction.name)
    private transactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(License.name) private licenseModel: Model<LicenseDocument>,
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
    @InjectModel(ActivationToken.name)
    private tokenModel: Model<ActivationTokenDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private ordersService: OrdersService,
    private gatewayRegistry: PaymentGatewayRegistry,
    private simulatorProvider: SimulatorGatewayProvider,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => CouponsService))
    private couponsService: CouponsService,
  ) {}

  generateTransactionId(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TXN-${ts}-${rand}`;
  }

  /**
   * Compare what the gateway reports as paid against what the order costs.
   * Returns null when consistent, otherwise a human-readable mismatch reason.
   * Providers that do not surface an amount/currency are treated as unknown
   * (not enforced) — enforcement only happens on known values.
   */
  private verifyPaymentAmounts(
    order: OrderDocument | null,
    verification: { amount?: any; currency?: any },
  ): string | null {
    if (!order) return null;

    const expected = Number(order.total);
    if (verification.amount !== undefined && verification.amount !== null) {
      const reported = Number(verification.amount);
      if (!Number.isFinite(reported)) {
        return `gateway reported a non-numeric amount (${verification.amount})`;
      }
      // Small epsilon absorbs float rounding in gateway amount serialization
      if (reported + 0.009 < expected) {
        return `underpayment: order expects at least ${expected} ${order.currency || 'USD'}, gateway reported ${reported}`;
      }
    }

    const reportedCurrency = String(verification.currency || '')
      .trim()
      .toUpperCase();
    const expectedCurrency = String(order.currency || 'USD')
      .trim()
      .toUpperCase();
    if (reportedCurrency && reportedCurrency !== expectedCurrency) {
      return `currency mismatch: order expects ${expectedCurrency}, gateway reported ${reportedCurrency}`;
    }

    return null;
  }

  /**
   * 1. Initiate Checkout Session
   */
  async initiateCheckout(
    userId: string,
    dto: InitiateCheckoutDto,
    options?: { ip?: string; userAgent?: string },
  ) {
    const order = await this.orderModel.findById(dto.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('You do not own this order');
    }

    if (
      order.status === OrderStatus.COMPLETED &&
      order.paymentStatus === PaymentStatus.PAID
    ) {
      throw new BadRequestException('Order is already paid and completed');
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot initiate checkout for ${order.status} order`,
      );
    }

    const gateway = this.gatewayRegistry.getProvider(dto.gateway);
    const transactionId = this.generateTransactionId();

    const transaction = await this.transactionModel.create({
      transactionId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      gateway: dto.gateway,
      amount: order.total,
      currency: order.currency || 'USD',
      status: TransactionStatus.PENDING,
      paymentMethodDetails: dto.paymentMethodDetails || {},
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
      },
    });

    order.transactionId = transactionId;
    order.status = OrderStatus.PROCESSING;
    order.paymentStatus = PaymentStatus.PROCESSING;
    await order.save();

    const session = await gateway.initiatePaymentSession(order, transaction, {
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      ...dto.paymentMethodDetails,
    });

    await this.auditLogModel.create({
      actorEmail: order.customerEmail || 'customer',
      action: 'PAYMENT_SESSION_INITIATED',
      targetType: 'payment',
      targetId: transactionId,
      after: {
        orderNumber: order.orderNumber,
        gateway: dto.gateway,
        amount: order.total,
      },
    });

    return {
      transactionId,
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: order.currency || 'USD',
      session,
    };
  }

  /**
   * 2. Complete Simulator Payment (Cryptographic HMAC Verification)
   */
  async completeSimulatorPayment(
    userId: string,
    dto: SimulatorCompleteDto,
    ip?: string,
    userAgent?: string,
  ) {
    // Defense in depth: the provider also refuses to start simulator
    // sessions, so no valid simulated token can exist unless simulation was
    // explicitly enabled by the operator.
    if (!paymentsSimulationEnabled()) {
      throw new BadRequestException(
        'Simulator payment gateway requires PAYMENTS_ALLOW_SIMULATION=1 (dev/test only)',
      );
    }

    const tokenResult = this.simulatorProvider.verifySimulatedToken(
      dto.simulatedToken,
    );
    if (!tokenResult.valid || tokenResult.transactionId !== dto.transactionId) {
      throw new BadRequestException(
        'Invalid or forged simulator payment token',
      );
    }

    const transaction = await this.transactionModel.findOne({
      transactionId: dto.transactionId,
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId.toString() !== userId) {
      throw new ForbiddenException('Unauthorized transaction access');
    }

    if (transaction.status === TransactionStatus.PAID) {
      const order = await this.orderModel.findById(transaction.orderId);
      return {
        success: true,
        alreadyProcessed: true,
        transaction,
        order,
      };
    }

    if (dto.action === 'decline' || dto.action === 'error') {
      transaction.status = TransactionStatus.FAILED;
      transaction.failureReason = 'Card was declined by simulated issuer';
      transaction.failureCode = 'card_declined';
      await transaction.save();

      await this.orderModel.findByIdAndUpdate(transaction.orderId, {
        $set: {
          status: OrderStatus.FAILED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });

      return {
        success: false,
        message: 'Payment simulation declined',
        transaction,
      };
    }

    // Mark transaction as paid
    transaction.status = TransactionStatus.PAID;
    transaction.paidAt = new Date();
    transaction.externalTransactionId = `sim_tx_${crypto.randomBytes(8).toString('hex')}`;
    transaction.paymentMethodDetails = {
      brand: dto.cardBrand || 'Visa (Simulated)',
      last4: dto.cardLast4 || '4242',
      country: 'US',
    };
    await transaction.save();

    // Confirm Order and Fulfill Licenses
    const fulfillment = await this.ordersService.confirmPayment(
      transaction.orderId.toString(),
      {
        paymentReference: transaction.transactionId,
        paymentMethod: transaction.gateway as any,
      },
      transaction.customerEmail,
    );

    return {
      success: true,
      message: 'Payment confirmed and licenses issued successfully',
      transaction,
      order: fulfillment.order,
      fulfillmentResults: fulfillment.fulfillmentResults,
    };
  }

  /**
   * 3. Handle Webhook (Provider-Agnostic & Idempotent)
   */
  async handleWebhook(
    gatewayName: string,
    payload: any,
    signature: string,
    headers: Record<string, string>,
    ip?: string,
    userAgent?: string,
  ) {
    const gateway = this.gatewayRegistry.getProvider(gatewayName);
    const verification = await gateway.verifyWebhook(
      payload,
      signature,
      headers,
    );

    if (!verification.isValid) {
      this.logger.warn(
        `Webhook signature verification failed for ${gatewayName}`,
      );
      throw new BadRequestException(
        verification.failureReason || 'Webhook signature verification failed',
      );
    }

    const eventId =
      headers['webhook-id'] ||
      headers['x-request-id'] ||
      `evt_${crypto.randomBytes(8).toString('hex')}`;

    // Find transaction
    let transaction: PaymentTransactionDocument | null = null;
    if (verification.transactionId) {
      transaction = await this.transactionModel.findOne({
        transactionId: verification.transactionId,
      });
    }
    if (!transaction && verification.orderNumber) {
      transaction = await this.transactionModel
        .findOne({ orderNumber: verification.orderNumber })
        .sort({ createdAt: -1 });
    }

    if (!transaction && verification.orderNumber) {
      // Create transaction if direct webhook without prior session
      const order = await this.orderModel.findOne({
        orderNumber: verification.orderNumber,
      });
      if (order) {
        transaction = await this.transactionModel.create({
          transactionId: this.generateTransactionId(),
          orderId: order._id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          gateway: gatewayName as any,
          amount: verification.amount ?? order.total,
          currency: verification.currency || order.currency || 'USD',
          status: TransactionStatus.PENDING,
          externalTransactionId: verification.externalTransactionId,
        });
      }
    }

    if (!transaction) {
      this.logger.warn(
        `No matching transaction found for webhook event on ${gatewayName}`,
      );
      return {
        received: true,
        handled: false,
        message: 'Transaction not found',
      };
    }

    // Idempotency: atomically claim the eventId. A plain read-then-push check
    // loses when a gateway retries a webhook concurrently — both requests
    // would pass the check and double-fulfill. findOneAndUpdate is atomic.
    transaction = await this.transactionModel.findOneAndUpdate(
      { _id: transaction._id, 'webhookEvents.eventId': { $ne: eventId } },
      {
        $push: {
          webhookEvents: {
            eventId,
            eventType: verification.eventType,
            receivedAt: new Date(),
            status: 'received',
            details: {
              externalTransactionId: verification.externalTransactionId,
              amount: verification.amount,
            },
          },
        },
      },
      { new: true },
    );
    if (!transaction) {
      return {
        received: true,
        alreadyHandled: true,
        message: 'Event already processed',
      };
    }

    if (verification.eventType === 'payment.success') {
      if (transaction.status !== TransactionStatus.PAID) {
        // ── Payment integrity gate ─────────────────────────────────────────
        // A correctly-signed webhook for a short payment or the wrong
        // currency must never mark an order paid or issue licenses.
        const order = await this.orderModel.findById(transaction.orderId);
        const mismatch = this.verifyPaymentAmounts(order, verification);

        if (mismatch) {
          transaction.webhookEvents[
            transaction.webhookEvents.length - 1
          ].status = 'rejected_amount_mismatch';
          transaction.failureReason = `Webhook rejected: ${mismatch}`;
          transaction.failureCode = 'amount_mismatch';
          await transaction.save();

          this.logger.error(
            `Webhook amount mismatch on ${transaction.transactionId}: ${mismatch} ` +
              `(order ${transaction.orderNumber} expects ${order?.total} ${order?.currency || 'USD'}, ` +
              `gateway reported ${verification.amount} ${verification.currency})`,
          );
          await this.auditLogModel
            .create({
              actorEmail: 'webhook@payment-processor',
              action: 'PAYMENT_AMOUNT_MISMATCH',
              targetType: 'payment',
              targetId: transaction.transactionId,
              after: {
                orderNumber: transaction.orderNumber,
                expectedAmount: order?.total,
                expectedCurrency: order?.currency,
                reportedAmount: verification.amount,
                reportedCurrency: verification.currency,
                reason: mismatch,
              },
            })
            .catch(() => {});
          return {
            received: true,
            handled: false,
            reason: 'amount_mismatch',
            message: mismatch,
          };
        }

        transaction.status = TransactionStatus.PAID;
        transaction.paidAt = new Date();
        if (verification.externalTransactionId) {
          transaction.externalTransactionId =
            verification.externalTransactionId;
        }
        if (verification.paymentMethodDetails) {
          transaction.paymentMethodDetails = verification.paymentMethodDetails;
        }
        await transaction.save();

        // Confirm order & issue licenses
        await this.ordersService.confirmPayment(
          transaction.orderId.toString(),
          {
            paymentReference: transaction.transactionId,
            paymentMethod: gatewayName as any,
          },
          'webhook@payment-processor',
        );

        if (transaction.userId) {
          this.notificationsService.notifyCustomer(
            transaction.userId.toString(),
            NotificationType.ORDER_PAID,
            'Payment Confirmed',
            `Your payment of $${transaction.amount} for order ${transaction.orderNumber} was confirmed. Your licenses are now active.`,
            {
              transactionId: transaction.transactionId,
              orderNumber: transaction.orderNumber,
            },
          );
        }
      }
    } else if (verification.eventType === 'payment.failed') {
      transaction.status = TransactionStatus.FAILED;
      transaction.failureReason =
        verification.failureReason || 'Payment failed at gateway';
      transaction.failureCode = verification.failureCode || 'gateway_failure';
      await transaction.save();

      await this.orderModel.findByIdAndUpdate(transaction.orderId, {
        $set: {
          status: OrderStatus.FAILED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    }

    await transaction.save();
    return { received: true, handled: true, eventType: verification.eventType };
  }

  /**
   * 4. Process Refund with Automated License Impact Rules
   */
  async processRefund(dto: ProcessRefundDto, actorEmail: string) {
    const transaction = await this.transactionModel.findOne({
      transactionId: dto.transactionId,
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (
      transaction.status !== TransactionStatus.PAID &&
      transaction.status !== TransactionStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot refund a transaction in ${transaction.status} status`,
      );
    }

    const totalRefundable =
      transaction.amount - (transaction.refundedAmount || 0);
    if (dto.amount > totalRefundable) {
      throw new BadRequestException(
        `Refund amount ($${dto.amount}) exceeds remaining refundable balance ($${totalRefundable})`,
      );
    }

    const gateway = this.gatewayRegistry.getProvider(transaction.gateway);
    const refundResult = await gateway.processRefund(
      transaction,
      dto.amount,
      dto.reason,
    );

    if (!refundResult.success) {
      throw new BadRequestException(
        refundResult.failureReason || 'Gateway rejected refund',
      );
    }

    const refundRecordId =
      refundResult.refundId ||
      `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const newRefundedTotal = (transaction.refundedAmount || 0) + dto.amount;
    const isFullRefund = newRefundedTotal >= transaction.amount;

    transaction.refundedAmount = newRefundedTotal;
    transaction.status = isFullRefund
      ? TransactionStatus.REFUNDED
      : TransactionStatus.PARTIALLY_REFUNDED;

    transaction.refunds.push({
      refundId: refundRecordId,
      amount: dto.amount,
      currency: transaction.currency || 'USD',
      reason: dto.reason,
      actorEmail,
      externalRefundId: refundResult.externalRefundId,
      revokedLicense: dto.revokeLicense ?? isFullRefund,
      refundedAt: new Date(),
    });
    await transaction.save();

    // Update Order
    const order = await this.orderModel.findById(transaction.orderId);
    if (order) {
      order.refundedAmount = newRefundedTotal;
      order.status = isFullRefund
        ? OrderStatus.REFUNDED
        : OrderStatus.PARTIALLY_REFUNDED;
      order.paymentStatus = isFullRefund
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
      await order.save();

      if (isFullRefund && order.couponId) {
        await this.couponsService.revertUsage(
          order.couponId.toString(),
          order._id.toString(),
        );
      }
    }

    // Apply License Impact Rules if requested (or on full refund)
    const shouldRevoke = dto.revokeLicense ?? isFullRefund;
    const affectedLicenses: string[] = [];

    if (shouldRevoke && order?.items) {
      for (const item of order.items) {
        if (item.licenseId) {
          const license = await this.licenseModel.findById(item.licenseId);
          if (license && license.status !== LicenseStatus.REVOKED) {
            license.status = LicenseStatus.REVOKED;
            license.revokedAt = new Date();
            license.revocationReason = `Payment refunded: ${dto.reason}`;
            license.isCriticalRevoked = true;
            await license.save();

            // Deactivate installations
            if (dto.suspendActivations !== false) {
              await this.activationModel.updateMany(
                { licenseId: license._id, status: ActivationStatus.ACTIVE },
                {
                  $set: {
                    status: ActivationStatus.DEACTIVATED,
                    deactivatedAt: new Date(),
                    deactivationReason: `License revoked due to payment refund: ${dto.reason}`,
                  },
                },
              );

              await this.tokenModel.updateMany(
                { licenseId: license._id },
                { $set: { isRevoked: true } },
              );
            }

            affectedLicenses.push(license.licenseKey);
          }
        }
      }
    }

    await this.auditLogModel.create({
      actorEmail,
      action: 'PAYMENT_REFUNDED',
      targetType: 'payment',
      targetId: transaction.transactionId,
      after: {
        orderNumber: transaction.orderNumber,
        refundAmount: dto.amount,
        isFullRefund,
        revokedLicenses: affectedLicenses,
        reason: dto.reason,
      },
    });

    if (transaction.userId) {
      this.notificationsService.notifyCustomer(
        transaction.userId.toString(),
        NotificationType.SYSTEM_ALERT,
        'Payment Refund Processed',
        `A refund of $${dto.amount} has been processed for order ${transaction.orderNumber}. Reason: ${dto.reason}`,
        {
          transactionId: transaction.transactionId,
          orderNumber: transaction.orderNumber,
        },
      );
    }

    return {
      success: true,
      message: isFullRefund
        ? 'Full refund processed and licenses revoked'
        : 'Partial refund processed',
      refundId: refundRecordId,
      refundedAmount: dto.amount,
      totalRefunded: newRefundedTotal,
      affectedLicenses,
      transaction,
    };
  }

  /**
   * 5. Manual Payment Verification with Audit Log
   */
  async manualVerifyPayment(
    transactionId: string,
    dto: ManualVerifyDto,
    actorEmail: string,
  ) {
    const transaction = await this.transactionModel.findOne({ transactionId });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === TransactionStatus.PAID) {
      throw new BadRequestException('Transaction is already verified and paid');
    }

    transaction.status = TransactionStatus.PAID;
    transaction.paidAt = new Date();
    if (dto.externalReference) {
      transaction.externalTransactionId = dto.externalReference;
    }
    transaction.metadata = {
      ...(transaction.metadata || {}),
      manualVerifiedBy: actorEmail,
      manualVerifiedReason: dto.reason,
      notes: dto.notes,
    };
    await transaction.save();

    // Confirm Order and Fulfill Licenses
    const fulfillment = await this.ordersService.confirmPayment(
      transaction.orderId.toString(),
      {
        paymentReference: transaction.transactionId,
        paymentMethod: transaction.gateway as any,
      },
      actorEmail,
    );

    await this.auditLogModel.create({
      actorEmail,
      action: 'MANUAL_PAYMENT_VERIFIED',
      targetType: 'payment',
      targetId: transaction.transactionId,
      after: {
        orderNumber: transaction.orderNumber,
        reason: dto.reason,
        externalReference: dto.externalReference,
      },
    });

    return {
      success: true,
      message: 'Payment manually verified and licenses issued',
      transaction,
      order: fulfillment.order,
      fulfillmentResults: fulfillment.fulfillmentResults,
    };
  }

  /**
   * 6. Query Transactions & Details
   */
  async getTransactions(query: PaymentTransactionsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.gateway) filter.gateway = query.gateway;
    if (query.search) {
      filter.$or = [
        { transactionId: { $regex: query.search, $options: 'i' } },
        { orderNumber: { $regex: query.search, $options: 'i' } },
        { customerEmail: { $regex: query.search, $options: 'i' } },
        { externalTransactionId: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionById(transactionId: string) {
    const transaction = await this.transactionModel
      .findOne({
        $or: [
          { transactionId },
          { _id: Types.ObjectId.isValid(transactionId) ? transactionId : null },
        ],
      })
      .lean();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const order = await this.orderModel.findById(transaction.orderId).lean();
    return {
      transaction,
      order,
    };
  }

  /**
   * 7. Telemetry & Stats
   */
  async getStats() {
    const [
      totalTransactions,
      paidCount,
      failedCount,
      refundedCount,
      volumeAgg,
      refundAgg,
    ] = await Promise.all([
      this.transactionModel.countDocuments(),
      this.transactionModel.countDocuments({ status: TransactionStatus.PAID }),
      this.transactionModel.countDocuments({
        status: TransactionStatus.FAILED,
      }),
      this.transactionModel.countDocuments({
        status: {
          $in: [
            TransactionStatus.REFUNDED,
            TransactionStatus.PARTIALLY_REFUNDED,
          ],
        },
      }),
      this.transactionModel.aggregate([
        {
          $match: {
            status: {
              $in: [
                TransactionStatus.PAID,
                TransactionStatus.REFUNDED,
                TransactionStatus.PARTIALLY_REFUNDED,
              ],
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.transactionModel.aggregate([
        { $group: { _id: null, total: { $sum: '$refundedAmount' } } },
      ]),
    ]);

    const grossVolume = volumeAgg[0]?.total || 0;
    const totalRefunded = refundAgg[0]?.total || 0;
    const netVolume = Math.max(0, grossVolume - totalRefunded);
    const successRate =
      totalTransactions > 0
        ? ((paidCount / totalTransactions) * 100).toFixed(1)
        : '100';

    return {
      totalTransactions,
      paidCount,
      failedCount,
      refundedCount,
      grossVolume,
      netVolume,
      totalRefunded,
      successRate: parseFloat(successRate),
    };
  }
}
