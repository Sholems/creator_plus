import { prisma } from '@creatorplus/database';
import { emailQueue } from '../queues';
import { sweepCommunityDigest } from './community-digest';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    communityPost: { findMany: jest.fn() },
    communityNotificationPreference: { findMany: jest.fn() },
    communityDelivery: { upsert: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../queues', () => ({
  QUEUE_NAMES: { COMMUNITY_DIGEST: 'community-digest' },
  createWorker: jest.fn(() => ({ on: jest.fn(), close: jest.fn() })),
  emailQueue: { add: jest.fn() },
  communityDigestQueue: { add: jest.fn() },
}));

const p = prisma as any;

describe('community digest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends to opted-in free members and records a durable idempotency key', async () => {
    p.communityPost.findMany.mockResolvedValue([
      { id: 'post-1', title: 'A useful idea', author: { displayName: 'Ada' } },
    ]);
    p.communityNotificationPreference.findMany.mockResolvedValue([
      { user: { id: 'user-1', email: 'member@example.com' } },
    ]);
    p.communityDelivery.upsert.mockResolvedValue({ id: 'delivery-1', status: 'PENDING' });
    p.communityDelivery.update.mockResolvedValue({});

    await expect(sweepCommunityDigest(new Date('2026-09-26T08:00:00Z'))).resolves.toEqual({
      newPosts: 1,
      queued: 1,
    });
    expect(p.communityNotificationPreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ digestEmail: true }) }),
    );
    expect(emailQueue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({ to: 'member@example.com' }),
      expect.objectContaining({ jobId: 'community-digest:2026-09-26:user-1' }),
    );
  });

  it('does not enqueue an already queued delivery', async () => {
    p.communityPost.findMany.mockResolvedValue([
      { id: 'post-1', title: 'A useful idea', author: { displayName: 'Ada' } },
    ]);
    p.communityNotificationPreference.findMany.mockResolvedValue([
      { user: { id: 'user-1', email: 'member@example.com' } },
    ]);
    p.communityDelivery.upsert.mockResolvedValue({ id: 'delivery-1', status: 'QUEUED' });

    await expect(sweepCommunityDigest(new Date('2026-09-26T08:00:00Z'))).resolves.toEqual({
      newPosts: 1,
      queued: 0,
    });
    expect(emailQueue.add).not.toHaveBeenCalled();
  });
});
