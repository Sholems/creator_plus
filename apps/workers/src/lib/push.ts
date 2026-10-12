import { prisma } from '@creatorplus/database';
import * as webpush from 'web-push';

/**
 * Worker-side web push (mirrors apps/api/src/push/push.service.ts). Inactive
 * — and silent — unless VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are set.
 */
let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  configured = false;
  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@mycreatorplus.com', publicKey, privateKey);
      configured = true;
    } catch (err) {
      console.warn(`[push] VAPID config invalid: ${(err as Error).message}`);
    }
  }
  return configured;
}

/** Best-effort push to all of a user's devices; never throws, prunes dead endpoints. */
export async function pushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!ensureConfigured()) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    const data = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          } else {
            console.warn(`[push] send failed: ${err?.message ?? err}`);
          }
        }
      }),
    );
  } catch (err) {
    console.warn(`[push] lookup failed: ${(err as Error).message}`);
  }
}
