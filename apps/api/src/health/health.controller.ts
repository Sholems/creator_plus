import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { prisma } from '@creatorplus/database';
import { getRedis } from '../common/redis';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  /** Liveness: process is up and serving. Cheap; no external dependencies. */
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Readiness: dependencies (DB, Redis) are reachable. Returns 503 if not. */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks DB and Redis)' })
  async ready() {
    const checks: Record<string, 'up' | 'down' | 'skipped'> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }

    const redis = getRedis();
    if (!redis) {
      checks.redis = 'skipped';
    } else {
      try {
        await redis.ping();
        checks.redis = 'up';
      } catch {
        checks.redis = 'down';
      }
    }

    const healthy = checks.database === 'up' && checks.redis !== 'down';
    const body = { status: healthy ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() };
    if (!healthy) {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
