import { prisma } from '@creatorplus/database';
import { MembershipService } from './membership.service';
import { PaystackSubscriptionProvider } from './providers/paystack-subscription.provider';
import { StripeSubscriptionProvider } from './providers/stripe-subscription.provider';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    membershipSubscription: {
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    membershipPlan: { findFirst: jest.fn() },
    membershipPlanPrice: { findUnique: jest.fn(), update: jest.fn() },
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
