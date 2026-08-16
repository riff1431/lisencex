import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Coupon,
  CouponSchema,
} from '../../database/schemas/coupon.schema';
import {
  CouponUsage,
  CouponUsageSchema,
} from '../../database/schemas/coupon-usage.schema';
import {
  Order,
  OrderSchema,
} from '../../database/schemas/order.schema';
import {
  Product,
  ProductSchema,
} from '../../database/schemas/product.schema';
import {
  LicensePlan,
  LicensePlanSchema,
} from '../../database/schemas/license-plan.schema';
import {
  AuditLog,
  AuditLogSchema,
} from '../../database/schemas/audit-log.schema';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponUsage.name, schema: CouponUsageSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: LicensePlan.name, schema: LicensePlanSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
