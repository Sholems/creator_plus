import { Injectable } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { CommunityAccessService } from './community-access.service';
import { CommunityCoursesService } from './community-courses.service';
import { CommunityPointsService } from './community-points.service';

@Injectable()
export class CommunityHomeService {
  constructor(
    private readonly access: CommunityAccessService,
    private readonly courses: CommunityCoursesService,
    private readonly points: CommunityPointsService,
  ) {}

  async getHome(userId: string) {
    await this.access.assertAccess(userId);
    const [courses, stats, latestPosts] = await Promise.all([
      this.courses.listForMember(userId),
      this.points.getMyStats(userId),
      prisma.communityPost.findMany({
        orderBy: [{ pinned: 'desc' }, { lastActivityAt: 'desc' }],
        take: 4,
        select: {
          id: true,
          title: true,
          lastActivityAt: true,
          _count: { select: { comments: true } },
        },
      }),
    ]);
    const course = courses.find((item) => !item.locked && item.completedCount < item.lessonCount);
    return {
      nextLesson: course
        ? {
            courseSlug: course.slug,
            courseTitle: course.title,
            completedCount: course.completedCount,
            lessonCount: course.lessonCount,
          }
        : null,
      conversations: latestPosts.map((post) => ({
        id: post.id,
        title: post.title,
        replyCount: post._count.comments,
        lastActivityAt: post.lastActivityAt,
      })),
      upcomingEvent: null,
      activeChallenge: null,
      stats,
    };
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  /** Record a daily visit, advancing the streak once per UTC day (idempotent). */
  async recordVisit(userId: string) {
    await prisma.communityProfile.upsert({ where: { userId }, create: { userId }, update: {} });
    const profile = await prisma.communityProfile.findUnique({
      where: { userId },
      select: { lastActiveOn: true, currentStreak: true, longestStreak: true },
    });
    const now = new Date();
    const today = this.startOfUtcDay(now);
    const last = profile?.lastActiveOn ? this.startOfUtcDay(profile.lastActiveOn) : null;

    let currentStreak = profile?.currentStreak ?? 0;
    let longestStreak = profile?.longestStreak ?? 0;

    if (!last || last.getTime() !== today.getTime()) {
      const yesterday = new Date(today.getTime() - 86_400_000);
      currentStreak = last && last.getTime() === yesterday.getTime() ? currentStreak + 1 : 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      await prisma.communityProfile.update({
        where: { userId },
        data: { lastActiveOn: now, currentStreak, longestStreak },
      });
      await this.points.award(userId, 'DAILY_CHECKIN', today.toISOString().slice(0, 10));
    }
    return { currentStreak, longestStreak };
  }

  /** Onboarding checklist, with each step derived from real member data. */
  async getOnboarding(userId: string) {
    const [profile, postCount, lessonCount, followCount, qrCount] = await Promise.all([
      prisma.communityProfile.findUnique({ where: { userId }, select: { headline: true, bio: true } }),
      prisma.communityPost.count({ where: { authorId: userId } }),
      prisma.lessonProgress.count({ where: { userId } }),
      prisma.communityFollow.count({ where: { followerId: userId } }),
      prisma.qrCampaign.count({ where: { ownerId: userId } }),
    ]);
    const steps = [
      { key: 'profile', label: 'Complete your profile', done: !!(profile?.headline || profile?.bio), href: '/community/settings' },
      { key: 'post', label: 'Introduce yourself in Discussion', done: postCount > 0, href: '/community/discussion' },
      { key: 'learn', label: 'Start your first course', done: lessonCount > 0, href: '/community/courses' },
      { key: 'follow', label: 'Follow 3 members', done: followCount >= 3, href: '/community/members' },
      { key: 'qr', label: 'Create your first QR code', done: qrCount > 0, href: '/creator/qr-studio' },
    ];
    const complete = steps.every((s) => s.done);
    if (complete) await this.points.award(userId, 'ONBOARDING', 'onboarding');
    return { steps, complete, completedCount: steps.filter((s) => s.done).length, total: steps.length };
  }

  /** Daily engagement payload: records the visit (streak) and returns onboarding. */
  async getEngagement(userId: string) {
    await this.access.assertAccess(userId);
    const streak = await this.recordVisit(userId);
    const onboarding = await this.getOnboarding(userId);
    return { streak, onboarding };
  }
}
