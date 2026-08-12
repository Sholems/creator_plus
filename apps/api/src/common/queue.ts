import { Queue } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';

/**
 * Email delivery is moved off the request path onto a BullMQ queue when
 * REDIS_URL is set and EMAIL_QUEUE=1. The worker process (apps/workers) consumes
 * the `email` queue and performs SMTP delivery with retries/backoff. When the
 * flag is off (default) we fall back to inline sending, so nothing breaks in a
 * single-process deployment or before the worker is rolled out.
 */
const logger = new Logger('Queue');

function queueEnabled(): boolean {
  return !!process.env.REDIS_URL && process.env.EMAIL_QUEUE === '1';
}

let connection: Redis | null | undefined;
let emailQueue: Queue | null | undefined;

function getConnection(): Redis | null {
  if (connection !== undefined) return connection;
  const url = process.env.REDIS_URL;
  if (!url) return (connection = null);
  connection = new IORedis(url, { maxRetriesPerRequest: null });
  connection.on('error', (e) => logger.error(`Queue Redis error: ${e.message}`));
  return connection;
}

function getEmailQueue(): Queue | null {
  if (emailQueue !== undefined) return emailQueue;
  const conn = getConnection();
  emailQueue = conn ? new Queue('email', { connection: conn }) : null;
  return emailQueue;
}

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
}

/**
 * Enqueue a fully-rendered email for the worker to deliver. Returns true when
 * the job was queued; false means the caller should send inline instead.
 */
export async function enqueueEmail(job: EmailJob): Promise<boolean> {
  if (!queueEnabled()) return false;
  const queue = getEmailQueue();
  if (!queue) return false;
  try {
    await queue.add('send', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    });
    return true;
  } catch (err) {
    logger.error(`Failed to enqueue email, sending inline: ${(err as Error).message}`);
    return false;
  }
}
