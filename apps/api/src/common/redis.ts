import IORedis, { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';

/**
 * Shared Redis connection for cross-instance concerns (rate-limit store, health
 * checks). Returns null when REDIS_URL is unset so callers can degrade to a
 * local fallback. BullMQ intentionally uses its own connection (it requires
 * `maxRetriesPerRequest: null`), so this client is not shared with the queue.
 */
const logger = new Logger('Redis');
let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return client;
  }

  const redis = new IORedis(url, {
    lazyConnect: false,
    enableOfflineQueue: true,
    maxRetriesPerRequest: 3,
  });
  redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  client = redis;
  return client;
}
