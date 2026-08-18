/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- mock-heavy test */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentTransaction } from '../../database/schemas/payment-transaction.schema';
import { Order } from '../../database/schemas/order.schema';
import { License } from '../../database/schemas/license.schema';
import { Activation } from '../../database/schemas/activation.schema';
import { ActivationToken } from '../../database/schemas/activation-token.schema';
import { AuditLog } from '../../database/schemas/audit-log.schema';
import { User } from '../../database/schemas/user.schema';
import { OrdersService } from '../orders/orders.service';
import { PaymentGatewayRegistry } from './payments.registry';
import { SimulatorGatewayProvider } from './providers/simulator.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { CouponsService } from '../coupons/coupons.service';

/**
 * Payment-integrity regression suite: a webhook for an underpayment or the
 * wrong currency must never mark an order paid or issue licenses, and
 * duplicate webhook events must never double-fulfill.
 */
describe('PaymentsService.handleWebhook (payment integrity)', () => {
  let service: PaymentsService;

  const ORDER = {
    _id: 'order0000000000000000000001',
    orderNumber: 'ORD-TEST-1',
    total: 49,
    currency: 'USD',
  };

  const makeTransaction = (overrides: any = {}) => ({
    _id: 'txn00000000000000000000001',
    transactionId: 'TXN-TEST-1',
    orderId: ORDER._id,
    orderNumber: ORDER.orderNumber,
    userId: 'user00000000000000000000001',
    customerEmail: 'buyer@example.com',
    amount: 49,
    currency: 'USD',
    gateway: 'stripe',
    status: 'pending',
    webhookEvents: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const confirmPayment = jest.fn();
  const auditCreate = jest.fn().mockResolvedValue(undefined);

  const provider = (verification: any) => ({
    verifyWebhook: jest.fn().mockResolvedValue(verification),
  });

  const registry = (verification: any) => ({
    getProvider: jest.fn().mockReturnValue(provider(verification)),
  });

  const build = async (
    verification: any,
    transaction: any,
    order: any = ORDER,
  ) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getModelToken(PaymentTransaction.name),
          useValue: {
            findOne: jest.fn().mockResolvedValue(transaction),
            findOneAndUpdate: jest
              .fn()
              .mockImplementation((_filter, update) => {
                // mirror the atomic eventId claim: second delivery of the same
                // eventId must find no matching document
                const already = transaction.webhookEvents.some(
                  (e: any) => e.eventId === update.$push.webhookEvents.eventId,
                );
                if (already) return Promise.resolve(null);
                transaction.webhookEvents.push(update.$push.webhookEvents);
                return Promise.resolve(transaction);
              }),
            create: jest.fn(),
          },
        },
        {
          provide: getModelToken(Order.name),
          useValue: {
            findById: jest.fn().mockResolvedValue(order),
            findOne: jest.fn(),
          },
        },
        { provide: getModelToken(License.name), useValue: {} },
        { provide: getModelToken(Activation.name), useValue: {} },
        { provide: getModelToken(ActivationToken.name), useValue: {} },
        {
          provide: getModelToken(AuditLog.name),
          useValue: { create: auditCreate },
        },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: OrdersService, useValue: { confirmPayment } },
        { provide: PaymentGatewayRegistry, useValue: registry(verification) },
        { provide: SimulatorGatewayProvider, useValue: {} },
        {
          provide: NotificationsService,
          useValue: { notifyCustomer: jest.fn() },
        },
        { provide: CouponsService, useValue: {} },
      ],
    }).compile();
    return module.get<PaymentsService>(PaymentsService);
  };

  const successEvent = (overrides: any = {}) => ({
    isValid: true,
    eventType: 'payment.success',
    transactionId: 'TXN-TEST-1',
    externalTransactionId: 'ext_123',
    amount: 49,
    currency: 'USD',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PAYMENTS_ALLOW_SIMULATION;
  });

  it('fulfills when the paid amount and currency match the order', async () => {
    service = await build(successEvent(), makeTransaction());
    const res = await service.handleWebhook('stripe', {}, 'sig', {
      'webhook-id': 'evt-1',
    });

    expect(res.handled).toBe(true);
    expect(confirmPayment).toHaveBeenCalledTimes(1);
  });

  it('does NOT fulfill on underpayment', async () => {
    service = await build(successEvent({ amount: 0.5 }), makeTransaction());
    const res = await service.handleWebhook('stripe', {}, 'sig', {
      'webhook-id': 'evt-2',
    });

    expect(res.handled).toBe(false);
    expect(res.reason).toBe('amount_mismatch');
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PAYMENT_AMOUNT_MISMATCH' }),
    );
  });

  it('does NOT fulfill when the currency differs', async () => {
    service = await build(successEvent({ currency: 'BDT' }), makeTransaction());
    const res = await service.handleWebhook('stripe', {}, 'sig', {
      'webhook-id': 'evt-3',
    });

    expect(res.reason).toBe('amount_mismatch');
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it('accepts a tiny rounding difference within the epsilon', async () => {
    service = await build(successEvent({ amount: 48.995 }), makeTransaction());
    const res = await service.handleWebhook('stripe', {}, 'sig', {
      'webhook-id': 'evt-4',
    });

    expect(res.handled).toBe(true);
    expect(confirmPayment).toHaveBeenCalledTimes(1);
  });

  it('rejects a non-numeric gateway amount', async () => {
    service = await build(
      successEvent({ amount: 'forty-nine' }),
      makeTransaction(),
    );
    const res = await service.handleWebhook('stripe', {}, 'sig', {
      'webhook-id': 'evt-5',
    });

    expect(res.reason).toBe('amount_mismatch');
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it('is idempotent for duplicate webhook events', async () => {
    service = await build(successEvent(), makeTransaction());
    const first = await service.handleWebhook('stripe', {}, 'sig', {
      'webhook-id': 'evt-6',
    });
    const second = await service.handleWebhook('stripe', {}, 'sig', {
      'webhook-id': 'evt-6',
    });

    expect(first.handled).toBe(true);
    expect(second.alreadyHandled).toBe(true);
    expect(confirmPayment).toHaveBeenCalledTimes(1);
  });

  it('does not fulfill an already-PAID transaction twice via webhook retries', async () => {
    service = await build(
      successEvent(),
      makeTransaction({
        status: 'paid',
        webhookEvents: [{ eventId: 'evt-old' }],
      }),
    );
    const res = await service.handleWebhook('stripe', {}, 'sig', {
      'webhook-id': 'evt-7',
    });

    expect(res.handled).toBe(true);
    expect(confirmPayment).not.toHaveBeenCalled(); // order already fulfilled
  });
});

describe('PaymentsService simulator gating', () => {
  it('rejects simulator completion unless simulation is explicitly enabled', async () => {
    delete process.env.PAYMENTS_ALLOW_SIMULATION;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(PaymentTransaction.name), useValue: {} },
        { provide: getModelToken(Order.name), useValue: {} },
        { provide: getModelToken(License.name), useValue: {} },
        { provide: getModelToken(Activation.name), useValue: {} },
        { provide: getModelToken(ActivationToken.name), useValue: {} },
        { provide: getModelToken(AuditLog.name), useValue: {} },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: OrdersService, useValue: {} },
        { provide: PaymentGatewayRegistry, useValue: {} },
        { provide: SimulatorGatewayProvider, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: CouponsService, useValue: {} },
      ],
    }).compile();
    const service = module.get<PaymentsService>(PaymentsService);

    await expect(
      service.completeSimulatorPayment('user1', {
        transactionId: 'T',
        simulatedToken: 'x',
      }),
    ).rejects.toThrow(/PAYMENTS_ALLOW_SIMULATION/);
  });
});
