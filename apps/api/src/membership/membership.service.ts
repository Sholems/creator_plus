import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { prisma, MembershipStatus, Prisma } from '@creatorplus/database';
import { SettingsService } from '../settings/settings.service';
import { PaystackSubscriptionProvider } from './providers/paystack-subscription.provider';
import { StripeSubscriptionProvider } from './providers/stripe-subscription.provider';
import { SubscriptionEvent, SubscriptionProvider } from './providers/subscription-provider.interface';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE_STATUSES: MembershipStatus[] = ['ACTIVE', 'PAST_DUE'];

@Injectable()
export class MembershipService implements OnModuleInit {
  private readonly logger = new Logger(MembershipService.name);
  private providers: Record<string, SubscriptionProvider> = {};

  constructor(private readonly settings: SettingsService) {}

  async onModuleInit() {
    await this.reloadProviders();
    await this.ensureDefaultPlan().catch((err) =>
      this.logger.warn(`[membership] default plan bootstrap skipped: ${(err as Error).message}`),
    );
  }

  /**
   * Idempotently create the single all-access membership tier the first time
   * the app boots, priced per provider/currency. Amounts are overridable via
   * env; provider plan codes are created lazily at first checkout.
   */
  private async ensureDefaultPlan() {
    const existing = await prisma.membershipPlan.findFirst();
    if (existing) return;
    const num = (key: string, fallback: number) => Number(process.env[key]) || fallback;
    await prisma.membershipPlan.create({
      data: {
        name: process.env.MEMBERSHIP_PLAN_NAME || 'Community Membership',
        description: 'All-access pass to the community — every course, lesson, and discussion.',
        prices: {
          create: [
            { provider: 'paystack', currency: 'NGN', interval: 'MONTHLY', amount: num('MEMBERSHIP_NGN_MONTHLY', 5000) },
            { provider: 'paystack', currency: 'NGN', interval: 'ANNUAL', amount: num('MEMBERSHIP_NGN_ANNUAL', 50000) },
            { provider: 'stripe', currency: 'USD', interval: 'MONTHLY', amount: num('MEMBERSHIP_USD_MONTHLY', 5) },
            { provider: 'stripe', currency: 'USD', interval: 'ANNUAL', amount: num('MEMBERSHIP_USD_ANNUAL', 50) },
          ],
        },
      },
    });
    this.logger.log('[membership] created default all-access membership plan');
  }

  async reloadProviders() {
    const paystack = await this.settings.getPaystackConfig().catch(() => ({ secretKey: '' }) as any);
    this.providers = {
      paystack: new PaystackSubscriptionProvider(paystack.secretKey),
      stripe: new StripeSubscriptionProvider(),
    };
  }

  private getProvider(name: string): SubscriptionProvider {
    const provider = this.providers[(name || '').toLowerCase()];
    if (!provider) throw new BadRequestException(`Unknown subscription provider "${name}"`);
    return provider;
  }

  // --- Access -------------------------------------------------------------

  /** The single gate for all community content. */
  async hasActiveMembership(userId: string): Promise<boolean> {
    const count = await prisma.membershipSubscription.count({
      where: { userId, status: { in: ACTIVE_STATUSES }, currentPeriodEnd: { gt: new Date() } },
    });
    return count > 0;
  }

