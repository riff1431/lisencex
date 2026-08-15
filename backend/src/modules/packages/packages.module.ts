import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import {
  ProductVersion,
  ProductVersionSchema,
} from '../../database/schemas/product-version.schema';
import {
  Product,
  ProductSchema,
} from '../../database/schemas/product.schema';
import {
  DownloadLog,
  DownloadLogSchema,
} from '../../database/schemas/download-log.schema';
import {
  License,
  LicenseSchema,
} from '../../database/schemas/license.schema';
import {
  Activation,
  ActivationSchema,
} from '../../database/schemas/activation.schema';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductVersion.name, schema: ProductVersionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: DownloadLog.name, schema: DownloadLogSchema },
      { name: License.name, schema: LicenseSchema },
      { name: Activation.name, schema: ActivationSchema },
    ]),
    TokenModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
