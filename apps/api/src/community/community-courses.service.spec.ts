import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { CommunityCoursesService } from './community-courses.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    membershipSubscription: { findFirst: jest.fn() },
    course: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    lessonProgress: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    lesson: { findUnique: jest.fn() },
  },
  Prisma: {},
}));

const p = prisma as any;

function makeService(isMember: boolean) {
  const membership = { hasActiveMembership: jest.fn().mockResolvedValue(isMember) } as any;
  const points = { award: jest.fn(), revoke: jest.fn() } as any;
  return new CommunityCoursesService(membership, points);
}

describe('CommunityCoursesService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks non-members', async () => {
    const svc = makeService(false);
    await expect(svc.listForMember('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reveals unlocked lessons, hides dripped ones, and reflects completion', async () => {
    const svc = makeService(true);
    p.membershipSubscription.findFirst.mockResolvedValue({ createdAt: new Date() }); // joined now
    p.course.findFirst.mockResolvedValue({
      id: 'c1', title: 'Course', slug: 'course', description: null, coverImage: null,
      modules: [
        {
          id: 'm1', title: 'Module 1',
          lessons: [
            { id: 'L1', title: 'Intro', contentType: 'TEXT', durationMinutes: 5, dripDelayDays: 0, body: 'b1', videoUrl: null, fileUrl: null },
            { id: 'L2', title: 'Week 2', contentType: 'TEXT', durationMinutes: 5, dripDelayDays: 30, body: 'b2', videoUrl: null, fileUrl: null },
          ],
        },
      ],
    });
    p.lessonProgress.findMany.mockResolvedValue([{ lessonId: 'L1' }]);

    const res = await svc.getForMember('u1', 'course');
    const [l1, l2] = res.modules[0].lessons;
    expect(l1).toMatchObject({ id: 'L1', locked: false, completed: true, body: 'b1' });
    expect(l2).toMatchObject({ id: 'L2', locked: true, completed: false, body: null });
    expect(l2.unlocksInDays).toBeGreaterThan(0);
  });

  it('upserts progress when completing a lesson', async () => {
    const svc = makeService(true);
    p.lesson.findUnique.mockResolvedValue({ id: 'L1' });
    await svc.completeLesson('u1', 'L1', true);
    expect(p.lessonProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lessonId_userId: { lessonId: 'L1', userId: 'u1' } } }),
    );
  });
});
