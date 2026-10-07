import { BadRequestException, Injectable } from '@nestjs/common';
import {
  prisma,
  QrCampaignStatus,
  QrContentType,
  QrEntitlement,
  QrEntitlementKind,
  QrEntitlementStatus,
  QrOfferCode,
} from '@creatorplus/database';
import { addDays, getQrOffer } from './qr-offer-definitions';
import { assertContentTypeAllowed, assertFreeContentTypeAllowed } from './qr-content-validation';
import { MembershipService } from '../membership/membership.service';

// QR Studio is now a membership perk: active members get full Pro QR access;
// everyone else (free) gets a single campaign with no file/PDF upload.
const FREE_MAX_ACTIVE_CAMPAIGNS = 1;

@Injectable()
export class QrEntitlementsService {
  constructor(private readonly membership: MembershipService) {}

  async listForUser(userId: string) {
    await this.expireOldEntitlements(userId);
    const entitlements = await prisma.qrEntitlement.findMany({
      where: { userId },
      orderBy: { expiresAt: 'desc' },
    });
    const activeCampaigns = await prisma.qrCampaign.count({
      where: { ownerId: userId, status: 'ACTIVE' },
    });
    const isMember = await this.membership.hasActiveMembership(userId);
    // Membership is the primary Pro source; legacy QR entitlements are honoured
    // until grandfathered holders are migrated to membership.
    const legacyPro = entitlements.some((e) => this.isActivePro(e));
    const hasPro = isMember || legacyPro;

    return {
      isMember,
      hasPro,
      hasPaidAccess: hasPro || entitlements.some((e) => this.isUsable(e)),
      maxActiveCampaigns: hasPro ? null : FREE_MAX_ACTIVE_CAMPAIGNS,
      activeCampaigns,
      entitlements,
      offers: Object.values(QrOfferCode).map(getQrOffer),
    };
  }

  async assertCanCreateCampaign(userId: string, contentType: QrContentType) {
    // Pro members: full access, unlimited.
    if (await this.membership.hasActiveMembership(userId)) {
      assertContentTypeAllowed(contentType, true);
      return { hasPro: true };
    }
    // Legacy QR entitlements (grandfathered) keep their existing behaviour.
    const candidates = await this.getUsableEntitlements(userId);
    if (candidates.length > 0) {
      const hasPro = candidates.some((e) => this.isActivePro(e));
      assertContentTypeAllowed(contentType, hasPro);
      if (!(await this.hasAvailableSlot(userId, candidates))) {
        throw new BadRequestException('Your QR Studio plan has no available campaign slots');
      }
      return { hasPro };
    }
    // Free tier: any non-upload content type (the active-campaign cap is enforced on activation).
    assertFreeContentTypeAllowed(contentType);
    return { hasPro: false };
  }

  /** Returns the entitlement to attach, or null for member/free campaigns. */
  async chooseEntitlementForActivation(userId: string, contentType: QrContentType): Promise<QrEntitlement | null> {
    if (await this.membership.hasActiveMembership(userId)) {
      assertContentTypeAllowed(contentType, true);
      return null;
    }

    const candidates = await this.getUsableEntitlements(userId);
    if (candidates.length > 0) {
      const hasPro = candidates.some((e) => this.isActivePro(e));
      assertContentTypeAllowed(contentType, hasPro);

      const pro = candidates.find((e) => this.isActivePro(e));
      if (pro && (await this.entitlementHasSlot(userId, pro))) return pro;

      for (const entitlement of candidates.filter((e) => e.kind === 'CAMPAIGN_CREDIT')) {
        if (await this.entitlementHasSlot(userId, entitlement)) return entitlement;
      }
      throw new BadRequestException('Your QR Studio plan has no available campaign slots');
    }

    // Free tier: one active campaign, no uploads.
    assertFreeContentTypeAllowed(contentType);
    const active = await prisma.qrCampaign.count({ where: { ownerId: userId, status: 'ACTIVE' } });
    if (active >= FREE_MAX_ACTIVE_CAMPAIGNS) {
      throw new BadRequestException('Your free plan allows 1 active QR code. Upgrade to Pro for unlimited.');
    }
    return null;
  }

  async grantFromPayment(input: {
    userId: string;
    offerCode: QrOfferCode;
    paymentId: string;
    now?: Date;
  }) {
    const offer = getQrOffer(input.offerCode);
    const startsAt = input.now ?? new Date();
    const expiresAt = addDays(startsAt, offer.durationDays);

    return prisma.qrEntitlement.create({
      data: {
        userId: input.userId,
        paymentId: input.paymentId,
        offerCode: offer.code,
        kind: offer.kind as QrEntitlementKind,
        status: 'ACTIVE',
        campaignCreditsTotal: offer.campaignCredits,
        campaignCreditsUsed: 0,
        maxActiveCampaigns: offer.maxActiveCampaigns,
        startsAt,
        expiresAt,
      },
    });
  }

  private async getUsableEntitlements(userId: string) {
    await this.expireOldEntitlements(userId);
    return prisma.qrEntitlement.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        startsAt: { lte: new Date() },
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ kind: 'desc' }, { expiresAt: 'desc' }],
    });
  }

  private async expireOldEntitlements(userId: string) {
    await prisma.qrEntitlement.updateMany({
      where: { userId, status: 'ACTIVE', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }

  private isUsable(entitlement: QrEntitlement) {
    const now = new Date();
    return entitlement.status === 'ACTIVE' && entitlement.startsAt <= now && entitlement.expiresAt > now;
  }

  private isActivePro(entitlement: QrEntitlement) {
    return this.isUsable(entitlement) && entitlement.kind === 'PRO_PASS';
  }

  private async hasAvailableSlot(userId: string, entitlements: QrEntitlement[]) {
    for (const entitlement of entitlements) {
      if (await this.entitlementHasSlot(userId, entitlement)) return true;
    }
    return false;
  }

  private async entitlementHasSlot(userId: string, entitlement: QrEntitlement) {
    const max = entitlement.maxActiveCampaigns ?? entitlement.campaignCreditsTotal;
    if (max <= 0) return false;
    const active = await prisma.qrCampaign.count({
      where: {
        ownerId: userId,
        entitlementId: entitlement.id,
        status: 'ACTIVE' as QrCampaignStatus,
      },
    });
    return active < max;
  }
}
