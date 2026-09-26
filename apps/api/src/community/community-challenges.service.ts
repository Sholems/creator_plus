import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { assertOwnStorageUrl } from '../qr-studio/qr-content-validation';
import { CommunityAccessService } from './community-access.service';
import { CommunityPointsService } from './community-points.service';
import { sanitizeCommunityHtml } from './community-rich-content';
import {
  ChallengeCheckInDto,
  CreateChallengeMilestoneDto,
  CreateCommunityChallengeDto,
  UpdateCommunityChallengeDto,
} from './dto/community-challenge.dto';

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'challenge'
  );
}

@Injectable()
export class CommunityChallengesService {
  constructor(
    private readonly access: CommunityAccessService,
    private readonly points: CommunityPointsService,
  ) {}

  private async uniqueSlug(value: string, ignoreId?: string) {
    const root = slugify(value);
    let candidate = root;
    let suffix = 1;
    while (
      await prisma.communityChallenge.findFirst({
        where: { slug: candidate, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
        select: { id: true },
      })
    )
      candidate = `${root}-${++suffix}`;
    return candidate;
  }

  async list(userId: string) {
    const member = await this.access.assertAccess(userId);
    const challenges = await prisma.communityChallenge.findMany({
      where: { published: true },
      orderBy: { startsAt: 'desc' },
      include: {
        enrollments: { where: { userId }, select: { status: true } },
        _count: { select: { enrollments: true, milestones: true } },
      },
    });
    let premium = member.isAdmin;
    if (!premium && challenges.some((item) => item.accessLevel === 'PREMIUM'))
      premium = Boolean(
        await this.access.assertAccess(userId, { accessLevel: 'PREMIUM' }).catch(() => null),
      );
    return challenges.map((item) => ({
      ...item,
      locked: item.accessLevel === 'PREMIUM' && !premium,
      enrollmentStatus: item.enrollments[0]?.status ?? null,
      memberCount: item._count.enrollments,
      milestoneCount: item._count.milestones,
      enrollments: undefined,
      _count: undefined,
    }));
  }

  async get(userId: string, slug: string) {
    const challenge = await prisma.communityChallenge.findFirst({
      where: { slug, published: true },
      include: {
        milestones: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        enrollments: {
          where: { userId },
          include: { group: true, checkIns: { orderBy: { createdAt: 'desc' } } },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    await this.access.assertAccess(userId, { accessLevel: challenge.accessLevel });
    const enrollment = challenge.enrollments[0] ?? null;
    return {
      ...challenge,
      enrollment,
      memberCount: challenge._count.enrollments,
      enrollments: undefined,
      _count: undefined,
    };
  }

  async join(userId: string, challengeId: string) {
    const challenge = await prisma.communityChallenge.findFirst({
      where: { id: challengeId, published: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');
    await this.access.assertAccess(userId, { accessLevel: challenge.accessLevel });
    return prisma.$transaction(
      async (tx) => {
        const existing = await tx.communityChallengeEnrollment.findUnique({
          where: { challengeId_userId: { challengeId, userId } },
        });
        if (existing)
          return tx.communityChallengeEnrollment.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE' },
            include: { group: true },
          });
        const groups = await tx.communityAccountabilityGroup.findMany({
          where: { challengeId },
          orderBy: { createdAt: 'asc' },
          include: { _count: { select: { enrollments: { where: { status: 'ACTIVE' } } } } },
        });
        let group = groups.find((item) => item._count.enrollments < item.capacity);
        if (!group)
          group = await tx.communityAccountabilityGroup.create({
            data: { challengeId, name: `Accountability group ${groups.length + 1}` },
            include: { _count: { select: { enrollments: true } } },
          });
        return tx.communityChallengeEnrollment.create({
          data: { challengeId, userId, groupId: group.id },
          include: { group: true },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async checkIn(userId: string, challengeId: string, dto: ChallengeCheckInDto) {
    const enrollment = await prisma.communityChallengeEnrollment.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE')
      throw new BadRequestException('Join the challenge before checking in');
    if (dto.milestoneId) {
      const milestone = await prisma.communityChallengeMilestone.findFirst({
        where: { id: dto.milestoneId, challengeId },
      });
      if (!milestone) throw new BadRequestException('Milestone not found in this challenge');
    }
    const checkIn = await prisma.communityChallengeCheckIn.create({
      data: {
        enrollmentId: enrollment.id,
        milestoneId: dto.milestoneId || null,
        note: dto.note?.trim() || null,
        progress: dto.progress,
      },
    });
    if (dto.progress === 100)
      await prisma.communityChallengeEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    await this.points.award(userId, 'CHALLENGE_CHECK_IN', checkIn.id);
    return checkIn;
  }

  async adminList() {
    return prisma.communityChallenge.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true, milestones: true } } },
    });
  }

  private fields(dto: CreateCommunityChallengeDto | UpdateCommunityChallengeDto) {
    const data: Record<string, any> = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) {
      const value = dto.description.trim();
      data.description = value
        ? dto.descriptionFormat === 'RICH_HTML'
          ? sanitizeCommunityHtml(value)
          : value
        : null;
    }
    if (dto.descriptionFormat !== undefined) data.descriptionFormat = dto.descriptionFormat;
    if (dto.accessLevel !== undefined) data.accessLevel = dto.accessLevel;
    if (dto.coverImage !== undefined)
      data.coverImage = dto.coverImage ? assertOwnStorageUrl(dto.coverImage) : null;
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) data.endsAt = new Date(dto.endsAt);
    if (dto.published !== undefined) data.published = dto.published;
    return data;
  }

  async create(dto: CreateCommunityChallengeDto) {
    if (new Date(dto.endsAt) <= new Date(dto.startsAt))
      throw new BadRequestException('End time must be after start time');
    return prisma.communityChallenge.create({
      data: {
        title: dto.title.trim(),
        slug: await this.uniqueSlug(dto.slug || dto.title),
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        ...this.fields(dto),
      },
    });
  }

  async update(id: string, dto: UpdateCommunityChallengeDto) {
    const existing = await prisma.communityChallenge.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Challenge not found');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    if (endsAt <= startsAt) throw new BadRequestException('End time must be after start time');
    const data = this.fields(dto);
    if (dto.slug !== undefined) data.slug = await this.uniqueSlug(dto.slug, id);
    return prisma.communityChallenge.update({ where: { id }, data });
  }

  async addMilestone(challengeId: string, dto: CreateChallengeMilestoneDto) {
    const challenge = await prisma.communityChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Challenge not found');
    const count = await prisma.communityChallengeMilestone.count({ where: { challengeId } });
    return prisma.communityChallengeMilestone.create({
      data: {
        challengeId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        sortOrder: count,
      },
    });
  }
}