  async getMySubscription(userId: string) {
    const sub = await prisma.membershipSubscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, price: true },
    });
    return {
      active: await this.hasActiveMembership(userId),
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            provider: sub.provider,
            interval: sub.price.interval,
            currency: sub.price.currency,
            amount: Number(sub.price.amount),
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          }
        : null,
    };
  }

  // --- Public plans -------------------------------------------------------

  async listPublicPlans() {
    const plan = await prisma.membershipPlan.findFirst({
      where: { isActive: true },
      include: { prices: { where: { isActive: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (!plan) return { plan: null, prices: [] as any[] };
    return {
      plan: { id: plan.id, name: plan.name, description: plan.description },
      prices: plan.prices.map((p) => ({
        id: p.id,
        provider: p.provider,
        currency: p.currency,
        interval: p.interval,
        amount: Number(p.amount),
      })),
    };
  }

  // --- Checkout -----------------------------------------------------------

  async startCheckout(userId: string, dto: { priceId: string; successUrl?: string; cancelUrl?: string }) {
    const price = await prisma.membershipPlanPrice.findUnique({ where: { id: dto.priceId }, include: { plan: true } });
    if (!price || !price.isActive || !price.plan.isActive) throw new NotFoundException('Membership plan not available');

    const provider = this.getProvider(price.provider);
    if (!provider.isConfigured()) throw new BadRequestException(`${price.provider} is not configured on this server`);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (await this.hasActiveMembership(userId)) {
      throw new BadRequestException('You already have an active membership');
    }

    // Lazily create the provider plan/price the first time it's needed.
    let planCode = price.providerPlanCode;
    if (!planCode) {
      planCode = await provider.ensurePlan({
        name: price.plan.name,
        amountMajor: Number(price.amount),
        currency: price.currency,
        interval: price.interval,
      });
      await prisma.membershipPlanPrice.update({ where: { id: price.id }, data: { providerPlanCode: planCode } });
    }

    const sub = await prisma.membershipSubscription.create({
      data: { userId, planId: price.planId, priceId: price.id, provider: price.provider, status: 'PENDING' },
    });

    const base = process.env.WEB_APP_URL || process.env.APP_URL || '';
    const result = await provider.startSubscription({
      subscriptionId: sub.id,
      customerEmail: user.email,
      planCode,
      amountMajor: Number(price.amount),
      currency: price.currency,
      interval: price.interval,
      successUrl: dto.successUrl || `${base}/community?welcome=1`,
      cancelUrl: dto.cancelUrl || `${base}/community/join?canceled=1`,
    });

    await prisma.membershipSubscription.update({ where: { id: sub.id }, data: { providerReference: result.providerReference } });
    return { redirectUrl: result.redirectUrl, subscriptionId: sub.id };
  }

  async cancel(userId: string) {
    const sub = await prisma.membershipSubscription.findFirst({
      where: { userId, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
    if (!sub) throw new NotFoundException('No active membership to cancel');
    if (sub.providerSubscriptionId) {
      try {
        await this.getProvider(sub.provider).cancelSubscription(sub.providerSubscriptionId);
      } catch (err) {
        this.logger.error(`[cancel] provider cancel failed: ${(err as Error).message}`);
      }
    }
    await prisma.membershipSubscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
    return { cancelAtPeriodEnd: true, currentPeriodEnd: sub.currentPeriodEnd };
  }

  // --- Webhooks -----------------------------------------------------------

  /** Verify + handle (used by the membership's own webhook endpoint). */
  async handleWebhook(providerName: string, rawBody: any, signature?: string) {
    const provider = this.providers[(providerName || '').toLowerCase()];
    if (!provider) return;
    if (!provider.verifyWebhook(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }
    const payload = typeof rawBody === 'string' || Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString()) : rawBody;
    await this.handleVerifiedWebhook(providerName, payload);
  }

  /** Handle an already-verified payload (used when the payments webhook delegates). */
  async handleVerifiedWebhook(providerName: string, payload: any) {
    const provider = this.providers[(providerName || '').toLowerCase()];
    if (!provider) return;
    const event = provider.parseSubscriptionEvent(payload);
    if (!event) return;
    const sub = await this.findByEvent(providerName, event);
    if (!sub) {
      this.logger.warn(`[webhook:${providerName}] ${event.type} did not match any membership subscription`);
      return;
    }
    await this.applyEvent(sub.id, sub.status, sub.providerSubscriptionId, sub.providerCustomerId, event);
  }

  private async findByEvent(providerName: string, event: SubscriptionEvent) {
    if (event.providerSubscriptionId) {
      const s = await prisma.membershipSubscription.findFirst({
        where: { provider: providerName, providerSubscriptionId: event.providerSubscriptionId },
      });
      if (s) return s;
    }
    if (event.providerReference) {
      const or: Prisma.MembershipSubscriptionWhereInput[] = [{ providerReference: event.providerReference }];
      if (UUID_RE.test(event.providerReference)) or.push({ id: event.providerReference });
      const s = await prisma.membershipSubscription.findFirst({ where: { provider: providerName, OR: or } });
      if (s) return s;
    }
    if (event.providerCustomerId) {
      const s = await prisma.membershipSubscription.findFirst({
        where: { provider: providerName, providerCustomerId: event.providerCustomerId },
        orderBy: { createdAt: 'desc' },
      });
      if (s) return s;
    }
    if (event.customerEmail) {
      const user = await prisma.user.findUnique({ where: { email: event.customerEmail.toLowerCase() } });
      if (user) {
        const s = await prisma.membershipSubscription.findFirst({
          where: { userId: user.id, provider: providerName },
          orderBy: { createdAt: 'desc' },
        });
        if (s) return s;
      }
    }
    return null;
  }

  private async applyEvent(
    id: string,
    currentStatus: MembershipStatus,
    existingSubId: string | null,
    existingCustomerId: string | null,
    event: SubscriptionEvent,
  ) {
    const data: Prisma.MembershipSubscriptionUpdateInput = {};
    if (event.providerSubscriptionId && !existingSubId) data.providerSubscriptionId = event.providerSubscriptionId;
    if (event.providerCustomerId && !existingCustomerId) data.providerCustomerId = event.providerCustomerId;
    if (event.currentPeriodEnd) data.currentPeriodEnd = event.currentPeriodEnd;
    if (typeof event.cancelAtPeriodEnd === 'boolean') data.cancelAtPeriodEnd = event.cancelAtPeriodEnd;

    switch (event.type) {
      case 'activated':
      case 'renewed':
        if (currentStatus !== 'CANCELED') data.status = 'ACTIVE';
        break;
      case 'past_due':
        data.status = 'PAST_DUE';
        break;
      case 'canceled':
        data.status = 'CANCELED';
        data.canceledAt = new Date();
        break;
    }
    await prisma.membershipSubscription.update({ where: { id }, data });
  }

  // --- Maintenance --------------------------------------------------------

  /** Expire lapsed subscriptions. Called by the daily worker sweep. */
  async expireLapsed(graceDays = 3): Promise<number> {
    const now = new Date();
    const graceCut = new Date(now.getTime() - graceDays * 86_400_000);
    const res = await prisma.membershipSubscription.updateMany({
      where: {
        OR: [
          { status: 'PAST_DUE', currentPeriodEnd: { lt: graceCut } },
          { status: { in: ['ACTIVE', 'CANCELED'] }, cancelAtPeriodEnd: true, currentPeriodEnd: { lt: now } },
        ],
      },
      data: { status: 'EXPIRED' },
    });
    return res.count;
  }
}
