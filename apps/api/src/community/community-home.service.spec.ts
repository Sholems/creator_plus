import { prisma } from '@creatorplus/database';
import { CommunityHomeService } from './community-home.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    communityPost: { findMany: jest.fn(), count: jest.fn() },
    communityProfile: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    lessonProgress: { count: jest.fn() },
    communityFollow: { count: jest.fn() },
    qrCampaign: { count: jest.fn() },
  },
}));

const p = prisma as any;

function make(points: any = { getMyStats: jest.fn(), award: jest.fn() }) {
  const access = { assertAccess: jest.fn().mockResolvedValue({}) } as any;
  const courses = { listForMember: jest.fn().mockResolvedValue([]) } as any;
  return { svc: new CommunityHomeService(access, courses, points), points, access };
}

describe('CommunityHomeService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a bounded next-action summary', async () => {
    const access = { assertAccess: jest.fn().mockResolvedValue({}) } as any;
    const courses = {
      listForMember: jest.fn().mockResolvedValue([
        { slug: 'grow', title: 'Grow', locked: false, completedCount: 1, lessonCount: 3 },
      ]),
    } as any;
    const points = { getMyStats: jest.fn().mockResolvedValue({ points: 20, level: 2 }) } as any;
    p.communityPost.findMany.mockResolvedValue([
      { id: 'post-1', title: 'Question', lastActivityAt: new Date('2026-09-26T00:00:00Z'), _count: { comments: 2 } },
    ]);
    const result = await new CommunityHomeService(access, courses, points).getHome('user-1');
    expect(result.nextLesson).toMatchObject({ courseSlug: 'grow', completedCount: 1 });
    expect(result.conversations).toHaveLength(1);
  });

  it('starts a streak at 1 and awards a daily check-in for a first visit', async () => {
    const { svc, points } = make();
    p.communityProfile.upsert.mockResolvedValue({});
    p.communityProfile.findUnique.mockResolvedValue({ lastActiveOn: null, currentStreak: 0, longestStreak: 0 });
    p.communityProfile.update.mockResolvedValue({});
    const res = await svc.recordVisit('user-1');
    expect(res.currentStreak).toBe(1);
    expect(points.award).toHaveBeenCalledWith('user-1', 'DAILY_CHECKIN', expect.any(String));
  });

  it('does not double-count a streak or re-award on the same day', async () => {
    const { svc, points } = make();
    p.communityProfile.upsert.mockResolvedValue({});
    p.communityProfile.findUnique.mockResolvedValue({ lastActiveOn: new Date(), currentStreak: 5, longestStreak: 7 });
    const res = await svc.recordVisit('user-1');
    expect(res.currentStreak).toBe(5);
    expect(p.communityProfile.update).not.toHaveBeenCalled();
    expect(points.award).not.toHaveBeenCalled();
  });

  it('builds the onboarding checklist from real data and does not award until complete', async () => {
    const { svc, points } = make();
    p.communityProfile.findUnique.mockResolvedValue({ headline: 'Builder', bio: null });
    p.communityPost.count.mockResolvedValue(1);
    p.lessonProgress.count.mockResolvedValue(0);
    p.communityFollow.count.mockResolvedValue(2);
    p.qrCampaign.count.mockResolvedValue(0);
    const res = await svc.getOnboarding('user-1');
    expect(res.complete).toBe(false);
    expect(res.completedCount).toBe(2); // profile + post
    expect(points.award).not.toHaveBeenCalled();
  });
});
