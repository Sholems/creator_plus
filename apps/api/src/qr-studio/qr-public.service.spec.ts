import { NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { QrPublicService } from './qr-public.service';

jest.mock('@creatorplus/database', () => ({
  prisma: { qrCampaign: { findUnique: jest.fn() } },
}));

const p = prisma as any;

function build(available: boolean) {
  const storage = { getSignedDownloadUrl: jest.fn().mockResolvedValue('https://r2.example/signed?token=abc') } as any;
  const analytics = { recordEvent: jest.fn().mockResolvedValue(true) } as any;
  const campaigns = { isPubliclyAvailable: jest.fn().mockResolvedValue(available) } as any;
  return { service: new QrPublicService(storage, analytics, campaigns), storage, analytics, campaigns };
}

const activeFileCampaign = {
  id: 'c1',
  publicCode: 'ABCDEF',
  title: 'Guide',
  description: 'A guide',
  contentType: 'FILE',
  scanMode: 'LANDING_PAGE',
  destinationUrl: null,
  brandName: 'Brand',
  brandPrimaryColor: '#143c2b',
  brandAccentColor: '#f59e0b',
  designSettings: null,
  entitlement: {},
  assets: [
    { id: 'a1', kind: 'CAMPAIGN_FILE', fileName: 'guide.pdf', fileSize: 1234, mimeType: 'application/pdf', safetyStatus: 'APPROVED' },
  ],
};

describe('QrPublicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.QR_SIGNED_URL_TTL_SECONDS;
  });

  it('returns a uniform unavailable shape for inactive campaigns and records nothing (AE7, R14)', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({ ...activeFileCampaign });
    const { service, analytics } = build(false); // not publicly available
    const res = await service.resolve('ABCDEF', {});
    expect(res.available).toBe(false);
    expect(res.mode).toBe('UNAVAILABLE');
    expect(analytics.recordEvent).not.toHaveBeenCalled();
  });

  it('returns a uniform unavailable shape for an unknown code (enumeration-safe, R27)', async () => {
    p.qrCampaign.findUnique.mockResolvedValue(null);
    const { service } = build(true);
    const res = await service.resolve('NOPE', {});
    expect(res).toMatchObject({ available: false, mode: 'UNAVAILABLE' });
  });

  it('never leaks a file key or signed URL in the landing resolve response (R39)', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({ ...activeFileCampaign });
    const { service, analytics } = build(true);
    const res: any = await service.resolve('ABCDEF', { ip: '1.2.3.4', headers: {} });

    expect(res.available).toBe(true);
    expect(res.mode).toBe('LANDING_PAGE');
    expect(res.canOpenFile).toBe(true);
    expect(res.asset).toMatchObject({ fileName: 'guide.pdf', mimeType: 'application/pdf' });
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain('fileKey');
    expect(serialized).not.toMatch(/https?:\/\/[^"']*(token|signature|X-Amz)/i);
    expect(analytics.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ kind: 'SCAN' }));
  });

  it('passes Cloudflare country metadata without making analytics a scan dependency', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({ ...activeFileCampaign });
    const { service, analytics } = build(true);
    analytics.recordEvent.mockRejectedValueOnce(new Error('analytics unavailable'));

    const res: any = await service.resolve('ABCDEF', {
      ip: '1.2.3.4',
      headers: { 'cf-ipcountry': 'NG' },
    });

    expect(res.available).toBe(true);
    expect(analytics.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ country: 'NG' }));
  });

  it('records a validated action for an available campaign', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({ ...activeFileCampaign });
    const { service, analytics } = build(true);

    const result = await service.recordAction('ABCDEF', 'FILE_OPEN', { headers: { 'cf-ipcountry': 'NG' } });

    expect(result).toEqual({ recorded: true });
    expect(analytics.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'ACTION',
      actionType: 'FILE_OPEN',
      country: 'NG',
    }));
  });

  it('ignores a stale hosted asset after a campaign changes to a URL destination', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({
      ...activeFileCampaign,
      contentType: 'WEBSITE',
      destinationUrl: 'https://mycreatorplus.com/courses',
    });
    const { service } = build(true);

    const res: any = await service.resolve('ABCDEF', { headers: {} });

    expect(res.destinationUrl).toBe('https://mycreatorplus.com/courses');
    expect(res.canOpenFile).toBe(false);
    expect(res.asset).toBeNull();
  });

  it('issues a short-lived signed URL only from openFile, and records an OPEN event (R29)', async () => {
    process.env.QR_SIGNED_URL_TTL_SECONDS = '300';
    p.qrCampaign.findUnique.mockResolvedValue({
      ...activeFileCampaign,
      assets: [{ id: 'a1', fileKey: 'qr/private/guide.pdf', fileName: 'guide.pdf', mimeType: 'application/pdf' }],
    });
    const { service, storage, analytics } = build(true);
    const res = await service.openFile('ABCDEF', { headers: {} });

    expect(storage.getSignedDownloadUrl).toHaveBeenCalledWith('qr/private/guide.pdf', 300);
    expect(res.expiresIn).toBe(300);
    expect(res.url).toContain('signed');
    expect(analytics.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ kind: 'OPEN' }));
  });

  it('caps the signed-URL TTL at 900s even if misconfigured higher', async () => {
    process.env.QR_SIGNED_URL_TTL_SECONDS = '99999';
    p.qrCampaign.findUnique.mockResolvedValue({
      ...activeFileCampaign,
      assets: [{ id: 'a1', fileKey: 'k', fileName: 'g.pdf', mimeType: 'application/pdf' }],
    });
    const { service } = build(true);
    const res = await service.openFile('ABCDEF', { headers: {} });
    expect(res.expiresIn).toBe(900);
  });

  it('does not count a file action when secure-link generation fails', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({
      ...activeFileCampaign,
      assets: [{ id: 'a1', fileKey: 'k', fileName: 'g.pdf', mimeType: 'application/pdf' }],
    });
    const { service, storage, analytics } = build(true);
    storage.getSignedDownloadUrl.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(service.openFile('ABCDEF', { headers: {} })).rejects.toThrow('storage unavailable');
    expect(analytics.recordEvent).not.toHaveBeenCalled();
  });

  it('refuses openFile for an unavailable campaign (R14)', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({ ...activeFileCampaign, assets: [] });
    const { service } = build(false);
    await expect(service.openFile('ABCDEF', { headers: {} })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not expose a stale file after the campaign changes away from a file type', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({
      ...activeFileCampaign,
      contentType: 'WEBSITE',
      destinationUrl: 'https://mycreatorplus.com/courses',
      assets: [{ id: 'a1', fileKey: 'qr/private/guide.pdf', fileName: 'guide.pdf', mimeType: 'application/pdf' }],
    });
    const { service, storage } = build(true);

    await expect(service.openFile('ABCDEF', { headers: {} })).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.getSignedDownloadUrl).not.toHaveBeenCalled();
  });
});
