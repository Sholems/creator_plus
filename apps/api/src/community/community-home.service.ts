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
}
