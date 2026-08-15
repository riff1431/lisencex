import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Product, ProductSchema } from '../../database/schemas/product.schema';
import { Purchase, PurchaseSchema } from '../../database/schemas/purchase.schema';
import { License, LicenseSchema } from '../../database/schemas/license.schema';
import { Activation, ActivationSchema } from '../../database/schemas/activation.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { DownloadLog, DownloadLogSchema } from '../../database/schemas/download-log.schema';
import { ValidationLog, ValidationLogSchema } from '../../database/schemas/validation-log.schema';
import { BlockedEntity, BlockedEntitySchema } from '../../database/schemas/blocked-entity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: License.name, schema: LicenseSchema },
      { name: Activation.name, schema: ActivationSchema },
      { name: User.name, schema: UserSchema },
      { name: DownloadLog.name, schema: DownloadLogSchema },
      { name: ValidationLog.name, schema: ValidationLogSchema },
      { name: BlockedEntity.name, schema: BlockedEntitySchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
