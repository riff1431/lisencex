import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationSchema,
} from '../../database/schemas/notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceSchema,
} from '../../database/schemas/notification-preference.schema';
import {
  License,
  LicenseSchema,
} from '../../database/schemas/license.schema';
import {
  User,
  UserSchema,
} from '../../database/schemas/user.schema';
import {
  Product,
  ProductSchema,
} from '../../database/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
      { name: License.name, schema: LicenseSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
