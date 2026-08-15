import { Injectable, BadRequestException } from '@nestjs/common';
import { MarketplaceProviderType } from '../../common/enums/app.enums';
import {
  IMarketplaceProvider,
  VerifyPurchaseInput,
  PurchaseVerificationResult,
} from './interfaces/marketplace-provider.interface';
import { InternalMarketplaceProvider } from './providers/internal.provider';
import { EnvatoMarketplaceProvider } from './providers/envato.provider';

@Injectable()
export class MarketplaceService {
  private providers: Map<MarketplaceProviderType, IMarketplaceProvider> =
    new Map();

  constructor(
    internalProvider: InternalMarketplaceProvider,
    envatoProvider: EnvatoMarketplaceProvider,
  ) {
    this.providers.set(MarketplaceProviderType.INTERNAL, internalProvider);
    this.providers.set(MarketplaceProviderType.ENVATO, envatoProvider);
  }

  async verifyPurchase(
    input: VerifyPurchaseInput,
  ): Promise<PurchaseVerificationResult> {
    const provider = this.providers.get(input.provider);
    if (!provider) {
      throw new BadRequestException(
        `Marketplace provider "${input.provider}" is not supported`,
      );
    }
    return provider.verifyPurchase(input);
  }

  registerProvider(provider: IMarketplaceProvider) {
    this.providers.set(provider.providerType, provider);
  }
}
