import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review, ReviewSchema } from '../../database/schemas/review.schema';
import { Product, ProductSchema } from '../../database/schemas/product.schema';
import { Purchase, PurchaseSchema } from '../../database/schemas/purchase.schema';
import { AuditLog, AuditLogSchema } from '../../database/schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
