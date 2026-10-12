import { prisma } from '@creatorplus/database';
import { MembershipService } from './membership.service';
import { PaystackSubscriptionProvider } from './providers/paystack-subscription.provider';
import { StripeSubscriptionProvider } from './providers/stripe-subscription.provider';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    membershipSubscription: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    membershipPlan: { findFirst: jest.fn() },
    membershipPlanPrice: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
  },
  MembershipStatus: {},
  Prisma: {},
}));

const p = prisma as any;

function makeService(fakeProvider: any) {
  const svc = new MembershipService({ getPaystackConfig: async () => ({ secretKey: '' }) } as any);
  (svc as any).providers = { paystack: fakeProvider, stripe: fakeProvider };
  return svc;
}

describe('MembershipService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('grants access only for an active/past-due subscription within its period', async () => {
    const svc = makeService({});
    p.membershipSubscription.count.mockResolvedValueOnce(1);
    expect(await svc.hasActiveMembership('u1')).toBe(true);
    p.membershipSubscription.count.mockResolvedValueOnce(0);
    expect(await svc.hasActiveMembership('u2')).toBe(false);
    // The query filters to ACTIVE/PAST_DUE with a future period end.
    const where = p.membershipSubscription.count.mock.calls[0][0].where;
    expect(where.status.in).toEqual(['ACTIVE', 'PAST_DUE']);
    expect(where.currentPeriodEnd.gt).toBeInstanceOf(Date);
  });

  it('activates a subscription on first charge and stamps the period end', async () => {
    const periodEnd = new Date('2026-10-11T00:00:00Z');
    const provider = {
      parseSubscriptionEvent: () => ({
        type: 'activated',
        providerReference: 'MBR_1',
        providerSubscriptionId: 'SUB_9',
        currentPeriodEnd: periodEnd,
      }),
    };
    const svc = makeService(provider);
    p.membershipSubscription.findFirst.mockResolvedValueOnce({ id: 's1', status: 'PENDING', providerSubscriptionId: null, providerCustomerId: null });

    await svc.handleVerifiedWebhook('paystack', {});

    const update = p.membershipSubscription.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 's1' });
    expect(update.data.status).toBe('ACTIVE');
    expect(update.data.providerSubscriptionId).toBe('SUB_9');
    expect(update.data.currentPeriodEnd).toBe(periodEnd);
  });

  it('marks a subscription past due on a failed charge', async () => {
    const provider = { parseSubscriptionEvent: () => ({ type: 'past_due', providerSubscriptionId: 'SUB_9' }) };
    const svc = makeService(provider);
    p.membershipSubscription.findFirst.mockResolvedValueOnce({ id: 's1', status: 'ACTIVE', providerSubscriptionId: 'SUB_9', providerCustomerId: null });
    await svc.handleVerifiedWebhook('paystack', {});
    expect(p.membershipSubscription.update.mock.calls[0][0].data.status).toBe('PAST_DUE');
  });

  it('cancels a subscription and stamps canceledAt', async () => {
    const provider = { parseSubscriptionEvent: () => ({ type: 'canceled', providerSubscriptionId: 'SUB_9' }) };
    const svc = makeService(provider);
    p.membershipSubscription.findFirst.mockResolvedValueOnce({ id: 's1', status: 'ACTIVE', providerSubscriptionId: 'SUB_9', providerCustomerId: null });
    await svc.handleVerifiedWebhook('paystack', {});
    const data = p.membershipSubscription.update.mock.calls[0][0].data;
    expect(data.status).toBe('CANCELED');
    expect(data.canceledAt).toBeInstanceOf(Date);
  });

  describe('switchToAnnual', () => {
    const monthly = {
      id: 's1',
      userId: 'u1',
      planId: 'plan1',
      provider: 'stripe',
      providerSubscriptionId: 'sub_1',
      price: { interval: 'MONTHLY', currency: 'USD' },
      plan: { name: 'CreatorPlus Community Pro' },
    };
    const annualPrice = { id: 'price_y', amount: 50, currency: 'USD', interval: 'ANNUAL', providerPlanCode: 'price_stripe_y' };

    it('swaps the Stripe price in place', async () => {
      const end = new Date('2027-10-12T00:00:00Z');
      const provider = { changePlan: jest.fn().mockResolvedValue({ currentPeriodEnd: end }) };
      const svc = makeService(provider);
      p.membershipSubscription.findFirst.mockResolvedValueOnce(monthly);
      p.membershipPlanPrice.findFirst.mockResolvedValueOnce(annualPrice);

      expect(await svc.switchToAnnual('u1')).toEqual({ switched: true });
      expect(provider.changePlan).toHaveBeenCalledWith('sub_1', 'price_stripe_y');
      const data = p.membershipSubscription.update.mock.calls[0][0].data;
      expect(data).toMatchObject({ priceId: 'price_y', cancelAtPeriodEnd: false, currentPeriodEnd: end });
    });

    it('falls back to a fresh annual checkout when the provider cannot change plans', async () => {
      const provider = {
        isConfigured: () => true,
        startSubscription: jest.fn().mockResolvedValue({ redirectUrl: 'https://pay/annual', providerReference: 'ref' }),
      };
      const svc = makeService(provider);
      p.membershipSubscription.findFirst.mockResolvedValueOnce({ ...monthly, provider: 'paystack', price: { interval: 'MONTHLY', currency: 'NGN' } });
      p.membershipPlanPrice.findFirst.mockResolvedValueOnce({ ...annualPrice, currency: 'NGN', provider: 'paystack' });
      p.membershipPlanPrice.findUnique.mockResolvedValueOnce({
        ...annualPrice, provider: 'paystack', planId: 'plan1', isActive: true, plan: { isActive: true, name: 'Pro' },
      });
      p.user.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'a@b.c' });
      p.membershipSubscription.create.mockResolvedValueOnce({ id: 's2' });

      const res = await svc.switchToAnnual('u1');
      expect(res).toMatchObject({ switched: false, redirectUrl: 'https://pay/annual' });
      // The active monthly does not block the upgrade checkout.
      expect(p.membershipSubscription.count).not.toHaveBeenCalled();
    });

    it('rejects a membership that is already annual', async () => {
      const svc = makeService({});
      p.membershipSubscription.findFirst.mockResolvedValueOnce({ ...monthly, price: { interval: 'ANNUAL', currency: 'USD' } });
      await expect(svc.switchToAnnual('u1')).rejects.toThrow(/already billed annually/);
    });

    it('stops the superseded monthly once the new annual activates', async () => {
      const provider = {
        parseSubscriptionEvent: () => ({ type: 'activated', providerReference: 'ref', providerSubscriptionId: 'SUB_Y' }),
        cancelSubscription: jest.fn().mockResolvedValue(undefined),
      };
      const svc = makeService(provider);
      p.membershipSubscription.findFirst.mockResolvedValueOnce({ id: 's2', status: 'PENDING', providerSubscriptionId: null, providerCustomerId: null });
      p.membershipSubscription.findUnique.mockResolvedValueOnce({ id: 's2', userId: 'u1' });
      p.membershipSubscription.findMany.mockResolvedValueOnce([{ id: 's1', provider: 'paystack', providerSubscriptionId: 'SUB_M' }]);

      await svc.handleVerifiedWebhook('paystack', {});

      expect(provider.cancelSubscription).toHaveBeenCalledWith('SUB_M');
      expect(p.membershipSubscription.update).toHaveBeenLastCalledWith({ where: { id: 's1' }, data: { cancelAtPeriodEnd: true } });
    });
  });

  it('expireLapsed sweeps past-due-past-grace and canceled-at-period-end rows', async () => {
    const svc = makeService({});
    p.membershipSubscription.updateMany.mockResolvedValueOnce({ count: 3 });
    const n = await svc.expireLapsed(3);
    expect(n).toBe(3);
    expect(p.membershipSubscription.updateMany.mock.calls[0][0].data).toEqual({ status: 'EXPIRED' });
  });
});

