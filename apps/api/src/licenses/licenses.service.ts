import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { prisma, Prisma } from '@creatormarket/database';
import { generateLicenseKey } from './license-key.util';
import { LicenseSigningService } from './license-signing.service';

// How long an offline activation certificate stays valid before the app must
// re-check in online. 30 days (agreed offline grace period).
const CERT_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class LicensesService {
  constructor(private readonly signing: LicenseSigningService) {}

  /**
   * Issue one license key per license-enabled item of a freshly paid order.
   * Runs inside the fulfillment transaction so keys are created atomically with
   * the rest of fulfillment. Safe to call for any order — no-op when nothing in
   * the order has licensing enabled.
   */
  async issueForOrder(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      buyerId: string;
      items: Array<{
        id: string;
        productId: string;
        product: {
          licenseKeysEnabled?: boolean;
          licenseMaxActivations?: number;
          licenseValidityDays?: number | null;
        };
      }>;
    },
  ) {
    for (const item of order.items) {
      if (!item.product?.licenseKeysEnabled) continue;
      const days = item.product.licenseValidityDays ?? null;
      await tx.licenseKey.create({
        data: {
          key: generateLicenseKey(),
          productId: item.productId,
          orderId: order.id,
          orderItemId: item.id,
          buyerId: order.buyerId,
          maxActivations: item.product.licenseMaxActivations ?? 2,
          expiresAt: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null,
        },
      });
    }
  }

  // ─── Activation (public, called by the buyer's app) ───────────────────────

  private async loadKeyOrThrow(key: string) {
    const license = await prisma.licenseKey.findUnique({
      where: { key: key.trim().toUpperCase() },
      include: {
        activations: true,
        product: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!license) throw new NotFoundException('Invalid license key');
    return license;
  }

  private assertUsable(license: { status: string; expiresAt: Date | null }) {
    if (license.status === 'REVOKED') throw new ForbiddenException('This license has been revoked');
    if (license.status === 'SUSPENDED') throw new ForbiddenException('This license is suspended');
    if (license.expiresAt && new Date() > license.expiresAt) {
      throw new ForbiddenException('This license has expired');
    }
  }

  private buildCertificate(
    license: { key: string; productId: string; buyerId: string; maxActivations: number; expiresAt: Date | null },
    deviceId: string,
  ) {
    const now = Date.now();
    // Cert lives for the grace window, but never past a time-boxed license.
    const graceExp = now + CERT_GRACE_MS;
    const licenseExp = license.expiresAt ? license.expiresAt.getTime() : Infinity;
    const exp = Math.floor(Math.min(graceExp, licenseExp) / 1000);
    const certificate = this.signing.signCertificate({
      key: license.key,
      deviceId,
      productId: license.productId,
      sub: license.buyerId,
      max: license.maxActivations,
      iat: Math.floor(now / 1000),
      exp,
    });
    return { certificate, expiresAt: new Date(exp * 1000).toISOString() };
  }

  private deviceList(activations: Array<{ deviceId: string; deviceName: string | null; activatedAt: Date; lastSeenAt: Date }>) {
    return activations.map((a) => ({
      deviceId: a.deviceId,
      deviceName: a.deviceName,
      activatedAt: a.activatedAt,
      lastSeenAt: a.lastSeenAt,
    }));
  }

  async activate(key: string, deviceId: string, deviceName?: string, ipAddress?: string) {
    if (!this.signing.isConfigured) {
      throw new BadRequestException('Licensing is not configured on this server');
    }
    if (!deviceId?.trim()) throw new BadRequestException('A device id is required');

    const license = await this.loadKeyOrThrow(key);
    this.assertUsable(license);

    const existing = license.activations.find((a) => a.deviceId === deviceId);
    if (existing) {
      await prisma.licenseActivation.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), ipAddress: ipAddress ?? existing.ipAddress },
      });
    } else {
      if (license.activations.length >= license.maxActivations) {
        throw new ConflictException(
          `This license is already active on the maximum of ${license.maxActivations} device(s). ` +
            'Deactivate another device to continue.',
        );
      }
      await prisma.licenseActivation.create({
        data: { licenseKeyId: license.id, deviceId, deviceName, ipAddress },
      });
    }

    const fresh = await this.loadKeyOrThrow(key);
    return {
      ...this.buildCertificate(fresh, deviceId),
      product: fresh.product,
      maxActivations: fresh.maxActivations,
      devices: this.deviceList(fresh.activations),
    };
  }

  /** Periodic online re-check for an already-activated device (renews the cert). */
  async validate(key: string, deviceId: string, ipAddress?: string) {
    if (!this.signing.isConfigured) {
      throw new BadRequestException('Licensing is not configured on this server');
    }
    const license = await this.loadKeyOrThrow(key);
    this.assertUsable(license);
    const existing = license.activations.find((a) => a.deviceId === deviceId);
    if (!existing) {
      throw new ForbiddenException('This device is not activated for this license');
    }
    await prisma.licenseActivation.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), ipAddress: ipAddress ?? existing.ipAddress },
    });
    return {
      valid: true,
      ...this.buildCertificate(license, deviceId),
      product: license.product,
      maxActivations: license.maxActivations,
    };
  }

  /** Free an activation slot. Anyone holding the key + deviceId may release it. */
  async deactivate(key: string, deviceId: string) {
    const license = await this.loadKeyOrThrow(key);
    const existing = license.activations.find((a) => a.deviceId === deviceId);
    if (!existing) throw new NotFoundException('That device is not activated for this license');
    await prisma.licenseActivation.delete({ where: { id: existing.id } });
    return { released: true, deviceId };
  }

  // ─── Buyer dashboard ──────────────────────────────────────────────────────

  async findForBuyer(userId: string) {
    return prisma.licenseKey.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        activations: { orderBy: { activatedAt: 'asc' } },
        product: { select: { id: true, title: true, slug: true, thumbnail: true } },
      },
    });
  }

  async deactivateOwnDevice(userId: string, licenseId: string, deviceId: string) {
    const license = await prisma.licenseKey.findUnique({ where: { id: licenseId } });
    if (!license || license.buyerId !== userId) throw new NotFoundException('License not found');
    const act = await prisma.licenseActivation.findUnique({
      where: { licenseKeyId_deviceId: { licenseKeyId: licenseId, deviceId } },
    });
    if (!act) throw new NotFoundException('Device not found on this license');
    await prisma.licenseActivation.delete({ where: { id: act.id } });
    return { released: true };
  }

  // ─── Creator dashboard ────────────────────────────────────────────────────

  private async creatorProfileId(userId: string) {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('You must be a creator to manage licenses');
    return profile.id;
  }

  async findForCreator(userId: string) {
    const creatorId = await this.creatorProfileId(userId);
    return prisma.licenseKey.findMany({
      where: { product: { creatorId } },
      orderBy: { createdAt: 'desc' },
      include: {
        activations: true,
        product: { select: { id: true, title: true, slug: true } },
        buyer: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  private async creatorKeyOrThrow(userId: string, licenseId: string) {
    const creatorId = await this.creatorProfileId(userId);
    const license = await prisma.licenseKey.findUnique({
      where: { id: licenseId },
      include: { product: { select: { creatorId: true } } },
    });
    if (!license || license.product.creatorId !== creatorId) {
      throw new NotFoundException('License not found');
    }
    return license;
  }

  async revoke(userId: string, licenseId: string) {
    await this.creatorKeyOrThrow(userId, licenseId);
    return prisma.licenseKey.update({ where: { id: licenseId }, data: { status: 'REVOKED' } });
  }

  async resetActivations(userId: string, licenseId: string) {
    await this.creatorKeyOrThrow(userId, licenseId);
    await prisma.licenseActivation.deleteMany({ where: { licenseKeyId: licenseId } });
    return { reset: true };
  }

  async update(
    userId: string,
    licenseId: string,
    data: { maxActivations?: number; expiresAt?: string | null; status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' },
  ) {
    await this.creatorKeyOrThrow(userId, licenseId);
    const patch: Prisma.LicenseKeyUpdateInput = {};
    if (data.maxActivations !== undefined) patch.maxActivations = data.maxActivations;
    if (data.status !== undefined) patch.status = data.status;
    if (data.expiresAt !== undefined) {
      patch.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }
    return prisma.licenseKey.update({
      where: { id: licenseId },
      data: patch,
      include: { activations: true },
    });
  }
}
