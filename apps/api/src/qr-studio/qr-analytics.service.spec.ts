import { QrAnalyticsService } from './qr-analytics.service';
import { prisma } from '@creatorplus/database';

jest.mock('@creatorplus/database', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    empty: { strings: [''], values: [] },
  },
  prisma: {
    qrScanEvent: {
      create: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
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
      country: 'ng',
      actionType: 'continue',
    });

    expect(prisma.qrScanEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        campaignId: 'campaign-id',
        kind: 'SCAN',
        referrerOrigin: 'https://example.com',
        userAgentFamily: 'Chrome',
        deviceClass: 'desktop',
        country: 'NG',
        actionType: 'CONTINUE',
      }),
    });
    const data = (prisma.qrScanEvent.create as jest.Mock).mock.calls[0][0].data;
    expect(data.ipAddress).toBeUndefined();
    expect(data.userAgent).toBeUndefined();
    expect(data.referer).toBeUndefined();
    expect(data.referrerOrigin).not.toContain('token=secret');
  });

  it('does not let analytics persistence failures escape into the scan path', async () => {
    (prisma.qrScanEvent.create as jest.Mock).mockRejectedValueOnce(new Error('database unavailable'));

    await expect(new QrAnalyticsService().recordEvent({
      campaignId: 'campaign-id',
      kind: 'SCAN',
      ip: '203.0.113.10',
    })).resolves.toBe(false);
  });

  it('returns an owner-scoped analytics overview with normalized counts', async () => {
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ scans: 12n, actions: 5n, unique_scans: 9n }])
      .mockResolvedValueOnce([
        { day: new Date('2026-10-25T00:00:00Z'), scans: 4n, actions: 2n, unique_scans: 3n },
      ])
      .mockResolvedValueOnce([{ campaign_id: 'c1', title: 'Guide', scans: 12n, actions: 5n }])
      .mockResolvedValueOnce([{ label: 'mobile', count: 8n }])
      .mockResolvedValueOnce([{ label: 'Chrome', count: 7n }])
      .mockResolvedValueOnce([{ label: 'NG', count: 6n }])
      .mockResolvedValueOnce([{ label: 'Direct / unknown', count: 9n }])
      .mockResolvedValueOnce([{ label: 'CONTINUE', count: 5n }]);

    const result = await new QrAnalyticsService().overview('owner-id', {
      from: '2026-10-25',
      to: '2026-10-26',
    });

    expect(result.totals).toEqual({ scans: 12, uniqueScans: 9, actions: 5, actionRate: 41.7 });
    expect(result.timeline).toEqual([
      { date: '2026-10-25', scans: 4, actions: 2, uniqueScans: 3 },
      { date: '2026-10-26', scans: 0, actions: 0, uniqueScans: 0 },
    ]);
    expect(result.campaigns[0]).toEqual({ campaignId: 'c1', title: 'Guide', scans: 12, actions: 5, actionRate: 41.7 });
    expect(result.breakdowns.devices).toEqual([{ label: 'mobile', count: 8 }]);
  });
});
