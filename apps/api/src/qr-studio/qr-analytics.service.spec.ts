import { QrAnalyticsService } from './qr-analytics.service';
import { prisma } from '@creatorplus/database';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    qrScanEvent: {
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('QrAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists only minimized request metadata', async () => {
    await new QrAnalyticsService().recordEvent({
      campaignId: 'campaign-id',
      kind: 'SCAN',
      ip: '203.0.113.10',
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
      referer: 'https://example.com/path?token=secret#fragment',
    });

    expect(prisma.qrScanEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: 'campaign-id',
        kind: 'SCAN',
        referrerOrigin: 'https://example.com',
        userAgentFamily: 'Chrome',
        deviceClass: 'desktop',
      }),
    });
    const data = (prisma.qrScanEvent.create as jest.Mock).mock.calls[0][0].data;
    expect(data.ipAddress).toBeUndefined();
    expect(data.userAgent).toBeUndefined();
    expect(data.referer).toBeUndefined();
    expect(data.referrerOrigin).not.toContain('token=secret');
  });
});
