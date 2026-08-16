import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from '../../database/schemas/payment-transaction.schema';
import {
  Order,
  OrderSchema,
} from '../../database/schemas/order.schema';
import {
  License,
  LicenseSchema,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationSchema,
} from '../../database/schemas/activation.schema';
import {
  ActivationToken,
  ActivationTokenSchema,
} from '../../database/schemas/activation-token.schema';
import {
  AuditLog,
  AuditLogSchema,
} from '../../database/schemas/audit-log.schema';
import {
  User,
  UserSchema,
} from '../../database/schemas/user.schema';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentGatewayRegistry } from './payments.registry';
import { SimulatorGatewayProvider } from './providers/simulator.provider';
import { StripeGatewayProvider } from './providers/stripe.provider';
import { PayPalGatewayProvider } from './providers/paypal.provider';
import { ManualGatewayProvider } from './providers/manual.provider';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: Order.name, schema: OrderSchema },
      { name: License.name, schema: LicenseSchema },
      { name: Activation.name, schema: ActivationSchema },
      { name: ActivationToken.name, schema: ActivationTokenSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    OrdersModule,
    NotificationsModule,
    forwardRef(() => CouponsModule),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentGatewayRegistry,
    SimulatorGatewayProvider,
    StripeGatewayProvider,
    PayPalGatewayProvider,
    ManualGatewayProvider,
  ],
  exports: [PaymentsService, PaymentGatewayRegistry],
})
export class PaymentsModule {}
