import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { COMMUNITY_MANAGER_ROLE } from './community-roles';

/** Grants/revokes the community_manager role. Platform-admin only (see controller). */
@Injectable()
export class CommunityTeamService implements OnModuleInit {
  async onModuleInit() {
    await this.ensureRole().catch(() => undefined);
  }

  private ensureRole() {
    return prisma.role.upsert({
      where: { name: COMMUNITY_MANAGER_ROLE },
      create: {
        name: COMMUNITY_MANAGER_ROLE,
        description: 'Runs the community: courses, events, challenges and moderation',
      },
      update: {},
    });
  }

  async list() {
    const rows = await prisma.userRole.findMany({
      where: { role: { name: COMMUNITY_MANAGER_ROLE } },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        user: { select: { id: true, email: true, displayName: true, avatar: true } },
      },
    });
    return rows.map((r) => ({ ...r.user, grantedAt: r.createdAt }));
  }

  async grant(email: string) {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) throw new BadRequestException('Email is required');
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      select: { id: true, email: true, displayName: true, avatar: true },
    });
    if (!user) throw new NotFoundException('No member with that email — ask them to sign up first');
    const role = await this.ensureRole();
    const existing = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id } });
    if (!existing) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return user;
  }

  async revoke(userId: string) {
    await prisma.userRole.deleteMany({ where: { userId, role: { name: COMMUNITY_MANAGER_ROLE } } });
    return { revoked: true };
  }
}