describe('PaystackSubscriptionProvider.parseSubscriptionEvent', () => {
  const provider = new PaystackSubscriptionProvider('sk_test');

  it('treats a first membership charge as activation and a plain order charge as N/A', () => {
    const first = provider.parseSubscriptionEvent({
      event: 'charge.success',
      data: { reference: 'MBR_1', plan: { plan_code: 'PLN_1', interval: 'monthly' }, metadata: { purpose: 'membership', subscriptionId: 's1' }, customer: { customer_code: 'CUS_1' }, paid_at: '2026-09-11T00:00:00Z' },
    });
    expect(first).toMatchObject({ type: 'activated', providerReference: 'MBR_1', providerCustomerId: 'CUS_1' });
    // A one-time order charge (no plan) must not be captured as a subscription.
    expect(provider.parseSubscriptionEvent({ event: 'charge.success', data: { reference: 'CM_9' } })).toBeNull();
  });

  it('maps disable to cancellation', () => {
    expect(provider.parseSubscriptionEvent({ event: 'subscription.disable', data: { subscription_code: 'SUB_9' } }))
      .toMatchObject({ type: 'canceled', providerSubscriptionId: 'SUB_9' });
  });
});

describe('StripeSubscriptionProvider.parseSubscriptionEvent', () => {
  const provider = new StripeSubscriptionProvider();

  it('activates from a subscription checkout session and correlates by client_reference_id', () => {
    const evt = provider.parseSubscriptionEvent({
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', client_reference_id: 's1', subscription: 'sub_123', customer: 'cus_123' } },
    });
    expect(evt).toMatchObject({ type: 'activated', providerReference: 's1', providerSubscriptionId: 'sub_123', providerCustomerId: 'cus_123' });
    // A one-time payment session is ignored by the subscription parser.
    expect(provider.parseSubscriptionEvent({ type: 'checkout.session.completed', data: { object: { mode: 'payment' } } })).toBeNull();
  });
});
