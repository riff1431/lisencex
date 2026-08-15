import { MarketplaceProviderType } from '../../../common/enums/app.enums';

export interface VerifyPurchaseInput {
  provider: MarketplaceProviderType;
  credential: string; // Purchase Code or Internal Purchase Key
  productId?: string;
  expectedItemId?: string; // e.g. Envato Item ID
}

export interface PurchaseVerificationResult {
  valid: boolean;
  provider: MarketplaceProviderType;
  externalPurchaseCode?: string;
  externalItemId?: string;
  buyerUsername?: string;
  purchasedAt?: Date;
  licenseType?: string; // regular, extended
  supportUntil?: Date;
  rawResponse?: any;
  errorMessage?: string;
}

export interface IMarketplaceProvider {
  readonly providerType: MarketplaceProviderType;
  verifyPurchase(input: VerifyPurchaseInput): Promise<PurchaseVerificationResult>;
}
