import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';
import { createHash } from 'crypto';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from './dto/feature-flag.dto';

@Injectable()
export class FeatureFlagsService {
  async findAll() {
    return prisma.featureFlag.findMany({
      orderBy: [{ isEnabled: 'desc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateFeatureFlagDto) {
    return prisma.featureFlag.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        isEnabled: dto.isEnabled ?? false,
        rolloutPercentage: dto.rolloutPercentage ?? 100,
        environment: dto.environment ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateFeatureFlagDto) {
    const flag = await prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    return prisma.featureFlag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.rolloutPercentage !== undefined ? { rolloutPercentage: dto.rolloutPercentage } : {}),
        ...(dto.environment !== undefined ? { environment: dto.environment } : {}),
      },
    });
  }

  async remove(id: string) {
    const flag = await prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    await prisma.featureFlag.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Deterministic rollout bucketing. Without a userId, anonymous clients are
   * treated as fully eligible when the flag is on (a safe default for the demo
   * surface). With a userId, the same user is consistently in or out of the
   * rollout.
   */
  async isEnabled(name: string, userId?: string): Promise<boolean> {
    const flag = await prisma.featureFlag.findUnique({ where: { name } });
    if (!flag || !flag.isEnabled) return false;
    if (flag.rolloutPercentage >= 100) return true;
    if (!userId) return true;

    const hash = createHash('sha1').update(`${userId}:${flag.name}`).digest();
    const bucket = hash.readUInt32BE(0) % 100;
    return bucket < flag.rolloutPercentage;
  }

  /** Public (no-auth) view: name + enabled state for client-side surfaces. */
  async publicList() {
    const flags = await prisma.featureFlag.findMany({
      select: { name: true, isEnabled: true, description: true },
      orderBy: { name: 'asc' },
    });
    return { flags };
  }
}
