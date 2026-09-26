import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { CommunityAccessService } from './community-access.service';
import {
  UpdateCommunityPreferencesDto,
  UpdateCommunityProfileDto,
} from './dto/community-profile.dto';

const memberSelect = {
  id: true,
  displayName: true,
  avatar: true,
  communityProfile: {
    select: {
      headline: true,
      bio: true,
      expertise: true,
      goals: true,
      links: true,
      visibility: true,
      points: true,
    },
  },
  _count: {
    select: {
      communityPosts: true,
      communityComments: true,
      communityFollowers: true,
      communityFollowing: true,
    },
  },
} as const;

@Injectable()
export class CommunityProfilesService {
  constructor(private readonly access: CommunityAccessService) {}

  async list(viewerId: string, search?: string, cursor?: string) {
    await this.access.assertAccess(viewerId);
    const query = search?.trim().slice(0, 80);
    const items = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        communityProfile: { is: { participationStatus: 'ACTIVE', visibility: { not: 'HIDDEN' } } },
        ...(query
          ? {
              OR: [
                { displayName: { contains: query, mode: 'insensitive' } },
                {
                  communityProfile: { is: { headline: { contains: query, mode: 'insensitive' } } },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ communityProfile: { points: 'desc' } }, { id: 'asc' }],
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: memberSelect,
    });
    const hasMore = items.length > 20;
    const page = items.slice(0, 20);
    return {
      items: page,
      pageInfo: { hasMore, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null },
    };
  }

  async get(viewerId: string, memberId: string) {
    const viewer = await this.access.assertAccess(viewerId);
    const member = await prisma.user.findUnique({ where: { id: memberId }, select: memberSelect });
    if (!member || !member.communityProfile || member.communityProfile.visibility === 'HIDDEN') {
      if (!viewer.isAdmin && viewerId !== memberId) throw new NotFoundException('Member not found');
    }
    const following =
      viewerId === memberId
        ? false
        : !!(await prisma.communityFollow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: memberId } },
          }));
    return { ...member, following, isSelf: viewerId === memberId };
  }

  async updateMe(userId: string, dto: UpdateCommunityProfileDto) {
    await this.access.assertAccess(userId);
    return prisma.communityProfile.upsert({
      where: { userId },
      create: {
        userId,
        headline: dto.headline?.trim() || null,
        bio: dto.bio?.trim() || null,
        expertise: dto.expertise?.slice(0, 12) ?? [],
        goals: dto.goals?.slice(0, 12) ?? [],
        links: dto.links ?? [],
        visibility: dto.visibility ?? 'MEMBERS_ONLY',
      },
      update: {
        ...(dto.headline !== undefined ? { headline: dto.headline.trim() || null } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio.trim() || null } : {}),
        ...(dto.expertise ? { expertise: dto.expertise.slice(0, 12) } : {}),
        ...(dto.goals ? { goals: dto.goals.slice(0, 12) } : {}),
        ...(dto.links ? { links: dto.links.slice(0, 8) } : {}),
        ...(dto.visibility ? { visibility: dto.visibility } : {}),
      },
    });
  }

  async toggleFollow(userId: string, memberId: string) {
    await this.access.assertAccess(userId);
    if (userId === memberId) throw new BadRequestException('You cannot follow yourself');
    await this.access.assertAccess(memberId);
    const key = { followerId_followingId: { followerId: userId, followingId: memberId } };
    const existing = await prisma.communityFollow.findUnique({ where: key });
    if (existing) await prisma.communityFollow.delete({ where: { id: existing.id } });
    else
      await prisma.communityFollow.create({ data: { followerId: userId, followingId: memberId } });
    return { following: !existing };
  }

  async getPreferences(userId: string) {
    await this.access.assertAccess(userId);
    return prisma.communityNotificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePreferences(userId: string, dto: UpdateCommunityPreferencesDto) {
    await this.access.assertAccess(userId);
    return prisma.communityNotificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  async togglePostRelation(userId: string, postId: string, kind: 'bookmark' | 'subscription') {
    await this.access.assertAccess(userId);
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    const model = kind === 'bookmark' ? prisma.communityBookmark : prisma.communitySubscription;
    const keyName = kind === 'bookmark' ? 'userId_postId' : 'userId_postId';
    const where = { [keyName]: { userId, postId } } as any;
    const existing = await (model as any).findUnique({ where });
    if (existing) await (model as any).delete({ where: { id: existing.id } });
    else await (model as any).create({ data: { userId, postId } });
    return { active: !existing };
  }
}
