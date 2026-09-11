import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@creatorplus/database';
import { MembershipService } from '../membership/membership.service';
import { CommunityPointsService } from './community-points.service';
import { assertHostAllowed, assertOwnStorageUrl } from '../qr-studio/qr-content-validation';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
} from './dto/course.dto';

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com', 'loom.com', 'wistia.com'];

function slugify(input: string): string {
  return String(input).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'course';
}

@Injectable()
export class CommunityCoursesService {
  constructor(
    private readonly membership: MembershipService,
    private readonly points: CommunityPointsService,
  ) {}

  private async isAdmin(userId: string): Promise<boolean> {
    const roles = await prisma.userRole.findMany({ where: { userId }, select: { role: { select: { name: true } } } });
    return roles.some((r) => r.role.name === 'admin' || r.role.name === 'super_admin');
  }

  private async assertMember(userId: string) {
    if (await this.membership.hasActiveMembership(userId)) return;
    if (await this.isAdmin(userId)) return; // owner/admins get full access without a subscription
    throw new ForbiddenException('An active membership is required');
  }

  /** A member's join date — drip windows are measured from here. */
  private async memberJoinDate(userId: string): Promise<Date> {
    const first = await prisma.membershipSubscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    return first?.createdAt ?? new Date();
  }

  private isLocked(joinDate: Date, dripDelayDays: number): boolean {
    if (!dripDelayDays) return false;
    return Date.now() < joinDate.getTime() + dripDelayDays * 86_400_000;
  }

  // --- Member views -------------------------------------------------------

