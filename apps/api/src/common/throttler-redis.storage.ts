import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { Logger } from '@nestjs/common';
import { getRedis } from './redis';

/** Structural match for @nestjs/throttler's ThrottlerStorageRecord. */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Atomic fixed-window rate-limit counter. Mirrors the semantics of the
 * in-memory ThrottlerStorageService (ttl/blockDuration in ms; timeToExpire /
 * timeToBlockExpire returned in seconds) but stores state in Redis so limits are
 * shared across every API instance. All state transitions happen in one Lua
 * evaluation, so concurrent requests cannot race the counter.
 */
const INCREMENT_SCRIPT = `
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local pttl = redis.call('PTTL', KEYS[1])
if pttl < 0 then
  redis.call('SET', KEYS[1], 0, 'PX', ttl)
  pttl = ttl
end

local isBlocked = redis.call('EXISTS', KEYS[2]) == 1
local totalHits
if isBlocked then
  totalHits = tonumber(redis.call('GET', KEYS[1])) or 0
else
  totalHits = redis.call('INCR', KEYS[1])
end

local timeToExpire = math.ceil(pttl / 1000)

if (totalHits > limit) and (not isBlocked) then
  redis.call('SET', KEYS[2], 1, 'PX', blockDuration)
  isBlocked = true
end

local blockPttl = redis.call('PTTL', KEYS[2])
local timeToBlockExpire = 0
if blockPttl > 0 then timeToBlockExpire = math.ceil(blockPttl / 1000) end

return { totalHits, timeToExpire, isBlocked and 1 or 0, timeToBlockExpire }
`;

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger('RedisThrottlerStorage');

  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitKey}:block`;

    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] =
      (await this.redis.eval(
        INCREMENT_SCRIPT,
        2,
        hitKey,
        blockKey,
        ttl,
        limit,
        blockDuration,
      )) as [number, number, number, number];

    return {
      totalHits: Number(totalHits),
      timeToExpire: Number(timeToExpire),
      isBlocked: Number(isBlocked) === 1,
      timeToBlockExpire: Number(timeToBlockExpire),
    };
  }
}

/**
 * Returns a Redis-backed throttler storage when REDIS_URL is configured, or
 * undefined to fall back to the in-memory (per-instance) default. Wire the
 * result into ThrottlerModule.forRoot({ storage }).
 */
export function buildThrottlerStorage(): ThrottlerStorage | undefined {
  const redis = getRedis();
  if (!redis) return undefined;
  new Logger('Throttler').log('Rate limiting backed by Redis (cross-instance).');
  return new RedisThrottlerStorage(redis);
}
