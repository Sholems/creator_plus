import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { prisma, QrEventKind } from '@creatorplus/database';

@Injectable()
export class QrAnalyticsService {
  async recordEvent(input: {
    campaignId: string;
    kind: QrEventKind;
    ip?: string | null;
    userAgent?: string | null;
    referer?: string | null;
  }) {
    await prisma.qrScanEvent.create({
      data: {
        campaignId: input.campaignId,
        kind: input.kind,
        requestHash: this.nonLinkableRequestHash(input.ip),
        referrerOrigin: this.referrerOrigin(input.referer),
        userAgentFamily: this.userAgentFamily(input.userAgent),
        deviceClass: this.deviceClass(input.userAgent),
      },
    });
  }

  async summary(campaignId: string) {
    const [scans, opens] = await Promise.all([
      prisma.qrScanEvent.count({ where: { campaignId, kind: 'SCAN' } }),
      prisma.qrScanEvent.count({ where: { campaignId, kind: 'OPEN' } }),
    ]);
    return { scans, opens };
  }

  private nonLinkableRequestHash(ip?: string | null) {
    if (!ip) return null;
    const day = new Date().toISOString().slice(0, 10);
    const secret = process.env.QR_ANALYTICS_HASH_SECRET || process.env.JWT_SECRET || 'creatorplus-qr';
    return createHmac('sha256', `${secret}:${day}`).update(ip).digest('hex').slice(0, 24);
  }

  private referrerOrigin(referer?: string | null) {
    if (!referer) return null;
    try {
      const url = new URL(referer);
      return url.origin;
    } catch {
      return null;
    }
  }

  private userAgentFamily(userAgent?: string | null) {
    const ua = (userAgent || '').toLowerCase();
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('edg/')) return 'Edge';
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('safari')) return 'Safari';
    return ua ? 'Other' : null;
  }

  private deviceClass(userAgent?: string | null) {
    const ua = (userAgent || '').toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
    if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
    return ua ? 'desktop' : null;
  }
}
