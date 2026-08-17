import { Injectable, BadRequestException } from '@nestjs/common';
import { IPaymentGateway } from './interfaces/payment-gateway.interface';
import { SimulatorGatewayProvider } from './providers/simulator.provider';
import { StripeGatewayProvider } from './providers/stripe.provider';
import { PayPalGatewayProvider } from './providers/paypal.provider';
import { ManualGatewayProvider } from './providers/manual.provider';
import { PipraPayGatewayProvider } from './providers/piprapay.provider';
import { PaymentGatewayType } from '../../database/schemas/payment-transaction.schema';
import { SettingsService } from '../settings/settings.service';
import { isProduction } from '../../common/utils/security.util';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly providers = new Map<string, IPaymentGateway>();

  constructor(
    private simulatorProvider: SimulatorGatewayProvider,
    private stripeProvider: StripeGatewayProvider,
    private paypalProvider: PayPalGatewayProvider,
    private manualProvider: ManualGatewayProvider,
    private pipraPayProvider: PipraPayGatewayProvider,
    private settingsService: SettingsService,
  ) {
    this.register(simulatorProvider);
    this.register(stripeProvider);
    this.register(paypalProvider);
    this.register(manualProvider);
    this.register(pipraPayProvider);
  }

  register(provider: IPaymentGateway) {
    this.providers.set(provider.gatewayName.toLowerCase(), provider);
  }

  getProvider(gateway: string | PaymentGatewayType): IPaymentGateway {
    const key = gateway.toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      throw new BadRequestException(`Payment gateway "${gateway}" is not supported or enabled`);
    }
    return provider;
  }

  async getSupportedGatewaysAsync(): Promise<Array<{ name: string; label: string; isTestMode?: boolean; enabled?: boolean; description?: string }>> {
    const pipraConfig = await this.settingsService.getPipraPayConfig(true);
    const list: Array<{ name: string; label: string; isTestMode?: boolean; enabled?: boolean; description?: string }> = [
      { name: 'simulator', label: 'Instant Simulator (Test Cards)', isTestMode: true, enabled: true },
      { name: 'manual', label: 'Bank Wire / Offline Transfer', enabled: true },
    ];

    // Outside production the mock credentials are usable for local testing.
    // In production only advertise gateways that are actually configured.
    if (!isProduction() || this.stripeProvider.isConfigured()) {
      list.push({ name: 'stripe', label: 'Credit / Debit Card (Stripe)', enabled: true });
    }
    if (!isProduction() || this.paypalProvider.isConfigured()) {
      list.push({ name: 'paypal', label: 'PayPal', enabled: true });
    }

    if (pipraConfig.enabled) {
      list.push({
        name: 'piprapay',
        label: pipraConfig.title || 'PipraPay (Cards & Mobile Wallets)',
        isTestMode: pipraConfig.sandboxMode,
        enabled: pipraConfig.enabled,
        description: pipraConfig.description,
      });
    }

    return list;
  }

  getSupportedGateways(): Array<{ name: string; label: string; isTestMode?: boolean; enabled?: boolean }> {
    return [
      { name: 'simulator', label: 'Instant Simulator (Test Cards)', isTestMode: true, enabled: true },
      { name: 'stripe', label: 'Credit / Debit Card (Stripe)', enabled: true },
      { name: 'paypal', label: 'PayPal', enabled: true },
      { name: 'manual', label: 'Bank Wire / Offline Transfer', enabled: true },
      { name: 'piprapay', label: 'PipraPay (Cards & Mobile Wallets)', isTestMode: true, enabled: true },
    ];
  }
}
