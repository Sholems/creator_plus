import { BadRequestException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { CommunityChallengesService } from './community-challenges.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    communityChallengeEnrollment: { findUnique: jest.fn() },
    communityChallengeMilestone: { findFirst: jest.fn() },
    communityChallengeCheckIn: { create: jest.fn() },
  },
}));

const p = prisma as any;

describe('CommunityChallengesService', () => {
  const service = new CommunityChallengesService(
    { assertAccess: jest.fn().mockResolvedValue({ isAdmin: false }) } as any,
    { award: jest.fn() } as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('requires enrollment before accepting a progress check-in', async () => {
    p.communityChallengeEnrollment.findUnique.mockResolvedValue(null);
    await expect(
      service.checkIn('u1', 'c1', { progress: 25, note: 'Started' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(p.communityChallengeCheckIn.create).not.toHaveBeenCalled();
  });
});
