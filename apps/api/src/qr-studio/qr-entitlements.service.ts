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
import { assertContentTypeAllowed } from './qr-content-validation';

@Injectable()
export class QrEntitlementsService {
  async listForUser(userId: string) {
    await this.expireOldEntitlements(userId);
    const entitlements = await prisma.qrEntitlement.findMany({
      where: { userId },
      orderBy: { expiresAt: 'desc' },
    });
    const activeCampaigns = await prisma.qrCampaign.count({
      where: { ownerId: userId, status: 'ACTIVE' },
    });
    const hasPro = entitlements.some((e) => this.isActivePro(e));

    return {
      hasPaidAccess: entitlements.some((e) => this.isUsable(e)),
      hasPro,
      activeCampaigns,
      entitlements,
      offers: Object.values(QrOfferCode).map(getQrOffer),
    };
  }

  async assertCanCreateCampaign(userId: string, contentType: QrContentType) {
    const candidates = await this.getUsableEntitlements(userId);
    if (candidates.length === 0) {
      throw new BadRequestException('Choose a QR Studio plan before creating a campaign');
    }
    const hasPro = candidates.some((e) => this.isActivePro(e));
    assertContentTypeAllowed(contentType, hasPro);
    if (!(await this.hasAvailableSlot(userId, candidates))) {
      throw new BadRequestException('Your QR Studio plan has no available campaign slots');
    }
    return { hasPro };
  }

  async chooseEntitlementForActivation(userId: string, contentType: QrContentType) {
    const candidates = await this.getUsableEntitlements(userId);
    if (candidates.length === 0) {
      throw new BadRequestException('Choose a QR Studio plan before activating a campaign');
    }

    const hasPro = candidates.some((e) => this.isActivePro(e));
    assertContentTypeAllowed(contentType, hasPro);

    const pro = candidates.find((e) => this.isActivePro(e));
    if (pro && (await this.entitlementHasSlot(userId, pro))) return pro;

    for (const entitlement of candidates.filter((e) => e.kind === 'CAMPAIGN_CREDIT')) {
      if (await this.entitlementHasSlot(userId, entitlement)) return entitlement;
    }

    throw new BadRequestException('Your QR Studio plan has no available campaign slots');
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
