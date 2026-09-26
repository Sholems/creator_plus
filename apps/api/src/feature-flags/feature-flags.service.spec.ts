import { prisma } from '@creatorplus/database';
import { FeatureFlagsService } from './feature-flags.service';

jest.mock('@creatorplus/database', () => ({
  prisma: { featureFlag: { findUnique: jest.fn() } },
}));

const p = prisma as any;

describe('FeatureFlagsService.isEnabled', () => {
  const service = new FeatureFlagsService();

  beforeEach(() => jest.clearAllMocks());

  it('enforces the configured environment', async () => {
    p.featureFlag.findUnique.mockResolvedValue({
      name: 'community-shell',
      isEnabled: true,
      rolloutPercentage: 100,
      environment: 'production',
    });
    await expect(service.isEnabled('community-shell', 'user-1', 'staging')).resolves.toBe(false);
    await expect(service.isEnabled('community-shell', 'user-1', 'production')).resolves.toBe(true);
  });

  it('never treats an anonymous request as eligible for a partial rollout', async () => {
    p.featureFlag.findUnique.mockResolvedValue({
      name: 'community-shell',
      isEnabled: true,
      rolloutPercentage: 50,
      environment: null,
    });
    await expect(service.isEnabled('community-shell')).resolves.toBe(false);
  });

  it('buckets the same authenticated user deterministically', async () => {
    p.featureFlag.findUnique.mockResolvedValue({
      name: 'community-shell',
      isEnabled: true,
      rolloutPercentage: 37,
      environment: null,
    });
    const first = await service.isEnabled('community-shell', 'user-1');
    await expect(service.isEnabled('community-shell', 'user-1')).resolves.toBe(first);
  });
});
