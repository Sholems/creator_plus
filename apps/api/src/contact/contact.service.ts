import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';
import { paginate, pageMeta } from '../common/pagination';
import { CreateContactDto, UpdateContactStatusDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  async create(dto: CreateContactDto) {
    return prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        category: dto.category || 'general',
        message: dto.message,
      },
    });
  }

  async findAll(pageArg = 1, perPageArg = 20, status?: string) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const where: any = status ? { status } : {};
    const [data, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, displayName: true } },
        },
      }),
      prisma.contactMessage.count({ where }),
    ]);
    return { data, pagination: pageMeta(page, perPage, total) };
  }

  async findOne(id: string) {
    const message = await prisma.contactMessage.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
    if (!message) throw new NotFoundException('Contact message not found');
    return message;
  }

  async setStatus(id: string, dto: UpdateContactStatusDto) {
    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Contact message not found');
    return prisma.contactMessage.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
