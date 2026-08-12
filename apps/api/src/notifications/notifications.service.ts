import { Injectable } from '@nestjs/common';
import { prisma, NotificationType } from '@creatormarket/database';
import { paginate, pageMeta } from '../common/pagination';

@Injectable()
export class NotificationsService {
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ) {
    return prisma.notification.create({
      data: { userId, type, title, message, data },
    });
  }

  async findByUser(userId: string, pageArg = 1, perPageArg = 20) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      pagination: pageMeta(page, perPage, total),
    };
  }

  async unreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return null;
    }

    return prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
