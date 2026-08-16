import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { Product, ProductSchema } from '../../database/schemas/product.schema';
import { Category, CategorySchema } from '../../database/schemas/category.schema';
import { AuditLog, AuditLogSchema } from '../../database/schemas/audit-log.schema';
import { Media, MediaSchema } from '../../database/schemas/media.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
