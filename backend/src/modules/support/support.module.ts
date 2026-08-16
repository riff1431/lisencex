import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Ticket,
  TicketSchema,
} from '../../database/schemas/ticket.schema';
import {
  Product,
  ProductSchema,
} from '../../database/schemas/product.schema';
import {
  Purchase,
  PurchaseSchema,
} from '../../database/schemas/purchase.schema';
import {
  License,
  LicenseSchema,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationSchema,
} from '../../database/schemas/activation.schema';
import {
  User,
  UserSchema,
} from '../../database/schemas/user.schema';
import {
  AuditLog,
  AuditLogSchema,
} from '../../database/schemas/audit-log.schema';
import {
  Notification,
  NotificationSchema,
} from '../../database/schemas/notification.schema';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: License.name, schema: LicenseSchema },
      { name: Activation.name, schema: ActivationSchema },
      { name: User.name, schema: UserSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
