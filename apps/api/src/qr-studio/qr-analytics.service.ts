import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { prisma, Prisma, QrEventKind } from '@creatorplus/database';

type AnalyticsQuery = {
  from?: string;
  to?: string;
  campaignId?: string;
};

type CountRow = { label: string | null; count: bigint | number };

@Injectable()
export class QrAnalyticsService {
  private readonly logger = new Logger(QrAnalyticsService.name);
  private lastPersistenceWarningAt = 0;

  async recordEvent(input: {
    campaignId: string;
    kind: QrEventKind;
    actionType?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    referer?: string | null;
    country?: string | null;
  }) {
    try {
      await prisma.qrScanEvent.create({
        data: {
          campaignId: input.campaignId,
          kind: input.kind,
          actionType: this.actionType(input.actionType),
          requestHash: this.nonLinkableRequestHash(input.ip),
          referrerOrigin: this.referrerOrigin(input.referer),
          userAgentFamily: this.userAgentFamily(input.userAgent),
          deviceClass: this.deviceClass(input.userAgent),
          country: this.countryCode(input.country),
        },
      });
      return true;
    } catch (error) {
      const now = Date.now();
      if (now - this.lastPersistenceWarningAt >= 60_000) {
        this.lastPersistenceWarningAt = now;
        this.logger.warn(`QR analytics event was not persisted: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
      return false;
    }
  }

  async summary(campaignId: string) {
    const [scans, opens] = await Promise.all([
      prisma.qrScanEvent.count({ where: { campaignId, kind: 'SCAN' } }),
      prisma.qrScanEvent.count({ where: { campaignId, kind: 'OPEN' } }),
    ]);
    return { scans, opens };
  }

  async overview(userId: string, query: AnalyticsQuery = {}) {
    const range = this.dateRange(query.from, query.to);
    const campaignFilter = query.campaignId
      ? Prisma.sql`AND e."campaign_id" = ${query.campaignId}::uuid`
      : Prisma.empty;
    const eventFilter = Prisma.sql`
      e."created_at" >= ${range.from}
      AND e."created_at" < ${range.toExclusive}
      AND c."owner_id" = ${userId}::uuid
      ${campaignFilter}
    `;

    const [totalsRows, timelineRows, campaignRows, devices, browsers, countries, referrers, actions] = await Promise.all([
      prisma.$queryRaw<Array<{ scans: bigint; actions: bigint; unique_scans: bigint }>>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE e.kind = 'SCAN') AS scans,
          COUNT(*) FILTER (WHERE e.kind IN ('ACTION', 'OPEN')) AS actions,
          COUNT(DISTINCT CASE WHEN e.kind = 'SCAN' AND e."request_hash" IS NOT NULL
            THEN CONCAT(e."created_at"::date, ':', e."request_hash") END)
            + COUNT(*) FILTER (WHERE e.kind = 'SCAN' AND e."request_hash" IS NULL) AS unique_scans
        FROM "qr_scan_events" e
        JOIN "qr_campaigns" c ON c.id = e."campaign_id"
        WHERE ${eventFilter}
      `),
      prisma.$queryRaw<Array<{ day: Date; scans: bigint; actions: bigint; unique_scans: bigint }>>(Prisma.sql`
        SELECT
          DATE_TRUNC('day', e."created_at") AS day,
          COUNT(*) FILTER (WHERE e.kind = 'SCAN') AS scans,
          COUNT(*) FILTER (WHERE e.kind IN ('ACTION', 'OPEN')) AS actions,
          COUNT(DISTINCT e."request_hash") FILTER (WHERE e.kind = 'SCAN' AND e."request_hash" IS NOT NULL)
            + COUNT(*) FILTER (WHERE e.kind = 'SCAN' AND e."request_hash" IS NULL) AS unique_scans
        FROM "qr_scan_events" e
        JOIN "qr_campaigns" c ON c.id = e."campaign_id"
        WHERE ${eventFilter}
        GROUP BY day
        ORDER BY day ASC
      `),
      prisma.$queryRaw<Array<{ campaign_id: string; title: string; scans: bigint; actions: bigint }>>(Prisma.sql`
        SELECT c.id AS campaign_id, c.title,
          COUNT(*) FILTER (WHERE e.kind = 'SCAN') AS scans,
          COUNT(*) FILTER (WHERE e.kind IN ('ACTION', 'OPEN')) AS actions
        FROM "qr_scan_events" e
        JOIN "qr_campaigns" c ON c.id = e."campaign_id"
        WHERE ${eventFilter}
        GROUP BY c.id, c.title
        ORDER BY scans DESC, c.title ASC
        LIMIT 50
      `),
      this.breakdown(eventFilter, Prisma.sql`COALESCE(e."device_class", 'Unknown')`),
      this.breakdown(eventFilter, Prisma.sql`COALESCE(e."user_agent_family", 'Unknown')`),
      this.breakdown(eventFilter, Prisma.sql`COALESCE(e.country, 'Unknown')`),
      this.breakdown(eventFilter, Prisma.sql`COALESCE(e."referrer_origin", 'Direct / unknown')`),
      this.actionBreakdown(eventFilter),
    ]);

    const totals = totalsRows[0] ?? { scans: 0, actions: 0, unique_scans: 0 };
    const scans = this.number(totals.scans);
    const actionCount = this.number(totals.actions);

    return {
      range: { from: this.dateKey(range.from), to: this.dateKey(range.to) },
      totals: {
        scans,
        uniqueScans: this.number(totals.unique_scans),
        actions: actionCount,
        actionRate: this.rate(actionCount, scans),
      },
      timeline: this.fillTimeline(range.from, range.to, timelineRows),
      campaigns: campaignRows.map((row) => {
        const campaignScans = this.number(row.scans);
        const campaignActions = this.number(row.actions);
        return {
          campaignId: row.campaign_id,
          title: row.title,
          scans: campaignScans,
          actions: campaignActions,
          actionRate: this.rate(campaignActions, campaignScans),
        };
      }),
      breakdowns: {
        devices: this.countRows(devices),
        browsers: this.countRows(browsers),
        countries: this.countRows(countries),
        referrers: this.countRows(referrers),
        actions: this.countRows(actions),
      },
    };
  }

