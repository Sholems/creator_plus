import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { QrAssetsService } from './qr-assets.service';

jest.mock('@creatorplus/database', () => ({
  prisma: { $transaction: jest.fn(), qrAsset: { updateMany: jest.fn(), create: jest.fn() } },
}));

jest.mock('./qr-asset-validation', () => ({ validateQrAsset: jest.fn() }));

const p = prisma as any;

function build() {
  const storage = { uploadFile: jest.fn().mockResolvedValue({ key: 'qr/campaigns/c1/files/x.pdf', url: 'ignored' }) } as any;
  const campaigns = { requireOwnerCampaign: jest.fn().mockResolvedValue({ id: 'c1' }) } as any;
  const fileSafety = { initialStatus: jest.fn().mockReturnValue('PENDING_SCAN') } as any;
  return { service: new QrAssetsService(storage, campaigns, fileSafety), storage, campaigns };
}

const file = { originalname: 'guide.pdf', mimetype: 'application/pdf', size: 2048, buffer: Buffer.from('pdf') };

describe('QrAssetsService.upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refuses upload for a campaign the user does not own, before touching storage', async () => {
    const { service, storage, campaigns } = build();
    campaigns.requireOwnerCampaign.mockRejectedValue(new ForbiddenException('nope'));
    await expect(service.upload('u1', 'c1', file as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it('stores the file, starts it PENDING_SCAN, deactivates the previous file, and never returns the key (R28, R39)', async () => {
    const tx = {
      qrAsset: {
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({
          id: 'a1',
          kind: 'CAMPAIGN_FILE',
          fileName: 'guide.pdf',
          fileSize: BigInt(2048),
          mimeType: 'application/pdf',
          safetyStatus: 'PENDING_SCAN',
          active: true,
        }),
      },
    };
    p.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const { service } = build();
    const asset: any = await service.upload('u1', 'c1', file as any, 'CAMPAIGN_FILE');

    expect(tx.qrAsset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ campaignId: 'c1', active: true }), data: { active: false } }),
    );
    expect(tx.qrAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fileKey: 'qr/campaigns/c1/files/x.pdf', safetyStatus: 'PENDING_SCAN' }) }),
    );
    expect(asset.safetyStatus).toBe('PENDING_SCAN');
    expect(asset).not.toHaveProperty('fileKey');
  });
});
