import { Injectable, BadRequestException } from '@nestjs/common';
import { IPaymentGateway } from './interfaces/payment-gateway.interface';
import { SimulatorGatewayProvider } from './providers/simulator.provider';
import { StripeGatewayProvider } from './providers/stripe.provider';
import { PayPalGatewayProvider } from './providers/paypal.provider';
import { ManualGatewayProvider } from './providers/manual.provider';
import { PaymentGatewayType } from '../../database/schemas/payment-transaction.schema';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly providers = new Map<string, IPaymentGateway>();

  constructor(
    private simulatorProvider: SimulatorGatewayProvider,
    private stripeProvider: StripeGatewayProvider,
    private paypalProvider: PayPalGatewayProvider,
    private manualProvider: ManualGatewayProvider,
  ) {
    this.register(simulatorProvider);
    this.register(stripeProvider);
    this.register(paypalProvider);
    this.register(manualProvider);
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

  getSupportedGateways(): Array<{ name: string; label: string; isTestMode?: boolean }> {
    return [
      { name: 'simulator', label: 'Instant Simulator (Test Cards)', isTestMode: true },
      { name: 'stripe', label: 'Credit / Debit Card (Stripe)' },
      { name: 'paypal', label: 'PayPal' },
      { name: 'manual', label: 'Bank Wire / Offline Transfer' },
    ];
  }
}
