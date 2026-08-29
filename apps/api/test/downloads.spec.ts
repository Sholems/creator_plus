import { prisma } from '@creatorplus/database';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { DownloadsService } from '../src/downloads/downloads.service';
import {
  resetDb,
  createUser,
  createCreatorWithProduct,
  createGrantedDownload,
  storageStub,
} from './helpers';

/**
 * Integration coverage for download authorization + metering — C5. Requires a
 * live Postgres (see test/README.md).
 */
describe('DownloadsService.issueSignedUrls (integration)', () => {
  const service = new DownloadsService(storageStub);

  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it('issues signed URLs to the owner and consumes one slot', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    const download = await createGrantedDownload(buyer.id, product, { maxDownloads: 3 });

    const result = await service.issueSignedUrls(download.token, buyer.id);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].downloadUrl).toContain('https://signed.example/');

    const after = await prisma.download.findUniqueOrThrow({ where: { id: download.id } });
    expect(after.downloadCount).toBe(1);
    expect(await prisma.downloadLog.count({ where: { downloadId: download.id } })).toBe(1);
  });

  it('refuses a token that belongs to another user', async () => {
    const buyer = await createUser();
    const attacker = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    const download = await createGrantedDownload(buyer.id, product);

    await expect(service.issueSignedUrls(download.token, attacker.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    // No slot consumed by the failed attempt.
    const after = await prisma.download.findUniqueOrThrow({ where: { id: download.id } });
    expect(after.downloadCount).toBe(0);
  });

  it('enforces the maxDownloads cap across repeated calls', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    const download = await createGrantedDownload(buyer.id, product, { maxDownloads: 2 });

    await service.issueSignedUrls(download.token, buyer.id); // 1
    await service.issueSignedUrls(download.token, buyer.id); // 2
    await expect(service.issueSignedUrls(download.token, buyer.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('never exceeds the cap under concurrency (atomic consume)', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    const download = await createGrantedDownload(buyer.id, product, { maxDownloads: 1 });

    const results = await Promise.allSettled([
      service.issueSignedUrls(download.token, buyer.id),
      service.issueSignedUrls(download.token, buyer.id),
      service.issueSignedUrls(download.token, buyer.id),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(1);

    const after = await prisma.download.findUniqueOrThrow({ where: { id: download.id } });
    expect(after.downloadCount).toBe(1); // never 2 or 3
  });

  it('rejects an expired grant', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(1000);
    const download = await createGrantedDownload(buyer.id, product, {
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.issueSignedUrls(download.token, buyer.id)).rejects.toThrow(/expired/i);
  });
});
