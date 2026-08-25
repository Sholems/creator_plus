import { Injectable, BadRequestException } from '@nestjs/common';
import { prisma, Prisma, EventTicketStatus } from '@creatormarket/database';
import { generateTicketCode } from './event-ticket.util';

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
}