  async listForMember(userId: string) {
    await this.assertMember(userId);
    const courses = await prisma.course.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { modules: { include: { _count: { select: { lessons: true } }, lessons: { select: { id: true } } } } },
    });
    const lessonIds = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => l.id)));
    const done = lessonIds.length
      ? await prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } }, select: { lessonId: true } })
      : [];
    const doneSet = new Set(done.map((d) => d.lessonId));

    return courses.map((c) => {
      const ids = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        coverImage: c.coverImage,
        lessonCount: ids.length,
        completedCount: ids.filter((id) => doneSet.has(id)).length,
      };
    });
  }

  async getForMember(userId: string, slug: string) {
    await this.assertMember(userId);
    const course = await prisma.course.findFirst({
      where: { slug, published: true },
      include: {
        modules: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { lessons: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const joinDate = await this.memberJoinDate(userId);
    const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const done = allLessonIds.length
      ? await prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: allLessonIds } }, select: { lessonId: true } })
      : [];
    const doneSet = new Set(done.map((d) => d.lessonId));

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      coverImage: course.coverImage,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons.map((l) => {
          const locked = this.isLocked(joinDate, l.dripDelayDays);
          return {
            id: l.id,
            title: l.title,
            contentType: l.contentType,
            durationMinutes: l.durationMinutes,
            completed: doneSet.has(l.id),
            locked,
            unlocksInDays: locked ? Math.ceil((joinDate.getTime() + l.dripDelayDays * 86_400_000 - Date.now()) / 86_400_000) : 0,
            // Content is only sent for unlocked lessons.
            body: locked ? null : l.body,
            videoUrl: locked ? null : l.videoUrl,
            fileUrl: locked ? null : l.fileUrl,
          };
        }),
      })),
    };
  }

  async completeLesson(userId: string, lessonId: string, completed = true) {
    await this.assertMember(userId);
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (completed) {
      await prisma.lessonProgress.upsert({
        where: { lessonId_userId: { lessonId, userId } },
        create: { lessonId, userId },
        update: {},
      });
      await this.points.award(userId, 'LESSON', lessonId);
    } else {
      await prisma.lessonProgress.deleteMany({ where: { lessonId, userId } });
      await this.points.revoke(userId, 'LESSON', lessonId);
    }
    return { lessonId, completed };
  }

  // --- Admin authoring ----------------------------------------------------

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    const root = slugify(base);
    let candidate = root;
    let n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const clash = await prisma.course.findFirst({ where: { slug: candidate, ...(ignoreId ? { id: { not: ignoreId } } : {}) } });
      if (!clash) return candidate;
      candidate = `${root}-${++n}`;
    }
  }

  async adminListCourses() {
    const courses = await prisma.course.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { modules: true } } },
    });
    return courses.map((c) => ({
      id: c.id, title: c.title, slug: c.slug, published: c.published, moduleCount: c._count.modules, coverImage: c.coverImage,
    }));
  }

  async adminGetCourse(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { lessons: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async createCourse(dto: CreateCourseDto) {
    const count = await prisma.course.count();
    return prisma.course.create({
      data: {
        title: dto.title.trim(),
        slug: await this.uniqueSlug(dto.slug || dto.title),
        description: dto.description?.trim() || null,
        coverImage: dto.coverImage ? assertOwnStorageUrl(dto.coverImage) : null,
        published: dto.published ?? false,
        sortOrder: count,
      },
    });
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Course not found');
    const data: Prisma.CourseUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.slug !== undefined) data.slug = await this.uniqueSlug(dto.slug, id);
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage ? assertOwnStorageUrl(dto.coverImage) : null;
    if (dto.published !== undefined) data.published = dto.published;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return prisma.course.update({ where: { id }, data });
  }

  async deleteCourse(id: string) {
    await prisma.course.delete({ where: { id } }).catch(() => { throw new NotFoundException('Course not found'); });
    return { deleted: true };
  }

  async addModule(courseId: string, dto: CreateModuleDto) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const count = await prisma.courseModule.count({ where: { courseId } });
    return prisma.courseModule.create({ data: { courseId, title: dto.title.trim(), sortOrder: count } });
  }

  async updateModule(id: string, dto: UpdateModuleDto) {
    const data: Prisma.CourseModuleUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return prisma.courseModule.update({ where: { id }, data }).catch(() => { throw new NotFoundException('Module not found'); });
  }

  async deleteModule(id: string) {
    await prisma.courseModule.delete({ where: { id } }).catch(() => { throw new NotFoundException('Module not found'); });
    return { deleted: true };
  }

  private validateLessonContent(dto: CreateLessonDto | UpdateLessonDto) {
    const data: any = {};
    if (dto.contentType !== undefined) data.contentType = dto.contentType;
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.body !== undefined) data.body = dto.body ?? null;
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes ?? null;
    if (dto.isPreview !== undefined) data.isPreview = dto.isPreview;
    if (dto.dripDelayDays !== undefined) data.dripDelayDays = Math.max(0, dto.dripDelayDays ?? 0);
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.videoUrl !== undefined) data.videoUrl = dto.videoUrl ? assertHostAllowed(dto.videoUrl, VIDEO_HOSTS, 'video') : null;
    if (dto.fileUrl !== undefined) data.fileUrl = dto.fileUrl ? assertOwnStorageUrl(dto.fileUrl) : null;
    return data;
  }

  async addLesson(moduleId: string, dto: CreateLessonDto) {
    const mod = await prisma.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');
    if (!dto.title?.trim()) throw new BadRequestException('A lesson title is required');
    const count = await prisma.lesson.count({ where: { moduleId } });
    return prisma.lesson.create({
      data: { moduleId, sortOrder: count, contentType: dto.contentType ?? 'TEXT', ...this.validateLessonContent(dto), title: dto.title.trim() },
    });
  }

  async updateLesson(id: string, dto: UpdateLessonDto) {
    return prisma.lesson
      .update({ where: { id }, data: this.validateLessonContent(dto) })
      .catch((e) => {
        if (e instanceof BadRequestException) throw e;
        throw new NotFoundException('Lesson not found');
      });
  }

  async deleteLesson(id: string) {
    await prisma.lesson.delete({ where: { id } }).catch(() => { throw new NotFoundException('Lesson not found'); });
    return { deleted: true };
  }
}
