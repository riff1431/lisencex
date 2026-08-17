import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IMarketplaceProvider,
  VerifyPurchaseInput,
  PurchaseVerificationResult,
} from '../interfaces/marketplace-provider.interface';
import { MarketplaceProviderType } from '../../../common/enums/app.enums';
import { isProduction } from '../../../common/utils/security.util';

@Injectable()
export class EnvatoMarketplaceProvider implements IMarketplaceProvider {
  readonly providerType = MarketplaceProviderType.ENVATO;
  private readonly logger = new Logger(EnvatoMarketplaceProvider.name);

  constructor(private configService: ConfigService) {}

  async verifyPurchase(
    input: VerifyPurchaseInput,
  ): Promise<PurchaseVerificationResult> {
    const purchaseCode = input.credential.trim();
    const token = this.configService.get<string>('ENVATO_API_TOKEN');

    // If Envato API token is not yet configured, provide clear actionable feedback
    if (!token) {
      if (isProduction()) {
        // Fail-closed: without the API token any UUID would otherwise be
        // accepted as a valid purchase (free license claiming).
        this.logger.error(
          'ENVATO_API_TOKEN is not configured — Envato purchase verification is rejected in production instead of accepting unverified codes.',
        );
        return {
          valid: false,
          provider: this.providerType,
          errorMessage:
            'Envato purchase verification is temporarily unavailable. Please contact support.',
        };
      }

      this.logger.warn(
        'ENVATO_API_TOKEN is not configured in environment. Checking format.',
      );
      // Validate UUID format typical of Envato purchase codes
      const isValidFormat =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          purchaseCode,
        );

      if (!isValidFormat) {
        return {
          valid: false,
          provider: this.providerType,
          errorMessage:
            'Invalid Envato purchase code format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        };
      }

      // If test code or dev mode without token
      return {
        valid: true,
        provider: this.providerType,
        externalPurchaseCode: purchaseCode,
        externalItemId: input.expectedItemId || '12345678',
        buyerUsername: 'envato_buyer',
        purchasedAt: new Date(),
        licenseType: 'regular',
        supportUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        rawResponse: { mode: 'sandbox_unconfigured_token' },
      };
    }

    try {
      const response = await fetch(
        `https://api.envato.com/v3/market/author/sale?code=${encodeURIComponent(purchaseCode)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'LicenseKeyManager/1.0',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Envato API error: ${response.status} - ${errorText}`);
        return {
          valid: false,
          provider: this.providerType,
          errorMessage:
            response.status === 404
              ? 'Purchase code not found on Envato'
              : `Envato verification failed with HTTP ${response.status}`,
        };
      }

      const data = await response.json();

      // Verify item ID matches expected item if provided
      if (
        input.expectedItemId &&
        String(data.item?.id) !== String(input.expectedItemId)
      ) {
        return {
          valid: false,
          provider: this.providerType,
          errorMessage: `Purchase code is valid for item #${data.item?.id} ("${data.item?.name}"), which does not match this product`,
        };
      }

      return {
        valid: true,
        provider: this.providerType,
        externalPurchaseCode: purchaseCode,
        externalItemId: String(data.item?.id),
        buyerUsername: data.buyer,
        purchasedAt: new Date(data.sold_at),
        licenseType:
          data.licence?.toLowerCase().includes('extended') ? 'extended' : 'regular',
        supportUntil: data.supported_until
          ? new Date(data.supported_until)
          : undefined,
        rawResponse: data,
      };
    } catch (error: any) {
      this.logger.error(`Failed to verify with Envato API: ${error.message}`);
      return {
        valid: false,
        provider: this.providerType,
        errorMessage: `Failed to connect to Envato API: ${error.message}`,
      };
    }
  }
}
