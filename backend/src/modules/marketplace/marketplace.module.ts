import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { InternalMarketplaceProvider } from './providers/internal.provider';
import { EnvatoMarketplaceProvider } from './providers/envato.provider';

@Module({
  providers: [
    InternalMarketplaceProvider,
    EnvatoMarketplaceProvider,
    MarketplaceService,
  ],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
