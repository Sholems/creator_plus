import { BadRequestException } from '@nestjs/common';
import { CommunityAdminService } from './community-admin.service';

describe('CommunityAdminService', () => {
  const service = new CommunityAdminService();

  it('rejects unknown report workflow states', async () => {
    await expect(service.reports('INVALID')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects participation states outside the community-only suspension model', async () => {
    await expect(
      service.setParticipation('admin', 'member', 'BANNED' as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
