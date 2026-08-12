import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PaymentProvider } from './payment-provider.interface';
import { StripeProvider } from './stripe.provider';
import { PaystackProvider } from './paystack.provider';
import { FlutterwaveProvider } from './flutterwave.provider';
import { SettingsService } from '../../settings/settings.service';

export type ProviderName = 'paystack' | 'flutterwave' | 'stripe';

@Injectable()
export class PaymentProviderFactory implements OnModuleInit {
  private providers: Record<string, PaymentProvider> = {};
  private paystackEnabled = false;

  constructor(private readonly settings: SettingsService) {}

  async onModuleInit() {
    await this.reload();
  }

  /**
   * (Re)build providers from current config. Paystack's secret comes from the
   * SettingsService (DB → env). Call after an admin updates payment settings so
   * the change takes effect immediately, without a server restart.
   */
  async reload() {
    const paystack = await this.settings.getPaystackConfig();
    this.providers = {
      paystack: new PaystackProvider(paystack.secretKey),
      flutterwave: new FlutterwaveProvider(),
      stripe: new StripeProvider(),
    };
    this.paystackEnabled = paystack.enabled && !!paystack.secretKey;
  }

  get(name?: string): PaymentProvider {
    const key = (name || '').toLowerCase().trim();

    if (key) {
      const provider = this.providers[key];
      if (provider) {
        return provider;
      }
      throw new BadRequestException(
        `Unknown payment provider "${name}". Choose one of: ${this.listAvailable().join(', ')}`,
      );
    }

    // No provider requested: fall back to the first configured provider in priority order.
    const available = this.listAvailable();
    if (available.length === 0) {
      throw new BadRequestException('No payment provider is configured on this server');
    }
    return this.providers[available[0]];
  }

  /** Providers that are configured and enabled, in priority order. */
  listAvailable(): ProviderName[] {
    const available: ProviderName[] = [];
    // Paystack availability comes from settings (DB → env), resolved on reload.
    if (this.paystackEnabled) available.push('paystack');
    if (process.env.FLUTTERWAVE_SECRET_KEY) available.push('flutterwave');
    if (process.env.STRIPE_SECRET_KEY) available.push('stripe');
    return available;
  }
}
