import { ForbiddenException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { QrEntitlementsService } from './qr-entitlements.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    qrEntitlement: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    qrCampaign: {
      count: jest.fn(),
    },
  },
}));

const p = prisma as unknown as {
  qrEntitlement: { findMany: jest.Mock; updateMany: jest.Mock; create: jest.Mock };
  qrCampaign: { count: jest.Mock };
};

function entitlement(overrides: Partial<any> = {}) {
  const now = Date.now();
  return {
    id: 'ent-1',
    userId: 'user-1',
    kind: 'CAMPAIGN_CREDIT',
    status: 'ACTIVE',
    startsAt: new Date(now - 1000),
    expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000),
    campaignCreditsTotal: 1,
    campaignCreditsUsed: 0,
    maxActiveCampaigns: 1,
    ...overrides,
  };
}

describe('QrEntitlementsService', () => {
  const service = new QrEntitlementsService();

  beforeEach(() => {
    jest.clearAllMocks();
    p.qrEntitlement.updateMany.mockResolvedValue({ count: 0 });
  });

  it('rejects campaign creation without any paid entitlement (R1)', async () => {
    p.qrEntitlement.findMany.mockResolvedValue([]);
    await expect(service.assertCanCreateCampaign('user-1', 'FILE')).rejects.toThrow(
      'Choose a QR Studio plan',
    );
  });

  it('allows a FILE campaign on a Single credit with a free slot (R2)', async () => {
    p.qrEntitlement.findMany.mockResolvedValue([entitlement()]);
    p.qrCampaign.count.mockResolvedValue(0);
    await expect(service.assertCanCreateCampaign('user-1', 'FILE')).resolves.toEqual({ hasPro: false });
  });

  it('rejects a second active campaign once the Single slot is full (R2)', async () => {
    p.qrEntitlement.findMany.mockResolvedValue([entitlement({ maxActiveCampaigns: 1 })]);
    p.qrCampaign.count.mockResolvedValue(1); // slot already used
    await expect(service.assertCanCreateCampaign('user-1', 'FILE')).rejects.toThrow(
      'no available campaign slots',
    );
  });

  it('rejects a Pro-only content type for a basic (non-Pro) entitlement (R16, KTD8)', async () => {
    p.qrEntitlement.findMany.mockResolvedValue([entitlement()]);
    p.qrCampaign.count.mockResolvedValue(0);
    await expect(service.assertCanCreateCampaign('user-1', 'WHATSAPP')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lets a Pro pass activate up to 20 campaigns and blocks the 21st (R4)', async () => {
    const pro = entitlement({ id: 'pro-1', kind: 'PRO_PASS', maxActiveCampaigns: 20, campaignCreditsTotal: 0 });
    p.qrEntitlement.findMany.mockResolvedValue([pro]);

    p.qrCampaign.count.mockResolvedValueOnce(19); // room for the 20th
    await expect(service.chooseEntitlementForActivation('user-1', 'FILE')).resolves.toMatchObject({ id: 'pro-1' });

    p.qrCampaign.count.mockResolvedValue(20); // full
    await expect(service.chooseEntitlementForActivation('user-1', 'FILE')).rejects.toThrow(
      'no available campaign slots',
    );
  });

  it('snapshots the purchased offer onto the granted entitlement (R3, KTD9)', async () => {
    p.qrEntitlement.create.mockResolvedValue({ id: 'ent-pack' });
    const now = new Date('2026-10-01T00:00:00.000Z');
    await service.grantFromPayment({ userId: 'user-1', offerCode: 'PACK', paymentId: 'pay-1', now });

    expect(p.qrEntitlement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        paymentId: 'pay-1',
        offerCode: 'PACK',
        kind: 'CAMPAIGN_CREDIT',
        campaignCreditsTotal: 5,
        maxActiveCampaigns: 5,
        status: 'ACTIVE',
        startsAt: now,
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      }),
    });
  });
});
