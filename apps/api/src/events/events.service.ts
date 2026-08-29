import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { prisma, Prisma, EventTicketStatus } from '@creatorplus/database';
import { generateTicketCode } from './event-ticket.util';
import { EmailService } from '../email/email.service';
import { webBaseUrl } from '../common/urls';

// Seats are held for this long while the buyer completes payment; an abandoned
// checkout's holds simply expire and stop counting against capacity.
const HOLD_MS = 15 * 60 * 1000;

const OCCUPYING = (now: Date): Prisma.TicketWhereInput => ({
  OR: [
    { status: { in: [EventTicketStatus.VALID, EventTicketStatus.CHECKED_IN] } },
    { status: EventTicketStatus.HELD, holdExpiresAt: { gt: now } },
  ],
});

@Injectable()
export class EventsService {
  constructor(private readonly emailService: EmailService) {}

  /** Create or update the Event config attached to an EVENT-type product. */
  async upsertForProduct(
    productId: string,
    data: {
      startsAt: string;
      endsAt?: string | null;
      timezone?: string;
      locationType?: 'VIRTUAL' | 'PHYSICAL' | 'HYBRID';
      joinUrl?: string | null;
      venueName?: string | null;
      venueAddress?: string | null;
      capacity?: number | null;
      registrationDeadline?: string | null;
      status?: 'PUBLISHED' | 'CANCELLED';
    },
  ) {
    const patch = {
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      timezone: data.timezone || 'Africa/Lagos',
      locationType: (data.locationType || 'VIRTUAL') as any,
      joinUrl: data.joinUrl ?? null,
      venueName: data.venueName ?? null,
      venueAddress: data.venueAddress ?? null,
      capacity: data.capacity ?? null,
      registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : null,
      status: (data.status || 'PUBLISHED') as any,
    };
    return prisma.event.upsert({
      where: { productId },
      create: { productId, ...patch },
      update: patch,
    });
  }

  /** Public seat availability for an event product (null if not an event). */
  async availabilityForProduct(productId: string) {
    const event = await prisma.event.findUnique({
      where: { productId },
      select: { id: true, capacity: true, status: true, startsAt: true, registrationDeadline: true },
    });
    if (!event) return null;

    let seatsLeft: number | null = null;
    if (event.capacity != null) {
      const taken = await prisma.ticket.count({
        where: { eventId: event.id, ...OCCUPYING(new Date()) },
      });
      seatsLeft = Math.max(0, event.capacity - taken);
    }
    const soldOut = seatsLeft !== null && seatsLeft <= 0;
    const registrationClosed =
      !!event.registrationDeadline && new Date() > event.registrationDeadline;
    const available = event.status !== 'CANCELLED' && !soldOut && !registrationClosed;

    return {
      capacity: event.capacity,
      seatsLeft,
      soldOut,
      registrationClosed,
      status: event.status,
      available,
    };
  }

  /**
   * Reserve seats for any event items in an order (called at order creation).
   * Each event is reserved in its own transaction that locks the event row, so
   * concurrent buyers can never claim the same last seat.
   */
  async reserveForOrder(order: {
    id: string;
    buyerId: string;
    items: Array<{ id: string; productId: string; quantity: number }>;
  }) {
    const productIds = order.items.map((i) => i.productId);
    const events = await prisma.event.findMany({
      where: { productId: { in: productIds } },
      select: { id: true, productId: true, status: true, registrationDeadline: true },
    });
    const byProduct = new Map(events.map((e) => [e.productId, e]));

    for (const item of order.items) {
      const event = byProduct.get(item.productId);
      if (!event) continue; // not an event product
      if (event.status === 'CANCELLED') {
        throw new BadRequestException('This event has been cancelled.');
      }
      if (event.registrationDeadline && new Date() > event.registrationDeadline) {
        throw new BadRequestException('Registration has closed for this event.');
      }
      await this.reserveSeats(event.id, item, order);
    }
  }

