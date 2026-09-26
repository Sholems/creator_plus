import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { assertHostAllowed, assertOwnStorageUrl } from '../qr-studio/qr-content-validation';
import { CommunityAccessService } from './community-access.service';
import { sanitizeCommunityHtml } from './community-rich-content';
import { CreateCommunityEventDto, UpdateCommunityEventDto } from './dto/community-event.dto';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

const REPLAY_HOSTS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
  'bunny.net',
  'iframe.mediadelivery.net',
  'player.mediadelivery.net',
];

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'event'
  );
}

function safeHttpsUrl(value?: string | null) {
  if (!value) return null;
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') throw new BadRequestException('Event links must use HTTPS');
  return parsed.toString();
}

@Injectable()
export class CommunityEventsService {
  constructor(
    private readonly access: CommunityAccessService,
    @Optional() private readonly flags?: FeatureFlagsService,
  ) {}

  private async assertFeature(userId: string, isAdmin = false) {
    if (!isAdmin && this.flags && !(await this.flags.isEnabled('community-programming', userId)))
      throw new ForbiddenException('Community programming is not enabled for this account');
  }

  private async uniqueSlug(value: string, ignoreId?: string) {
    const root = slugify(value);
    let candidate = root;
    let suffix = 1;
    while (
      await prisma.communityEvent.findFirst({
        where: { slug: candidate, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
        select: { id: true },
      })
    )
      candidate = `${root}-${++suffix}`;
    return candidate;
  }

  async list(userId: string) {
    const member = await this.access.assertAccess(userId);
    await this.assertFeature(userId, member.isAdmin);
    const events = await prisma.communityEvent.findMany({
      where: { published: true },
      orderBy: { startsAt: 'asc' },
      include: {
        rsvps: { where: { userId }, select: { status: true } },
        _count: { select: { rsvps: { where: { status: 'GOING' } } } },
      },
    });
    let premium = member.isAdmin;
    if (!premium && events.some((event) => event.accessLevel === 'PREMIUM')) {
      premium = Boolean(
        await this.access.assertAccess(userId, { accessLevel: 'PREMIUM' }).catch(() => null),
      );
    }
    return events.map((event) => ({
      ...event,
      meetingUrl: undefined,
      locked: event.accessLevel === 'PREMIUM' && !premium,
      attendeeCount: event._count.rsvps,
      rsvpStatus: event.rsvps[0]?.status ?? null,
      rsvps: undefined,
      _count: undefined,
    }));
  }

  async get(userId: string, slug: string) {
    const event = await prisma.communityEvent.findFirst({
      where: { slug, published: true },
      include: {
        rsvps: { where: { userId }, select: { status: true } },
        _count: { select: { rsvps: { where: { status: 'GOING' } } } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    const member = await this.access.assertAccess(userId, { accessLevel: event.accessLevel });
    await this.assertFeature(userId, member.isAdmin);
    const rsvpStatus = event.rsvps[0]?.status ?? null;
    return {
      ...event,
      meetingUrl: rsvpStatus === 'GOING' ? event.meetingUrl : null,
      attendeeCount: event._count.rsvps,
      rsvpStatus,
      rsvps: undefined,
      _count: undefined,
    };
  }

  async rsvp(userId: string, eventId: string, going: boolean) {
    const event = await prisma.communityEvent.findFirst({
      where: { id: eventId, published: true },
      include: { _count: { select: { rsvps: { where: { status: 'GOING' } } } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    const member = await this.access.assertAccess(userId, { accessLevel: event.accessLevel });
    await this.assertFeature(userId, member.isAdmin);
    const existing = await prisma.communityEventRsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (
      going &&
      existing?.status !== 'GOING' &&
      event.capacity &&
      event._count.rsvps >= event.capacity
    )
      throw new BadRequestException('This event is full');
    const rsvp = await prisma.communityEventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status: going ? 'GOING' : 'CANCELLED' },
      update: { status: going ? 'GOING' : 'CANCELLED' },
    });
    return { status: rsvp.status, meetingUrl: going ? event.meetingUrl : null };
  }

  async adminList() {
    return prisma.communityEvent.findMany({ orderBy: { startsAt: 'desc' } });
  }

  private contentData(dto: CreateCommunityEventDto | UpdateCommunityEventDto) {
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
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.accessLevel !== undefined) data.accessLevel = dto.accessLevel;
    if (dto.hostName !== undefined) data.hostName = dto.hostName.trim() || null;
    if (dto.coverImage !== undefined)
      data.coverImage = dto.coverImage ? assertOwnStorageUrl(dto.coverImage) : null;
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.timezone !== undefined) data.timezone = dto.timezone.trim();
    if (dto.meetingUrl !== undefined) data.meetingUrl = safeHttpsUrl(dto.meetingUrl);
    if (dto.replayUrl !== undefined)
      data.replayUrl = dto.replayUrl
        ? assertHostAllowed(dto.replayUrl, REPLAY_HOSTS, 'replay')
        : null;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.published !== undefined) data.published = dto.published;
    return data;
  }

  async create(dto: CreateCommunityEventDto) {
    if (dto.endsAt && new Date(dto.endsAt) <= new Date(dto.startsAt))
      throw new BadRequestException('End time must be after start time');
    return prisma.communityEvent.create({
      data: {
        title: dto.title.trim(),
        slug: await this.uniqueSlug(dto.slug || dto.title),
        startsAt: new Date(dto.startsAt),
        ...this.contentData(dto),
      },
    });
  }

  async update(id: string, dto: UpdateCommunityEventDto) {
    const event = await prisma.communityEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : event.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : event.endsAt;
    if (endsAt && endsAt <= startsAt)
      throw new BadRequestException('End time must be after start time');
    const data = this.contentData(dto);
    if (dto.slug !== undefined) data.slug = await this.uniqueSlug(dto.slug, id);
    return prisma.communityEvent.update({ where: { id }, data });
  }

  /**
   * Cancel an event. Unpublishing plus a cancellation timestamp lets the
   * programming worker suppress pending reminders and send one cancellation
   * notice per RSVP (idempotently), without deleting the event or its history.
   */
  async cancel(id: string) {
    const event = await prisma.communityEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return prisma.communityEvent.update({
      where: { id },
      data: { published: false, canceledAt: event.canceledAt ?? new Date() },
    });
  }
}
