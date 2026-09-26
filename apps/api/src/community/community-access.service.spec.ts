import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { CommunityAccessService } from './community-access.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    userRole: { findMany: jest.fn() },
  },
}));

const p = prisma as any;

describe('CommunityAccessService', () => {
  const membership = { hasActiveMembership: jest.fn() } as any;
  const service = new CommunityAccessService(membership);

  beforeEach(() => {
    jest.clearAllMocks();
    p.userRole.findMany.mockResolvedValue([]);
    membership.hasActiveMembership.mockResolvedValue(false);
  });

  it('allows an active registered user to use free community features', async () => {
    p.user.findUnique.mockResolvedValue({ status: 'ACTIVE', communityProfile: null });
    await expect(service.assertAccess('user-1', { accessLevel: 'FREE' })).resolves.toMatchObject({
      isAdmin: false,
      hasPremiumAccess: false,
    });
  });

  it.each(['SUSPENDED', 'DEACTIVATED'])('rejects a %s account', async (status) => {
    p.user.findUnique.mockResolvedValue({ status, communityProfile: null });
    await expect(service.assertAccess('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a community-suspended member without changing account status', async () => {
    p.user.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      communityProfile: { participationStatus: 'SUSPENDED' },
    });
    await expect(service.assertAccess('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a current premium pass for premium content', async () => {
    p.user.findUnique.mockResolvedValue({ status: 'ACTIVE', communityProfile: null });
    await expect(service.assertAccess('user-1', { accessLevel: 'PREMIUM' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    membership.hasActiveMembership.mockResolvedValue(true);
    await expect(service.assertAccess('user-1', { accessLevel: 'PREMIUM' })).resolves.toMatchObject(
      { hasPremiumAccess: true },
    );
  });

  it('lets an admin bypass premium entitlement but not account suspension', async () => {
    p.user.findUnique.mockResolvedValue({ status: 'ACTIVE', communityProfile: null });
    p.userRole.findMany.mockResolvedValue([{ role: { name: 'admin' } }]);
    await expect(
      service.assertAccess('admin-1', { accessLevel: 'PREMIUM' }),
    ).resolves.toMatchObject({ isAdmin: true, hasPremiumAccess: true });

    p.user.findUnique.mockResolvedValue({ status: 'SUSPENDED', communityProfile: null });
    await expect(service.assertAccess('admin-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unknown token subject', async () => {
    p.user.findUnique.mockResolvedValue(null);
    await expect(service.assertAccess('missing')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
