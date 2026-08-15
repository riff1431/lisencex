import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IMarketplaceProvider,
  VerifyPurchaseInput,
  PurchaseVerificationResult,
} from '../interfaces/marketplace-provider.interface';
import { MarketplaceProviderType } from '../../../common/enums/app.enums';
import {
  Purchase,
  PurchaseDocument,
} from '../../../database/schemas/purchase.schema';

@Injectable()
export class InternalMarketplaceProvider implements IMarketplaceProvider {
  readonly providerType = MarketplaceProviderType.INTERNAL;

  constructor(
    @InjectModel(Purchase.name)
    private purchaseModel: Model<PurchaseDocument>,
  ) {}

  async verifyPurchase(
    input: VerifyPurchaseInput,
  ): Promise<PurchaseVerificationResult> {
    const purchase = await this.purchaseModel.findOne({
      purchaseKey: input.credential.trim(),
      source: MarketplaceProviderType.INTERNAL,
    });

    if (!purchase) {
      return {
        valid: false,
        provider: this.providerType,
        errorMessage: 'Internal purchase key not found or invalid',
      };
    }

    return {
      valid: true,
      provider: this.providerType,
      externalPurchaseCode: purchase.purchaseKey,
      purchasedAt: purchase.purchasedAt,
      licenseType: purchase.licenseType || 'regular',
      supportUntil: purchase.supportExpiresAt,
      rawResponse: purchase.toObject(),
    };
  }
}
