import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { CommunityCoursesService } from './community-courses.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    membershipSubscription: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    course: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    lessonProgress: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    lesson: { findUnique: jest.fn(), update: jest.fn() },
    courseCertificate: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
    userRole: { findMany: jest.fn() },
  },
  Prisma: {},
}));

const p = prisma as any;

function makeService(isMember: boolean) {
  const access = {
    assertAccess: jest.fn().mockImplementation((_userId: string, options?: any) => {
      if (options?.accessLevel === 'PREMIUM' && !isMember)
        return Promise.reject(new ForbiddenException());
      return Promise.resolve({ isAdmin: false, hasPremiumAccess: isMember });
    }),
  } as any;
  const points = { award: jest.fn(), revoke: jest.fn() } as any;
  return new CommunityCoursesService(access, points);
}

describe('CommunityCoursesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    p.userRole.findMany.mockResolvedValue([]); // default: not an admin
    p.courseCertificate.findUnique.mockResolvedValue(null);
    process.env.R2_PUBLIC_URL = 'https://cdn.mycreatorplus.com';
  });

  it('allows every registered user to list free community courses', async () => {
    const svc = makeService(false);
    p.course.findMany.mockResolvedValue([]);

    await expect(svc.listForMember('u1')).resolves.toEqual([]);
  });

  it('lists premium courses as locked for users without a premium pass', async () => {
    const svc = makeService(false);
    p.course.findMany.mockResolvedValue([
      {
        id: 'c1',
        title: 'Premium course',
        slug: 'premium-course',
        description: null,
        coverImage: null,
        accessLevel: 'PREMIUM',
        modules: [],
      },
    ]);

    await expect(svc.listForMember('u1')).resolves.toEqual([
      expect.objectContaining({ id: 'c1', accessLevel: 'PREMIUM', locked: true }),
    ]);
  });

  it('soft-paywalls a premium course for a free member: preview plays, rest is gated', async () => {
    const svc = makeService(false);
    p.user.findUnique.mockResolvedValue({ createdAt: new Date() });
    p.lessonProgress.findMany.mockResolvedValue([]);
    p.course.findFirst.mockResolvedValue({
      id: 'c1',
      title: 'Premium course',
      slug: 'premium-course',
      description: null,
      coverImage: null,
      accessLevel: 'PREMIUM',
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          lessons: [
            { id: 'L1', title: 'Intro (preview)', contentType: 'VIDEO', durationMinutes: 5, dripDelayDays: 0, isPreview: true, body: null, videoUrl: 'https://youtu.be/x', fileUrl: null },
            { id: 'L2', title: 'Members only', contentType: 'VIDEO', durationMinutes: 5, dripDelayDays: 0, isPreview: false, body: null, videoUrl: 'https://youtu.be/y', fileUrl: null },
          ],
        },
      ],
    });

    const res = await svc.getForMember('u1', 'premium-course');
    expect(res.premiumLocked).toBe(true);
    const [preview, gated] = res.modules[0].lessons;
    expect(preview).toMatchObject({ isPreview: true, premiumLocked: false, videoUrl: 'https://youtu.be/x' });
    expect(gated).toMatchObject({ premiumLocked: true, videoUrl: null });
  });

  it('reveals unlocked lessons, hides dripped ones, and reflects completion', async () => {
    const svc = makeService(true);
    p.user.findUnique.mockResolvedValue({ createdAt: new Date() }); // registered now
    p.course.findFirst.mockResolvedValue({
      id: 'c1',
      title: 'Course',
      slug: 'course',
      description: null,
      coverImage: null,
      accessLevel: 'FREE',
      modules: [
        {
          id: 'm1',
          title: 'Module 1',
          lessons: [
            {
              id: 'L1',
              title: 'Intro',
              contentType: 'TEXT',
              durationMinutes: 5,
              dripDelayDays: 0,
              body: 'b1',
              videoUrl: null,
              fileUrl: null,
            },
            {
              id: 'L2',
              title: 'Week 2',
              contentType: 'TEXT',
              durationMinutes: 5,
              dripDelayDays: 30,
              body: 'b2',
              videoUrl: null,
              fileUrl: null,
            },
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

  it('issues one verifiable certificate when the final lesson is completed', async () => {
    const svc = makeService(true);
    p.lesson.findUnique.mockResolvedValue({
      id: 'L1',
      module: {
        course: {
          id: 'c1',
          accessLevel: 'FREE',
          modules: [{ lessons: [{ id: 'L1' }] }],
        },
      },
    });
    p.lessonProgress.count.mockResolvedValue(1);

    await svc.completeLesson('u1', 'L1', true);

    expect(p.courseCertificate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId_userId: { courseId: 'c1', userId: 'u1' } },
      }),
    );
  });

  it('prevents lesson completion from bypassing a premium course lock', async () => {
    const svc = makeService(false);
    p.lesson.findUnique.mockResolvedValue({
      id: 'L1',
      module: { course: { accessLevel: 'PREMIUM' } },
    });

    await expect(svc.completeLesson('u1', 'L1', true)).rejects.toBeInstanceOf(ForbiddenException);
    expect(p.lessonProgress.upsert).not.toHaveBeenCalled();
  });

  it('allows lessons to combine Bunny video, markdown text, and an uploaded file', async () => {
    const svc = makeService(true);
    p.lesson.update.mockResolvedValue({ id: 'L1' });

    await svc.updateLesson('L1', {
      contentType: 'VIDEO',
      videoUrl: 'https://player.mediadelivery.net/embed/12345/01234567-89ab-cdef-0123-456789abcdef',
      body: '## Watch first\nThen download the workbook.',
      fileUrl: 'https://cdn.mycreatorplus.com/community/workbook.pdf',
    } as any);

    expect(p.lesson.update).toHaveBeenCalledWith({
      where: { id: 'L1' },
      data: expect.objectContaining({
        contentType: 'VIDEO',
        videoUrl:
          'https://player.mediadelivery.net/embed/12345/01234567-89ab-cdef-0123-456789abcdef',
        body: '## Watch first\nThen download the workbook.',
        fileUrl: 'https://cdn.mycreatorplus.com/community/workbook.pdf',
      }),
    });
  });
});