  private async reserveSeats(
    eventId: string,
    item: { id: string; quantity: number },
    order: { id: string; buyerId: string },
  ) {
    await prisma.$transaction(async (tx) => {
      // Serialize concurrent reservations for this event.
      await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE`;

      const ev = await tx.event.findUnique({ where: { id: eventId }, select: { capacity: true } });
      if (ev?.capacity != null) {
        const taken = await tx.ticket.count({ where: { eventId, ...OCCUPYING(new Date()) } });
        if (taken + item.quantity > ev.capacity) {
          const left = Math.max(0, ev.capacity - taken);
          throw new BadRequestException(
            left === 0
              ? 'This event is sold out.'
              : `Only ${left} seat(s) left for this event.`,
          );
        }
      }

      const holdExpiresAt = new Date(Date.now() + HOLD_MS);
      await tx.ticket.createMany({
        data: Array.from({ length: item.quantity }).map(() => ({
          eventId,
          orderId: order.id,
          orderItemId: item.id,
          buyerId: order.buyerId,
          ticketCode: generateTicketCode(),
          status: EventTicketStatus.HELD,
          holdExpiresAt,
        })),
      });
    });
  }

  /** Tickets a buyer owns (paid or cancelled). Join link is only revealed for
   *  active tickets. */
  async findTicketsForBuyer(userId: string) {
    const tickets = await prisma.ticket.findMany({
      where: {
        buyerId: userId,
        status: {
          in: [EventTicketStatus.VALID, EventTicketStatus.CHECKED_IN, EventTicketStatus.CANCELLED],
        },
      },
      include: {
        event: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            timezone: true,
            locationType: true,
            joinUrl: true,
            venueName: true,
            venueAddress: true,
            status: true,
            product: { select: { id: true, title: true, slug: true, thumbnail: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => {
      const active = t.status === EventTicketStatus.VALID || t.status === EventTicketStatus.CHECKED_IN;
      return {
        id: t.id,
        ticketCode: t.ticketCode,
        status: t.status,
        checkedInAt: t.checkedInAt,
        event: { ...t.event, joinUrl: active ? t.event.joinUrl : null },
      };
    });
  }

  /** Email the buyer their ticket(s) for an order — join link, when/where, and
   *  codes. Best-effort; called post-fulfillment. */
  async sendTicketConfirmations(orderId: string) {
    const tickets = await prisma.ticket.findMany({
      where: { orderId, status: EventTicketStatus.VALID },
      select: {
        ticketCode: true,
        buyer: { select: { email: true, displayName: true } },
        event: {
          select: {
            startsAt: true,
            timezone: true,
            locationType: true,
            joinUrl: true,
            venueName: true,
            venueAddress: true,
            product: { select: { title: true } },
          },
        },
      },
    });
    if (tickets.length === 0) return;

    const buyer = tickets[0].buyer;
    if (!buyer?.email) return;

    // Group ticket codes per event (an order usually has one).
    const groups = new Map<string, { event: (typeof tickets)[number]['event']; codes: string[] }>();
    for (const t of tickets) {
      const key = t.event.product.title + t.event.startsAt.toISOString();
      const g = groups.get(key) ?? { event: t.event, codes: [] };
      g.codes.push(t.ticketCode);
      groups.set(key, g);
    }

    for (const { event, codes } of groups.values()) {
      const whenText =
        new Intl.DateTimeFormat('en-NG', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: event.timezone,
        }).format(event.startsAt) + ` (${event.timezone})`;
      const locationText =
        event.locationType === 'VIRTUAL'
          ? 'Online event'
          : [event.venueName, event.venueAddress].filter(Boolean).join(', ') || 'In person';
      await this.emailService
        .sendEventTicket(buyer.email, buyer.displayName || 'there', {
          eventTitle: event.product.title,
          whenText,
          locationText,
          joinUrl: event.locationType !== 'PHYSICAL' ? event.joinUrl : null,
          ticketCodes: codes,
          viewUrl: `${webBaseUrl()}/dashboard/tickets`,
        })
        .catch(() => undefined);
    }
  }

  /** Confirm an order's held seats once payment succeeds (runs in fulfillment tx). */
  async confirmForOrder(tx: Prisma.TransactionClient, orderId: string) {
    await tx.ticket.updateMany({
      where: { orderId, status: EventTicketStatus.HELD },
      data: { status: EventTicketStatus.VALID, holdExpiresAt: null },
    });
  }

  /** Release an order's seats (cancelled/failed/refunded order). */
  async cancelTicketsForOrder(orderId: string) {
    await prisma.ticket.updateMany({
      where: {
        orderId,
        status: { in: [EventTicketStatus.HELD, EventTicketStatus.VALID] },
      },
      data: { status: EventTicketStatus.CANCELLED, holdExpiresAt: null },
    });
  }

  // ─── Creator dashboard ────────────────────────────────────────────────────

  private async creatorProfileId(userId: string) {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('You must be a creator');
    return profile.id;
  }

  /** Events across the creator's products, with sold / checked-in counts. */
  async findForCreator(userId: string) {
    const creatorId = await this.creatorProfileId(userId);
    const events = await prisma.event.findMany({
      where: { product: { creatorId } },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        timezone: true,
        locationType: true,
        capacity: true,
        status: true,
        product: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { startsAt: 'desc' },
    });
    const ids = events.map((e) => e.id);
    const [sold, checkedIn] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: ids },
          status: { in: [EventTicketStatus.VALID, EventTicketStatus.CHECKED_IN] },
        },
        _count: { _all: true },
      }),
      prisma.ticket.groupBy({
        by: ['eventId'],
        where: { eventId: { in: ids }, status: EventTicketStatus.CHECKED_IN },
        _count: { _all: true },
      }),
    ]);
    const soldBy = new Map(sold.map((s) => [s.eventId, s._count._all]));
    const inBy = new Map(checkedIn.map((s) => [s.eventId, s._count._all]));
    return events.map((e) => ({
      ...e,
      sold: soldBy.get(e.id) ?? 0,
      checkedIn: inBy.get(e.id) ?? 0,
    }));
  }

  private async creatorEventOrThrow(userId: string, productId: string) {
    const creatorId = await this.creatorProfileId(userId);
    const event = await prisma.event.findUnique({
      where: { productId },
      select: { id: true, product: { select: { creatorId: true, title: true } } },
    });
    if (!event || event.product.creatorId !== creatorId) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  /** Attendee list (paid tickets) for one of the creator's events. */
  async attendeesForProduct(userId: string, productId: string) {
    const event = await this.creatorEventOrThrow(userId, productId);
    const tickets = await prisma.ticket.findMany({
      where: {
        eventId: event.id,
        status: { in: [EventTicketStatus.VALID, EventTicketStatus.CHECKED_IN] },
      },
      select: {
        id: true,
        ticketCode: true,
        status: true,
        checkedInAt: true,
        createdAt: true,
        buyer: { select: { displayName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { eventTitle: event.product.title, tickets };
  }

  /** Check a ticket in at the door (creator only). Atomic — a ticket can't be
   *  checked in twice by concurrent scans. */
  async checkIn(userId: string, productId: string, ticketCode: string) {
    const event = await this.creatorEventOrThrow(userId, productId);
    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: (ticketCode || '').trim().toUpperCase() },
      select: {
        id: true,
        eventId: true,
        status: true,
        buyer: { select: { displayName: true, email: true } },
      },
    });
    if (!ticket || ticket.eventId !== event.id) {
      throw new NotFoundException('No ticket with that code for this event');
    }
    const attendee = ticket.buyer?.displayName || ticket.buyer?.email || 'Attendee';
    if (ticket.status === EventTicketStatus.CANCELLED) {
      throw new BadRequestException('This ticket was cancelled');
    }

    const claimed = await prisma.ticket.updateMany({
      where: { id: ticket.id, status: EventTicketStatus.VALID },
      data: { status: EventTicketStatus.CHECKED_IN, checkedInAt: new Date(), checkedInBy: userId },
    });
    if (claimed.count === 0) {
      if (ticket.status === EventTicketStatus.CHECKED_IN) {
        return { ok: true, alreadyCheckedIn: true, attendee };
      }
      throw new BadRequestException('This ticket is not valid for entry');
    }
    return { ok: true, alreadyCheckedIn: false, attendee };
  }
}
