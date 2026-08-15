import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { LicensesModule } from '../licenses/licenses.module';

@Module({
  imports: [MarketplaceModule, LicensesModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
