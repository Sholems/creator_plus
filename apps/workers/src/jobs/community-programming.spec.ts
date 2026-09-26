import { prisma } from '@creatorplus/database';
import { emailQueue } from '../queues';
import { sweepCommunityProgramming } from './community-programming';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    communityEvent: { findMany: jest.fn() },
    communityDelivery: { findUnique: jest.fn(), upsert: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    notification: { create: jest.fn() },
    membershipSubscription: { findMany: jest.fn() },
  },
}));

jest.mock('../queues', () => ({
  QUEUE_NAMES: { COMMUNITY_PROGRAMMING: 'community-programming' },
  createWorker: jest.fn(() => ({ on: jest.fn(), close: jest.fn() })),
  emailQueue: { add: jest.fn() },
  communityProgrammingQueue: { add: jest.fn() },
}));

const p = prisma as any;
const NOW = new Date('2026-09-26T12:00:00Z');
const in30min = new Date(NOW.getTime() + 30 * 60 * 1000);

function goingRsvp(over: Partial<any> = {}) {
  return {
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'member@example.com',
      status: 'ACTIVE',
      communityProfile: { participationStatus: 'ACTIVE' },
      communityNotificationPreference: { reminderEmail: true, inAppEnabled: true },
      ...over,
    },
  };
}

describe('community programming worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    p.communityEvent.findMany.mockResolvedValue([]); // default: nothing
    p.communityDelivery.updateMany.mockResolvedValue({ count: 0 });
  });

  it('delivers a due reminder once and records an idempotency key (AE7)', async () => {
    // Reminder pass returns the event; cancellation pass returns none.
    p.communityEvent.findMany
      .mockResolvedValueOnce([{ id: 'ev-1', slug: 'launch', title: 'Launch Call', accessLevel: 'FREE', startsAt: in30min, rsvps: [goingRsvp()] }])
      .mockResolvedValueOnce([]);
    p.communityDelivery.findUnique.mockResolvedValue(null);
    p.communityDelivery.upsert.mockResolvedValue({ id: 'd-1', status: 'PENDING' });
    p.communityDelivery.update.mockResolvedValue({});

    const res = await sweepCommunityProgramming(NOW);
    expect(res).toEqual({ reminders: 1, cancellations: 0 });
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({ to: 'member@example.com' }),
      expect.objectContaining({ jobId: 'event-reminder:ev-1:1h:user-1' }),
    );
    expect(p.notification.create).toHaveBeenCalledTimes(1);
  });

  it('does not resend a reminder already delivered (retry safety)', async () => {
    p.communityEvent.findMany
      .mockResolvedValueOnce([{ id: 'ev-1', slug: 'launch', title: 'Launch Call', accessLevel: 'FREE', startsAt: in30min, rsvps: [goingRsvp()] }])
      .mockResolvedValueOnce([]);
    p.communityDelivery.findUnique.mockResolvedValue({ id: 'd-1', status: 'DELIVERED' });

    const res = await sweepCommunityProgramming(NOW);
    expect(res).toEqual({ reminders: 0, cancellations: 0 });
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('suppresses a premium reminder when the member lost entitlement', async () => {
    p.communityEvent.findMany
      .mockResolvedValueOnce([{ id: 'ev-1', slug: 'vip', title: 'VIP Session', accessLevel: 'PREMIUM', startsAt: in30min, rsvps: [goingRsvp()] }])
      .mockResolvedValueOnce([]);
    p.membershipSubscription.findMany.mockResolvedValue([]); // no active membership
    p.communityDelivery.findUnique.mockResolvedValue(null);
    p.communityDelivery.upsert.mockResolvedValue({ id: 'd-sup', status: 'SUPPRESSED' });

    const res = await sweepCommunityProgramming(NOW);
    expect(res).toEqual({ reminders: 0, cancellations: 0 });
    expect(emailQueue.add).not.toHaveBeenCalled();
    expect(p.communityDelivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: 'SUPPRESSED', reason: 'ineligible' }) }),
    );
  });

  it('sends exactly one cancellation notice and suppresses pending reminders (AE6)', async () => {
    p.communityEvent.findMany
      .mockResolvedValueOnce([]) // reminder pass: none
      .mockResolvedValueOnce([{ id: 'ev-2', slug: 'gone', title: 'Cancelled Call', accessLevel: 'FREE', startsAt: in30min, rsvps: [goingRsvp()] }]);
    p.communityDelivery.findUnique.mockResolvedValue(null); // no prior cancel notice
    p.communityDelivery.create.mockResolvedValue({ id: 'd-c', status: 'PENDING' });
    p.communityDelivery.update.mockResolvedValue({});

    const res = await sweepCommunityProgramming(NOW);
    expect(res).toEqual({ reminders: 0, cancellations: 1 });
    expect(p.communityDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUPPRESSED', reason: 'event_cancelled' }) }),
    );
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({ subject: expect.stringContaining('Cancelled') }),
      expect.objectContaining({ jobId: 'event-cancel:ev-2:user-1' }),
    );
  });
});
