import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { CommunityFeedService } from './community-feed.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    communityPost: { findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    communityPostLike: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), count: jest.fn() },
    userRole: { findMany: jest.fn() },
  },
}));

const p = prisma as any;

function makeService(isMember: boolean) {
  const membership = { hasActiveMembership: jest.fn().mockResolvedValue(isMember) } as any;
  const points = { award: jest.fn(), revoke: jest.fn() } as any;
  return new CommunityFeedService(membership, points);
}

describe('CommunityFeedService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks non-members from the feed', async () => {
    const svc = makeService(false);
    await expect(svc.listPosts('u1', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('adds a like when none exists and reports the new count', async () => {
    const svc = makeService(true);
    p.communityPost.findUnique.mockResolvedValue({ authorId: 'author1' });
    p.communityPostLike.findUnique.mockResolvedValue(null);
    p.communityPostLike.create.mockResolvedValue({ id: 'like1' });
    p.communityPostLike.count.mockResolvedValue(1);
    const res = await svc.toggleLike('u1', 'post1');
    expect(p.communityPostLike.create).toHaveBeenCalled();
    expect(res).toEqual({ likedByMe: true, likeCount: 1 });
  });

  it('forbids deleting a post you do not own (and are not admin for)', async () => {
    const svc = makeService(true);
    p.communityPost.findUnique.mockResolvedValue({ id: 'post1', authorId: 'someoneElse' });
    p.userRole.findMany.mockResolvedValue([]); // not an admin
    await expect(svc.deletePost('u1', 'post1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(p.communityPost.delete).not.toHaveBeenCalled();
  });
});
