import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import Stripe from 'stripe';

@ApiTags('billing-webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private stripe: Stripe;

  constructor(private billingService: BillingService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    });
  }

  @Post('stripe')
  @SkipThrottle()
  @ApiOperation({ summary: 'Handle Stripe billing webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleStripeWebhook(@Req() req: any, @Res() res: any) {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody || req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET_BILLING || '',
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const subscriptionEvents = [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
    ];

    if (subscriptionEvents.includes(event.type)) {
      await this.billingService.handleSubscriptionWebhook(event);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'payment' && session.metadata?.packId) {
        await this.billingService.handleCreditWebhook(event);
      }
    }

    res.json({ received: true });
  }
}
