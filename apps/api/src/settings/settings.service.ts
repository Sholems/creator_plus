import { Injectable } from '@nestjs/common';
import { prisma } from '@creatormarket/database';

export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  enabled: boolean;
  source: 'db' | 'env' | 'none';
}

export interface MaskedPaystack {
  enabled: boolean;
  hasSecretKey: boolean;
  secretKeyPreview: string | null;
  publicKey: string | null;
  source: 'db' | 'env' | 'none';
}

/**
 * Platform settings backed by the SystemSetting table. Payment provider config
 * (Paystack for now) can be set by an admin at runtime and takes precedence over
 * environment variables, which remain as a fallback/bootstrap default.
 *
 * The raw secret key is never returned to clients — only a masked preview.
 */
@Injectable()
export class SettingsService {
  private readonly PAYSTACK_KEY = 'payments.paystack';

  private mask(secret: string): string {
    if (!secret) return '';
    if (secret.length <= 8) return '••••';
    return `${secret.slice(0, 7)}…${secret.slice(-4)}`;
  }

  /** Effective Paystack config: DB values win, else environment, else empty. */
  async getPaystackConfig(): Promise<PaystackConfig> {
    const row = await prisma.systemSetting.findUnique({ where: { key: this.PAYSTACK_KEY } });
    const db = ((row?.value as any) || {}) as {
      secretKey?: string;
      publicKey?: string;
      enabled?: boolean;
    };

    const secretKey = (db.secretKey || process.env.PAYSTACK_SECRET_KEY || '').trim();
    const publicKey = (db.publicKey || process.env.PAYSTACK_PUBLIC_KEY || '').trim();
    // Enabled defaults to "on when a secret exists" until an admin sets it explicitly.
    const enabled = db.enabled !== undefined ? !!db.enabled : !!secretKey;
    const source: PaystackConfig['source'] = db.secretKey
      ? 'db'
      : process.env.PAYSTACK_SECRET_KEY
        ? 'env'
        : 'none';

    return { secretKey, publicKey, enabled, source };
  }

  /** Safe view for the admin UI — no raw secret. */
  async getMaskedPaystack(): Promise<MaskedPaystack> {
    const c = await this.getPaystackConfig();
    return {
      enabled: c.enabled,
      hasSecretKey: !!c.secretKey,
      secretKeyPreview: c.secretKey ? this.mask(c.secretKey) : null,
      publicKey: c.publicKey || null,
      source: c.source,
    };
  }

  async updatePaystack(input: {
    secretKey?: string;
    publicKey?: string;
    enabled?: boolean;
  }): Promise<MaskedPaystack> {
    const row = await prisma.systemSetting.findUnique({ where: { key: this.PAYSTACK_KEY } });
    const current = ((row?.value as any) || {}) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...current };

    // Only overwrite the secret when a non-empty value is supplied, so an admin
    // can toggle `enabled` or change the public key without re-typing the secret.
    if (typeof input.secretKey === 'string' && input.secretKey.trim() !== '') {
      next.secretKey = input.secretKey.trim();
    }
    if (typeof input.publicKey === 'string') {
      next.publicKey = input.publicKey.trim();
    }
    if (typeof input.enabled === 'boolean') {
      next.enabled = input.enabled;
    }

    await prisma.systemSetting.upsert({
      where: { key: this.PAYSTACK_KEY },
      create: { key: this.PAYSTACK_KEY, group: 'payments', value: next as any },
      update: { value: next as any },
    });

    return this.getMaskedPaystack();
  }

  // ------------------------------------------------------------------
  // General platform settings
  // ------------------------------------------------------------------

  private readonly PLATFORM_KEY = 'platform.general';

  private num(v: unknown, fallback: number): number {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * Current platform settings. Stored as a single JSON row under
   * `platform.general`; scalar keys are mirrored for consumers that read a
   * single value (e.g. `commission.platform_rate`).
   */
  async getPlatformSettings(): Promise<PlatformSettings> {
    const row = await prisma.systemSetting.findUnique({ where: { key: this.PLATFORM_KEY } });
    const v = ((row?.value as any) || {}) as Record<string, unknown>;
    return {
      commissionRate: this.num(v.commissionRate, 10),
      minPayoutAmount: this.num(v.minPayoutAmount, 10000),
      holdingPeriodDays: this.num(v.holdingPeriodDays, 14),
      maxFileSize: this.num(v.maxFileSize, 100),
      maintenanceMode: v.maintenanceMode === true,
      registrationEnabled: v.registrationEnabled !== false,
    };
  }

  async updatePlatformSettings(input: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const current = await this.getPlatformSettings();
    const next: PlatformSettings = {
      commissionRate: input.commissionRate !== undefined ? this.num(input.commissionRate, current.commissionRate) : current.commissionRate,
      minPayoutAmount: input.minPayoutAmount !== undefined ? this.num(input.minPayoutAmount, current.minPayoutAmount) : current.minPayoutAmount,
      holdingPeriodDays: input.holdingPeriodDays !== undefined ? this.num(input.holdingPeriodDays, current.holdingPeriodDays) : current.holdingPeriodDays,
      maxFileSize: input.maxFileSize !== undefined ? this.num(input.maxFileSize, current.maxFileSize) : current.maxFileSize,
      maintenanceMode: input.maintenanceMode !== undefined ? !!input.maintenanceMode : current.maintenanceMode,
      registrationEnabled: input.registrationEnabled !== undefined ? !!input.registrationEnabled : current.registrationEnabled,
    };

    await prisma.systemSetting.upsert({
      where: { key: this.PLATFORM_KEY },
      create: { key: this.PLATFORM_KEY, group: 'platform', value: next as any },
      update: { value: next as any },
    });

    // Mirror scalar keys consumed directly elsewhere in the platform.
    const mirrors: { key: string; value: number | boolean }[] = [
      { key: 'commission.platform_rate', value: next.commissionRate },
      { key: 'platform.min_payout', value: next.minPayoutAmount },
      { key: 'platform.holding_period_days', value: next.holdingPeriodDays },
      { key: 'platform.max_file_size_bytes', value: next.maxFileSize * 1024 * 1024 },
      { key: 'platform.maintenance_mode', value: next.maintenanceMode },
      { key: 'platform.registration_enabled', value: next.registrationEnabled },
    ];
    for (const m of mirrors) {
      await prisma.systemSetting.upsert({
        where: { key: m.key },
        create: { key: m.key, group: 'platform', value: m.value as any },
        update: { value: m.value as any },
      });
    }

    return next;
  }
}

export interface PlatformSettings {
  commissionRate: number;
  minPayoutAmount: number;
  holdingPeriodDays: number;
  maxFileSize: number;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
}
