import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@creatormarket/database';
import { paginate, pageMeta } from '../common/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateSupportTicketDto,
  AssignTicketDto,
  ReplyTicketDto,
} from './dto/support-ticket.dto';

export interface AdminTicketQuery {
  page?: number;
  perPage?: number;
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
}

@Injectable()
export class SupportTicketsService {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ------------------------------------------------------------------
  // User-facing
  // ------------------------------------------------------------------

  async create(userId: string, dto: CreateSupportTicketDto) {
    return prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        description: dto.description,
        category: dto.category ?? 'TECHNICAL',
      },
    });
  }

  async myTickets(userId: string, page = 1, perPage = 20, status?: string) {
    const { page: p, perPage: size, skip, take } = paginate(page, perPage);
    const where: any = { userId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { messages: true } } },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { data, pagination: pageMeta(p, size, total) };
  }

  async getMyTicket(userId: string, id: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, email: true, displayName: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async replyFromUser(userId: string, ticketId: string, message: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('This ticket is closed and can no longer be replied to');
    }
    return prisma.ticketMessage.create({
      data: { ticketId, senderId: userId, senderType: 'USER', message },
    });
  }

  // ------------------------------------------------------------------
  // Admin
  // ------------------------------------------------------------------

  async findAll(query: AdminTicketQuery = {}) {
    const { page = 1, perPage = 20, status, priority, category, search } = query;
    const { page: p, perPage: size, skip, take } = paginate(page, perPage);

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
          assignedToUser: { select: { id: true, email: true, displayName: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { data, pagination: pageMeta(p, size, total) };
  }

  async findOne(id: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        assignedToUser: { select: { id: true, email: true, displayName: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, email: true, displayName: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async setStatus(id: string, status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return prisma.supportTicket.update({ where: { id }, data: { status } });
  }

  async setPriority(id: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return prisma.supportTicket.update({ where: { id }, data: { priority } });
  }

  async assign(id: string, dto: AssignTicketDto) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (dto.assignedTo) {
      const assignee = await prisma.user.findUnique({
        where: { id: dto.assignedTo },
        select: { id: true },
      });
      if (!assignee) throw new BadRequestException('Assigned user not found');
    }

    return prisma.supportTicket.update({
      where: { id },
      data: {
        assignedTo: dto.assignedTo ?? null,
        status: dto.assignedTo && ticket.status === 'OPEN' ? 'ASSIGNED' : ticket.status,
      },
    });
  }

  async replyFromAdmin(adminId: string, ticketId: string, message: string) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const reply = await prisma.ticketMessage.create({
      data: { ticketId, senderId: adminId, senderType: 'ADMIN', message },
    });

    if (ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    await this.notificationsService.create(
      ticket.userId,
      'SYSTEM',
      'Support reply',
      `A support agent replied to your ticket "${ticket.subject}".`,
      { ticketId },
    );

    return reply;
  }
}
