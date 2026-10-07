import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { MembershipService } from '../membership/membership.service';
import { CommunityAccessContext, CommunityAccessLevelValue } from './dto/community-shared.dto';

@Injectable()
export class CommunityAccessService {
  constructor(private readonly membership: MembershipService) {}

  async assertAccess(
    userId: string,
    options: { accessLevel?: CommunityAccessLevelValue } = {},
  ): Promise<CommunityAccessContext> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        communityProfile: { select: { participationStatus: true } },
      },
    });
    if (!user) throw new UnauthorizedException('Account not found');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('Account is not active');
    if (user.communityProfile?.participationStatus === 'SUSPENDED') {
      throw new ForbiddenException('CreatorPlus Community participation is suspended');
    }

    const roles = await prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { name: true } } },
    });
    const isAdmin = roles.some(({ role }) => role.name === 'admin' || role.name === 'super_admin');
    const needsPremium = options.accessLevel === 'PREMIUM';
    const hasPremiumAccess =
      isAdmin || (needsPremium && (await this.membership.hasActiveMembership(userId)));
    if (needsPremium && !hasPremiumAccess) {
      throw new ForbiddenException('A premium CreatorPlus Community pass is required');
    }
    return { userId, isAdmin, hasPremiumAccess };
  }
}
