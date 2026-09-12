import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { MembershipService } from '../membership/membership.service';
import { CommunityPointsService } from './community-points.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { assertOwnStorageUrl } from '../qr-studio/qr-content-validation';
import { CreatePostDto, UpdatePostDto, CreateCommentDto, CategoryDto } from './dto/feed.dto';

const PAGE_SIZE = 20;

function slugify(input: string): string {
  return String(input).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'channel';
}

const authorSelect = { id: true, displayName: true, avatar: true } as const;

@Injectable()
export class CommunityFeedService {
  private readonly logger = new Logger(CommunityFeedService.name);

  constructor(
    private readonly membership: MembershipService,
    private readonly points: CommunityPointsService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  /** Keep only attachments uploaded to our own R2 bucket; cap the count. */
  private sanitizeAttachments(input: any): any[] | undefined {
    const arr = Array.isArray(input) ? input : [];
    const out: any[] = [];
    for (const a of arr.slice(0, 6)) {
      let url: string;
      try {
        url = assertOwnStorageUrl(String(a?.url ?? ''));
      } catch {
        continue;
      }
      out.push({
        url,
        name: String(a?.name ?? '').slice(0, 200) || 'file',
        type: String(a?.type ?? '').slice(0, 100),
        size: Number(a?.size) || undefined,
      });
    }
    return out.length ? out : undefined;
  }

  async updateMyAvatar(userId: string, avatarUrl?: string | null) {
    const url = avatarUrl ? assertOwnStorageUrl(avatarUrl) : null;
    await prisma.user.update({ where: { id: userId }, data: { avatar: url } });
    return { avatar: url };
  }

  private async assertMember(userId: string) {
    if (await this.membership.hasActiveMembership(userId)) return;
    if (await this.isAdmin(userId)) return; // owner/admins get full access without a subscription
    throw new ForbiddenException('An active Bold Ideas Growth Club membership is required');
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const roles = await prisma.userRole.findMany({ where: { userId }, select: { role: { select: { name: true } } } });
    return roles.some((r) => r.role.name === 'admin' || r.role.name === 'super_admin');
  }

  // --- Categories ---------------------------------------------------------

  async listCategories() {
    return prisma.communityCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async createCategory(dto: CategoryDto) {
    const count = await prisma.communityCategory.count();
    return prisma.communityCategory.create({
      data: { name: dto.name.trim(), slug: await this.uniqueSlug(dto.slug || dto.name), description: dto.description?.trim() || null, sortOrder: count },
    });
  }

  async updateCategory(id: string, dto: CategoryDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = await this.uniqueSlug(dto.slug, id);
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    return prisma.communityCategory.update({ where: { id }, data }).catch(() => { throw new NotFoundException('Category not found'); });
  }

  async deleteCategory(id: string) {
    await prisma.communityCategory.delete({ where: { id } }).catch(() => { throw new NotFoundException('Category not found'); });
    return { deleted: true };
  }

  private async uniqueSlug(base: string, ignoreId?: string): Promise<string> {
    const root = slugify(base);
    let candidate = root;
    let n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const clash = await prisma.communityCategory.findFirst({ where: { slug: candidate, ...(ignoreId ? { id: { not: ignoreId } } : {}) } });
      if (!clash) return candidate;
      candidate = `${root}-${++n}`;
    }
  }

  // --- Posts --------------------------------------------------------------

  async listPosts(userId: string, opts: { categoryId?: string; page?: number }) {
    await this.assertMember(userId);
    const page = Math.max(0, Number(opts.page) || 0);
    const where = opts.categoryId ? { categoryId: opts.categoryId } : {};
    const posts = await prisma.communityPost.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { lastActivityAt: 'desc' }],
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: authorSelect },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId }, select: { id: true } },
      },
    });
    return posts.map((p) => this.serializePost(p));
  }

  async getPost(userId: string, id: string) {
    await this.assertMember(userId);
    const post = await prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: { select: authorSelect },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { comments: true, likes: true } },
        likes: { where: { userId }, select: { id: true } },
        comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: authorSelect } } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return {
      ...this.serializePost(post),
      comments: post.comments.map((c) => ({ id: c.id, body: c.body, author: c.author, createdAt: c.createdAt })),
    };
  }

  private serializePost(p: any) {
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      attachments: p.attachments ?? [],
      pinned: p.pinned,
      author: p.author,
      category: p.category,
      commentCount: p._count.comments,
      likeCount: p._count.likes,
      likedByMe: (p.likes?.length ?? 0) > 0,
      createdAt: p.createdAt,
      lastActivityAt: p.lastActivityAt,
    };
  }

  async createPost(userId: string, dto: CreatePostDto) {
    await this.assertMember(userId);
    if (!dto.title?.trim() || !dto.body?.trim()) throw new BadRequestException('A title and body are required');
    if (dto.categoryId) {
      const cat = await prisma.communityCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new BadRequestException('Unknown category');
    }
    const post = await prisma.communityPost.create({
      data: {
        authorId: userId,
        title: dto.title.trim().slice(0, 200),
        body: dto.body.trim().slice(0, 10000),
        categoryId: dto.categoryId || null,
        attachments: this.sanitizeAttachments(dto.attachments) ?? undefined,
      },
    });
    await this.points.award(userId, 'POST', post.id);
    return { id: post.id };
  }

  async updatePost(userId: string, id: string, dto: UpdatePostDto) {
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId && !(await this.isAdmin(userId))) throw new ForbiddenException('Not your post');
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim().slice(0, 200);
    if (dto.body !== undefined) data.body = dto.body.trim().slice(0, 10000);
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId || null;
    if (dto.attachments !== undefined) data.attachments = this.sanitizeAttachments(dto.attachments) ?? null;
    return prisma.communityPost.update({ where: { id }, data });
  }

  async deletePost(userId: string, id: string) {
    const post = await prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId && !(await this.isAdmin(userId))) throw new ForbiddenException('Not your post');
    await prisma.communityPost.delete({ where: { id } });
    return { deleted: true };
  }

  async pinPost(id: string, pinned: boolean) {
    return prisma.communityPost.update({ where: { id }, data: { pinned } }).catch(() => { throw new NotFoundException('Post not found'); });
  }

  // --- Comments -----------------------------------------------------------

  async addComment(userId: string, postId: string, dto: CreateCommentDto) {
    await this.assertMember(userId);
    if (!dto.body?.trim()) throw new BadRequestException('A comment is required');
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: { author: { select: { id: true, displayName: true, email: true } } },
    });
    if (!post) throw new NotFoundException('Post not found');
    const [comment] = await prisma.$transaction([
      prisma.communityComment.create({ data: { postId, authorId: userId, body: dto.body.trim().slice(0, 5000) }, include: { author: { select: authorSelect } } }),
      prisma.communityPost.update({ where: { id: postId }, data: { lastActivityAt: new Date() } }),
    ]);
    await this.points.award(userId, 'COMMENT', comment.id);
    // Notify the post author of the reply (never self-notify).
    if (post.authorId !== userId) {
      void this.notifyReply(post.author, post.id, post.title, comment.author.displayName, comment.body);
    }
    return { id: comment.id, body: comment.body, author: comment.author, createdAt: comment.createdAt };
  }

  async deleteComment(userId: string, id: string) {
    const comment = await prisma.communityComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId && !(await this.isAdmin(userId))) throw new ForbiddenException('Not your comment');
    await prisma.communityComment.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Gamification -------------------------------------------------------

  async leaderboard(userId: string) {
    await this.assertMember(userId);
    return this.points.getLeaderboard(20);
  }

  async myStats(userId: string) {
    await this.assertMember(userId);
    return this.points.getMyStats(userId);
  }

  private async notifyReply(
    author: { id: string; displayName: string | null; email: string | null },
    postId: string,
    postTitle: string,
    replier: string | null,
    body: string,
  ) {
    try {
      await this.notifications.create(
        author.id,
        'SYSTEM',
        `${replier || 'Someone'} replied to your post`,
        `"${postTitle}" — ${body.slice(0, 120)}`,
        { kind: 'community_reply', communityPostId: postId },
      );
      if (author.email) {
        await this.email.sendCommunityReply(author.email, author.displayName || 'there', {
          postTitle,
          replier: replier || 'A member',
          snippet: body.slice(0, 200),
          postId,
        });
      }
    } catch (err) {
      this.logger.warn(`[community-reply-notify] ${(err as Error).message}`);
    }
  }

  // --- Likes --------------------------------------------------------------

  async toggleLike(userId: string, postId: string) {
    await this.assertMember(userId);
    const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await prisma.communityPostLike.findUnique({ where: { postId_userId: { postId, userId } } });
    const source = `${postId}:${userId}`;
    if (existing) {
      await prisma.communityPostLike.delete({ where: { id: existing.id } });
      if (post.authorId !== userId) await this.points.revoke(post.authorId, 'LIKE_RECEIVED', source);
    } else {
      await prisma.communityPostLike.create({ data: { postId, userId } });
      // Reward the author for engagement, not self-likes.
      if (post.authorId !== userId) await this.points.award(post.authorId, 'LIKE_RECEIVED', source);
    }
    const likeCount = await prisma.communityPostLike.count({ where: { postId } });
    return { likedByMe: !existing, likeCount };
  }
}
