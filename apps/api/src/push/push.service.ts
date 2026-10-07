import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import * as webpush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  onModuleInit() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:support@mycreatorplus.com';
    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.configured = true;
      } catch (err) {
        this.logger.warn(`[push] VAPID config invalid: ${(err as Error).message}`);
      }
    }
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async subscribe(userId: string, sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }) {
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) throw new BadRequestException('Invalid push subscription');
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth },
      update: { userId, p256dh, auth },
    });
    return { subscribed: true };
  }

  async unsubscribe(userId: string, endpoint?: string) {
    if (endpoint) await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { unsubscribed: true };
  }

  /** Fire-and-forget push to all of a user's devices; prunes dead endpoints. */
  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.configured) return;
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return;
    const data = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          } else {
            this.logger.warn(`[push] send failed: ${err?.message ?? err}`);
          }
        }
      }),
    );
  }
}
