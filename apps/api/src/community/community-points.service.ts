import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@creatorplus/database';

/** Points awarded per action. */
export const POINTS = { POST: 5, COMMENT: 2, LESSON: 3, LIKE_RECEIVED: 1 } as const;
export type PointReason = keyof typeof POINTS;

/** Points needed to reach each level (index 0 → level 1). */
const LEVEL_THRESHOLDS = [0, 5, 20, 50, 100, 250, 500, 1000, 2500];

export function levelFor(points: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
  return level;
}
export function nextLevelAt(points: number): number | null {
  for (const t of LEVEL_THRESHOLDS) if (points < t) return t;
  return null;
}

@Injectable()
export class CommunityPointsService {
  private readonly logger = new Logger(CommunityPointsService.name);

  /** Award points once per (user, reason, source). Safe to call repeatedly. */
  async award(userId: string, reason: PointReason, sourceId: string) {
    const points = POINTS[reason];
    try {
      await prisma.$transaction([
        prisma.communityPointEvent.create({ data: { userId, reason, points, sourceId } }),
        prisma.communityProfile.upsert({ where: { userId }, create: { userId, points }, update: { points: { increment: points } } }),
      ]);
    } catch {
      // Unique violation → already awarded for this source; ignore.
    }
  }

  /** Reverse a previously awarded action (e.g. un-liking, un-completing). */
  async revoke(userId: string, reason: PointReason, sourceId: string) {
    const evt = await prisma.communityPointEvent.findFirst({ where: { userId, reason, sourceId } });
    if (!evt) return;
    try {
      await prisma.$transaction([
        prisma.communityPointEvent.delete({ where: { id: evt.id } }),
        prisma.communityProfile.update({ where: { userId }, data: { points: { decrement: evt.points } } }),
      ]);
    } catch (err) {
      this.logger.warn(`[points] revoke failed: ${(err as Error).message}`);
    }
  }

  async getLeaderboard(limit = 20) {
    const profiles = await prisma.communityProfile.findMany({
      where: { points: { gt: 0 } },
      orderBy: { points: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
      include: { user: { select: { id: true, displayName: true, avatar: true } } },
    });
    return profiles.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      displayName: p.user.displayName,
      avatar: p.user.avatar,
      points: p.points,
      level: levelFor(p.points),
    }));
  }

  async getMyStats(userId: string) {
    const profile = await prisma.communityProfile.findUnique({ where: { userId } });
    const points = profile?.points ?? 0;
    const level = levelFor(points);
    const next = nextLevelAt(points);
    // Rank = how many members have strictly more points, + 1.
    const ahead = points > 0 ? await prisma.communityProfile.count({ where: { points: { gt: points } } }) : null;
    return {
      points,
      level,
      nextLevelAt: next,
      pointsToNextLevel: next != null ? next - points : null,
      rank: ahead != null ? ahead + 1 : null,
    };
  }
}
