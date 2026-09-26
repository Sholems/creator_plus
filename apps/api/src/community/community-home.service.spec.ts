import { prisma } from '@creatorplus/database';
import { CommunityHomeService } from './community-home.service';

jest.mock('@creatorplus/database', () => ({
  prisma: { communityPost: { findMany: jest.fn() } },
}));

describe('CommunityHomeService', () => {
  it('returns a bounded next-action summary', async () => {
    const access = { assertAccess: jest.fn().mockResolvedValue({}) } as any;
    const courses = {
      listForMember: jest
        .fn()
        .mockResolvedValue([
          { slug: 'grow', title: 'Grow', locked: false, completedCount: 1, lessonCount: 3 },
        ]),
    } as any;
    const points = { getMyStats: jest.fn().mockResolvedValue({ points: 20, level: 2 }) } as any;
    (prisma.communityPost.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'post-1',
        title: 'Question',
        lastActivityAt: new Date('2026-09-26T00:00:00Z'),
        _count: { comments: 2 },
      },
    ]);
    const result = await new CommunityHomeService(access, courses, points).getHome('user-1');
    expect(result.nextLesson).toMatchObject({ courseSlug: 'grow', completedCount: 1 });
    expect(result.conversations).toHaveLength(1);
    expect(access.assertAccess).toHaveBeenCalledWith('user-1');
  });
});
