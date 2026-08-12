import { Logger } from '@nestjs/common';
import { getRedis } from './redis';

/**
 * Read-through cache backed by Redis. Falls back to calling the loader directly
 * when Redis is unavailable, so it is always safe. Use ONLY for public,
 * read-heavy data (categories, featured products) — never per-user data.
 * Values are JSON-serialised, so Decimals/BigInts follow the app's global
 * toJSON (they become numbers), which matches the API response contract.
 */
const logger = new Logger('Cache');

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  if (!redis) return loader();

  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (e) {
    logger.warn(`cache get failed (${key}): ${(e as Error).message}`);
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (e) {
    logger.warn(`cache set failed (${key}): ${(e as Error).message}`);
  }
  return value;
}

/** Drop cached keys (call after a write that changes cached data). */
export async function invalidateCache(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (e) {
    logger.warn(`cache invalidate failed: ${(e as Error).message}`);
  }
}
