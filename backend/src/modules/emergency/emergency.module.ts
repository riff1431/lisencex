import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmergencyService } from './emergency.service';
import { EmergencyController } from './emergency.controller';
import { Product, ProductSchema } from '../../database/schemas/product.schema';
import { License, LicenseSchema } from '../../database/schemas/license.schema';
import { Activation, ActivationSchema } from '../../database/schemas/activation.schema';
import { AuditLog, AuditLogSchema } from '../../database/schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: License.name, schema: LicenseSchema },
      { name: Activation.name, schema: ActivationSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [EmergencyController],
  providers: [EmergencyService],
  exports: [EmergencyService],
})
export class EmergencyModule {}
