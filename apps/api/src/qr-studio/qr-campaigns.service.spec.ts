import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { QrCampaignsService } from './qr-campaigns.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    qrCampaign: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    qrPlacementVariant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    qrAsset: { findFirst: jest.fn() },
  },
  Prisma: { JsonNull: 'JsonNull' },
}));

const p = prisma as any;

function build(ent: Partial<any> = {}) {
  const entitlements = {
    assertCanCreateCampaign: jest.fn().mockResolvedValue({ hasPro: false }),
    chooseEntitlementForActivation: jest.fn(),
    listForUser: jest.fn().mockResolvedValue({ hasPro: false }),
    ...ent,
  } as any;
  return { service: new QrCampaignsService(entitlements), entitlements };
}

const fileCampaign = (over: any = {}) => ({
  id: 'c1',
  ownerId: 'u1',
  publicCode: 'stable-code',
  title: 'Guide',
  description: null,
  contentType: 'FILE',
  status: 'DRAFT',
  scanMode: 'LANDING_PAGE',
  destinationUrl: null,
  destinationData: null,
  expiresAt: null,
  activatedAt: null,
  ...over,
});

describe('QrCampaignsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.QR_STUDIO_ENABLED;
  });

  it('rejects create when QR Studio is disabled', async () => {
    process.env.QR_STUDIO_ENABLED = 'false';
    const { service } = build();
    await expect(service.create('u1', { title: 'x', contentType: 'FILE' } as any)).rejects.toThrow(
      'not available',
    );
  });

  it('throws NotFound for a campaign the user does not own (R-ownership)', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(null);
    const { service } = build();
    await expect(service.requireOwnerCampaign('u1', 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('generates a high-entropy public code on create', async () => {
    p.qrCampaign.findUnique.mockResolvedValue(null); // code is unused
    p.qrCampaign.create.mockResolvedValue(fileCampaign());
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign());
    const { service, entitlements } = build();

    await service.create('u1', { title: 'Guide', contentType: 'FILE' } as any);

    expect(entitlements.assertCanCreateCampaign).toHaveBeenCalledWith('u1', 'FILE');
    const createArg = p.qrCampaign.create.mock.calls[0][0].data;
    expect(typeof createArg.publicCode).toBe('string');
    expect(createArg.publicCode.length).toBeGreaterThanOrEqual(20); // 18 random bytes, base64url
  });

  it('keeps the public code stable across an update (R8, R12)', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign());
    p.qrCampaign.update.mockResolvedValue({});
    const { service } = build({
      listForUser: jest.fn().mockResolvedValue({ hasPro: false, entitlements: [{ status: 'ACTIVE', expiresAt: new Date(Date.now() + 1e9) }] }),
    });

    await service.update('u1', 'c1', { title: 'New title' } as any);

    const updateData = p.qrCampaign.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('publicCode');
    expect(updateData.title).toBe('New title');
  });

  it('duplicates a campaign as a fresh draft with a new stable code', async () => {
    p.qrCampaign.findFirst
      .mockResolvedValueOnce(fileCampaign({
        title: 'Conference guide',
        folder: 'Events',
        tags: ['conference', 'lagos'],
        destinationData: { text: 'Welcome' },
        brandName: 'CreatorPlus',
      }))
      .mockResolvedValueOnce(fileCampaign({ id: 'c2', title: 'Conference guide copy' }));
    p.qrCampaign.findUnique.mockResolvedValue(null);
    p.qrCampaign.create.mockResolvedValue(fileCampaign({ id: 'c2' }));
    const { service } = build({ assertCanCreateCampaign: jest.fn().mockResolvedValue({ hasPro: true }) });

    await service.duplicate('u1', 'c1');

    expect(p.qrCampaign.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: 'u1',
        title: 'Conference guide copy',
        status: 'DRAFT',
        folder: 'Events',
        tags: ['conference', 'lagos'],
      }),
    });
    expect(p.qrCampaign.create.mock.calls[0][0].data.publicCode).not.toBe('stable-code');
    expect(p.qrCampaign.create.mock.calls[0][0].data).not.toHaveProperty('entitlementId');
  });

  it('applies bulk pause only to campaigns owned by the requester', async () => {
    p.qrCampaign.updateMany.mockResolvedValue({ count: 2 });
    const { service } = build();

    const result = await service.bulkAction('u1', ['c1', 'c2'], 'PAUSE');

    expect(p.qrCampaign.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['c1', 'c2'] }, ownerId: 'u1', status: 'ACTIVE' },
      data: { status: 'PAUSED' },
    });
    expect(result).toEqual({ updated: 2 });
  });

  it('creates a placement variant with governed UTM fields', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({
      contentType: 'WEBSITE',
      destinationUrl: 'https://example.com/guide?existing=1',
    }));
    p.qrCampaign.findUnique.mockResolvedValue(null);
    p.qrPlacementVariant.findUnique.mockResolvedValue(null);
    p.qrPlacementVariant.create.mockResolvedValue({ id: 'v1' });
    const { service } = build({ listForUser: jest.fn().mockResolvedValue({ hasPro: true }) });

    await service.createVariant('u1', 'c1', {
      name: 'Conference banner',
      utmSource: 'conference',
      utmMedium: 'banner',
      utmCampaign: 'growth-club',
    } as any);

    expect(p.qrPlacementVariant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: 'c1',
        name: 'Conference banner',
        utmSource: 'conference',
        utmMedium: 'banner',
        utmCampaign: 'growth-club',
      }),
    });
  });

  it('keeps placement variants behind Pro access', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({ contentType: 'WEBSITE' }));
    const { service } = build({ listForUser: jest.fn().mockResolvedValue({ hasPro: false }) });

    await expect(service.createVariant('u1', 'c1', {
      name: 'Conference banner',
    } as any)).rejects.toBeInstanceOf(ForbiddenException);

    expect(p.qrPlacementVariant.create).not.toHaveBeenCalled();
  });

  it('rejects a blank placement name after normalization', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({ contentType: 'WEBSITE' }));
    const { service } = build({ listForUser: jest.fn().mockResolvedValue({ hasPro: true }) });

    await expect(service.createVariant('u1', 'c1', {
      name: '   ',
    } as any)).rejects.toBeInstanceOf(BadRequestException);

    expect(p.qrPlacementVariant.create).not.toHaveBeenCalled();
  });

  it('rejects UTM attribution for non-website campaigns', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({ contentType: 'FILE' }));
    const { service } = build({ listForUser: jest.fn().mockResolvedValue({ hasPro: true }) });

    await expect(service.createVariant('u1', 'c1', {
      name: 'Conference banner',
      utmSource: 'conference',
    } as any)).rejects.toBeInstanceOf(BadRequestException);

    expect(p.qrPlacementVariant.create).not.toHaveBeenCalled();
  });

  it('lets expired Pro users disable a placement but not re-enable it', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({ contentType: 'WEBSITE' }));
    p.qrPlacementVariant.findFirst.mockResolvedValue({ id: 'v1', campaignId: 'c1' });
    p.qrPlacementVariant.update.mockResolvedValue({ id: 'v1', publicCode: 'p_code', active: false });
    const { service } = build({ listForUser: jest.fn().mockResolvedValue({ hasPro: false }) });

    await expect(service.updateVariant('u1', 'c1', 'v1', { active: false })).resolves.toMatchObject({
      active: false,
    });
    await expect(service.updateVariant('u1', 'c1', 'v1', { active: true })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows free tier users to update allowed content types like WHATSAPP or VCARD', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({ contentType: 'WHATSAPP', destinationUrl: 'https://wa.me/2348012345678' }));
    p.qrCampaign.update.mockResolvedValue({});
    const { service } = build({
      listForUser: jest.fn().mockResolvedValue({ hasPro: false, entitlements: [] }),
    });

    await service.update('u1', 'c1', {
      title: 'WhatsApp Contact',
      destinationData: { phone: '+2348099998888', message: 'Hello Creator' },
    } as any);

    const updateData = p.qrCampaign.update.mock.calls[0][0].data;
    expect(updateData.title).toBe('WhatsApp Contact');
    expect(updateData.destinationUrl).toBe('https://wa.me/2348099998888');
    expect(updateData.destinationData).toEqual({ phone: '+2348099998888', message: 'Hello Creator' });
  });

  it('rejects free tier users switching to an upload content type', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({ contentType: 'WEBSITE', destinationUrl: 'https://creatorplus.com' }));
    const { service } = build({
      listForUser: jest.fn().mockResolvedValue({ hasPro: false, entitlements: [] }),
    });

    await expect(
      service.update('u1', 'c1', {
        contentType: 'FILE',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps an active campaign on its current destination until an approved upload exists', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({
      contentType: 'WEBSITE',
      destinationUrl: 'https://creatorplus.com',
      status: 'ACTIVE',
    }));
    p.qrAsset.findFirst.mockResolvedValue(null);
    const { service } = build({
      listForUser: jest.fn().mockResolvedValue({ hasPro: true, entitlements: [] }),
    });

    await expect(
      service.update('u1', 'c1', { contentType: 'FILE' } as any),
    ).rejects.toThrow('approved file');
    expect(p.qrCampaign.update).not.toHaveBeenCalled();
  });

  it('blocks activation of a file campaign with no approved asset (R28, AE8)', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign());
    p.qrAsset.findFirst.mockResolvedValue(null); // no approved asset
    const { service } = build({
      chooseEntitlementForActivation: jest.fn().mockResolvedValue({ id: 'ent-1', expiresAt: new Date(Date.now() + 1e9) }),
    });

    await expect(service.activate('u1', 'c1')).rejects.toThrow('approved file');
  });

  it('blocks direct-open activation for a non-Pro user (R10)', async () => {
    p.qrCampaign.findFirst.mockResolvedValue(fileCampaign({ scanMode: 'DIRECT_OPEN', contentType: 'WEBSITE', destinationUrl: 'https://x.com' }));
    const { service } = build({
      chooseEntitlementForActivation: jest.fn().mockResolvedValue({ id: 'ent-1', expiresAt: new Date(Date.now() + 1e9) }),
      listForUser: jest.fn().mockResolvedValue({ hasPro: false }),
    });

    await expect(service.activate('u1', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('computes public availability from status, expiry, and entitlement (R14)', async () => {
    const { service } = build();
    const future = new Date(Date.now() + 1e9);
    expect(await service.isPubliclyAvailable({ status: 'ACTIVE', expiresAt: future, entitlement: null })).toBe(true);
    expect(await service.isPubliclyAvailable({ status: 'PAUSED', expiresAt: future, entitlement: null })).toBe(false);
    expect(await service.isPubliclyAvailable({ status: 'ACTIVE', expiresAt: new Date(Date.now() - 1000), entitlement: null })).toBe(false);
    expect(
      await service.isPubliclyAvailable({ status: 'ACTIVE', expiresAt: future, entitlement: { status: 'EXPIRED', expiresAt: future } }),
    ).toBe(false);
  });
});