  private breakdown(filter: Prisma.Sql, expression: Prisma.Sql, kind: QrEventKind = 'SCAN') {
    return prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT ${expression} AS label, COUNT(*) AS count
      FROM "qr_scan_events" e
      JOIN "qr_campaigns" c ON c.id = e."campaign_id"
      WHERE ${filter} AND e.kind = ${kind}::"QrEventKind"
      GROUP BY label
      ORDER BY count DESC, label ASC
      LIMIT 8
    `);
  }

  private actionBreakdown(filter: Prisma.Sql) {
    return prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COALESCE(e."action_type", CASE WHEN e.kind = 'OPEN' THEN 'FILE_OPEN' ELSE 'OTHER' END) AS label,
        COUNT(*) AS count
      FROM "qr_scan_events" e
      JOIN "qr_campaigns" c ON c.id = e."campaign_id"
      WHERE ${filter} AND e.kind IN ('ACTION', 'OPEN')
      GROUP BY label
      ORDER BY count DESC, label ASC
      LIMIT 8
    `);
  }

  private dateRange(from?: string, to?: string) {
    const today = this.startOfUtcDay(new Date());
    let end = this.parseDate(to) ?? today;
    if (end > today) end = today;
    let start = this.parseDate(from) ?? new Date(end.getTime() - 29 * 86_400_000);
    const earliest = new Date(end.getTime() - 89 * 86_400_000);
    if (start < earliest) start = earliest;
    if (start > end) start = end;
    return { from: start, to: end, toExclusive: new Date(end.getTime() + 86_400_000) };
  }

  private parseDate(value?: string) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private startOfUtcDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private fillTimeline(from: Date, to: Date, rows: Array<{ day: Date; scans: bigint; actions: bigint; unique_scans: bigint }>) {
    const byDay = new Map(rows.map((row) => [this.dateKey(new Date(row.day)), row]));
    const result: Array<{ date: string; scans: number; actions: number; uniqueScans: number }> = [];
    for (let cursor = from.getTime(); cursor <= to.getTime(); cursor += 86_400_000) {
      const date = this.dateKey(new Date(cursor));
      const row = byDay.get(date);
      result.push({
        date,
        scans: this.number(row?.scans),
        actions: this.number(row?.actions),
        uniqueScans: this.number(row?.unique_scans),
      });
    }
    return result;
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private countRows(rows: CountRow[]) {
    return rows.map((row) => ({ label: row.label || 'Unknown', count: this.number(row.count) }));
  }

  private number(value?: bigint | number | null) {
    return Number(value ?? 0);
  }

  private rate(actions: number, scans: number) {
    return scans > 0 ? Math.round((actions / scans) * 1000) / 10 : 0;
  }

  private nonLinkableRequestHash(ip?: string | null) {
    if (!ip) return null;
    const day = new Date().toISOString().slice(0, 10);
    const secret = process.env.QR_ANALYTICS_HASH_SECRET || process.env.JWT_SECRET || 'creatorplus-qr';
    return createHmac('sha256', `${secret}:${day}`).update(ip).digest('hex').slice(0, 24);
  }

  private actionType(value?: string | null) {
    if (!value) return null;
    const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 40);
    return normalized || null;
  }

  private countryCode(value?: string | null) {
    const normalized = value?.trim().toUpperCase();
    return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
  }

  private referrerOrigin(referer?: string | null) {
    if (!referer) return null;
    try {
      const url = new URL(referer);
      if (url.hostname === 'mycreatorplus.com' || url.hostname.endsWith('.mycreatorplus.com')) return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  private userAgentFamily(userAgent?: string | null) {
    const ua = (userAgent || '').toLowerCase();
    if (ua.includes('firefox') || ua.includes('fxios')) return 'Firefox';
    if (ua.includes('edg/') || ua.includes('edgios')) return 'Edge';
    if (ua.includes('chrome') || ua.includes('crios')) return 'Chrome';
    if (ua.includes('safari')) return 'Safari';
    return ua ? 'Other' : null;
  }

  private deviceClass(userAgent?: string | null) {
    const ua = (userAgent || '').toLowerCase();
    if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
    return ua ? 'desktop' : null;
  }
}
