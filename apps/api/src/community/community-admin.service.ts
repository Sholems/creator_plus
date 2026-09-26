import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';

@Injectable()
export class CommunityAdminService {
  async overview() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [
      activeMembers,
      suspendedMembers,
      openReports,
      upcomingEvents,
      activeChallenges,
      deliveryFailures,
      pendingDeliveries,
      upcomingRsvps,
      checkInsLast7d,
      deliveredLast24h,
    ] = await Promise.all([
      prisma.communityProfile.count({ where: { participationStatus: 'ACTIVE' } }),
      prisma.communityProfile.count({ where: { participationStatus: 'SUSPENDED' } }),
      prisma.communityReport.count({ where: { status: 'OPEN' } }),
      prisma.communityEvent.count({ where: { published: true, canceledAt: null, startsAt: { gte: now } } }),
      prisma.communityChallenge.count({ where: { published: true, endsAt: { gte: now } } }),
      prisma.communityDelivery.count({ where: { status: 'FAILED' } }),
      prisma.communityDelivery.count({ where: { status: 'PENDING', scheduledAt: { lt: now } } }),
      prisma.communityEventRsvp.count({ where: { status: 'GOING', event: { published: true, canceledAt: null, startsAt: { gte: now } } } }),
      prisma.communityChallengeCheckIn.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.communityDelivery.count({ where: { status: 'DELIVERED', deliveredAt: { gte: dayAgo } } }),
    ]);
    return {
      activeMembers,
      suspendedMembers,
      openReports,
      upcomingEvents,
      activeChallenges,
      deliveryFailures,
      // Reminder lag: durable deliveries whose scheduled time has passed but are unsent.
      pendingDeliveries,
      upcomingRsvps,
      checkInsLast7d,
      deliveredLast24h,
    };
  }

  async reports(status = 'OPEN') {
    if (!['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'].includes(status))
      throw new BadRequestException('Invalid report status');
    return prisma.communityReport.findMany({
      where: status === 'ALL' ? {} : { status: status as any },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { reporter: { select: { id: true, displayName: true, email: true } } },
    });
  }

  async updateReport(actorId: string, id: string, status: 'RESOLVED' | 'DISMISSED') {
    if (status !== 'RESOLVED' && status !== 'DISMISSED')
      throw new BadRequestException('Invalid report status');
    const report = await prisma.communityReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return prisma.$transaction(async (tx) => {
      const updated = await tx.communityReport.update({ where: { id }, data: { status } });
      await tx.communityModerationAction.create({
        data: {
          actorId,
          targetType: report.targetType,
          targetId: report.targetId,
          action: status === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
          metadata: { reportId: id },
        },
      });
      return updated;
    });
  }

  async moderationHistory() {
    return prisma.communityModerationAction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { displayName: true, email: true } } },
    });
  }

  async setParticipation(
    actorId: string,
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    reason?: string,
  ) {
    if (status !== 'ACTIVE' && status !== 'SUSPENDED')
      throw new BadRequestException('Invalid participation status');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Member not found');
    return prisma.$transaction(async (tx) => {
      const profile = await tx.communityProfile.upsert({
        where: { userId },
        create: { userId, participationStatus: status },
        update: { participationStatus: status },
      });
      await tx.communityModerationAction.create({
        data: {
          actorId,
          targetType: 'PROFILE',
          targetId: userId,
          action: status === 'SUSPENDED' ? 'SUSPEND_COMMUNITY' : 'RESTORE_COMMUNITY',
          reason: reason?.trim() || null,
        },
      });
      return profile;
    });
  }
}
