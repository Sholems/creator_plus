import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  prisma,
  Prisma,
  QrAssetSafetyStatus,
  QrCampaignStatus,
  QrContentType,
  QrScanMode,
} from '@creatorplus/database';
import { randomBytes } from 'crypto';
import { QrEntitlementsService } from './qr-entitlements.service';
import {
  assertContentTypeAllowed,
  assertFreeContentTypeAllowed,
  assertScanModeAllowed,
  validateCampaignDestination,
} from './qr-content-validation';
import {
  CreateQrCampaignDto,
  CreateQrPlacementVariantDto,
  UpdateQrCampaignDto,
  UpdateQrPlacementVariantDto,
} from './dto/qr-campaign.dto';
import { isQrStudioEnabled } from './qr-offer-definitions';

@Injectable()
export class QrCampaignsService {
  constructor(private readonly entitlements: QrEntitlementsService) {}

  async findMine(userId: string) {
    const campaigns = await prisma.qrCampaign.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assets: {
          where: { active: true },
          select: {
            id: true,
            kind: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            safetyStatus: true,
            safetyReason: true,
            createdAt: true,
          },
        },
        _count: { select: { events: { where: { kind: 'SCAN' } } } },
        events: {
          where: { kind: 'SCAN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        placementVariants: {
          orderBy: { createdAt: 'asc' },
          include: {
            _count: { select: { events: { where: { kind: 'SCAN' } } } },
            events: {
              where: { kind: 'SCAN' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    });
    return campaigns.map((campaign) => this.serializeOwnerCampaign(campaign));
  }

  async findMineById(userId: string, id: string) {
    const campaign = await prisma.qrCampaign.findFirst({
      where: { id, ownerId: userId },
      include: {
        assets: {
          where: { active: true },
          select: {
            id: true,
            kind: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            safetyStatus: true,
            safetyReason: true,
            createdAt: true,
          },
        },
        _count: { select: { events: { where: { kind: 'SCAN' } } } },
        events: {
          where: { kind: 'SCAN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        placementVariants: {
          orderBy: { createdAt: 'asc' },
          include: {
            _count: { select: { events: { where: { kind: 'SCAN' } } } },
            events: {
              where: { kind: 'SCAN' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException('QR campaign not found');
    return this.serializeOwnerCampaign(campaign);
  }

  async create(userId: string, dto: CreateQrCampaignDto) {
    if (!isQrStudioEnabled()) throw new BadRequestException('QR Studio is not available yet');

    const { hasPro } = await this.entitlements.assertCanCreateCampaign(userId, dto.contentType);
    const destination = validateCampaignDestination(
      dto.contentType,
      dto.destinationUrl,
      dto.destinationData,
    );

    const campaign = await prisma.qrCampaign.create({
      data: {
        ownerId: userId,
        publicCode: await this.generatePublicCode('c'),
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        folder: dto.folder?.trim() || null,
        tags: this.normalizeTags(dto.tags),
        contentType: dto.contentType,
        destinationUrl: destination.destinationUrl,
        destinationData: destination.destinationData ?? Prisma.JsonNull,
        brandName: dto.brandName?.trim() || null,
        brandPrimaryColor: dto.brandPrimaryColor || null,
        brandAccentColor: dto.brandAccentColor || null,
        designSettings: dto.designSettings ?? Prisma.JsonNull,
      },
    });

    assertContentTypeAllowed(campaign.contentType, hasPro);
    return this.findMineById(userId, campaign.id);
  }

  async update(userId: string, id: string, dto: UpdateQrCampaignDto) {
    const campaign = await this.requireOwnerCampaign(userId, id);
    const entitlements = await this.entitlements.listForUser(userId);
    const targetContentType = dto.contentType ?? campaign.contentType;

    if (entitlements.hasPro) {
      assertContentTypeAllowed(targetContentType, true);
    } else {
      const hasLegacyCredit = entitlements.entitlements?.some(
        (e: any) => e.status === 'ACTIVE' && (!e.expiresAt || new Date(e.expiresAt) > new Date()),
      );
      if (hasLegacyCredit) {
        assertContentTypeAllowed(targetContentType, false);
      } else {
        assertFreeContentTypeAllowed(targetContentType);
      }
    }

    if (dto.scanMode) assertScanModeAllowed(dto.scanMode, entitlements.hasPro);

    const isChangingType = dto.contentType !== undefined && dto.contentType !== campaign.contentType;
    const isSwitchingActiveCampaignToUpload =
      isChangingType &&
      campaign.status === 'ACTIVE' &&
      (targetContentType === 'FILE' || targetContentType === 'IMAGE_GALLERY');
    if (isSwitchingActiveCampaignToUpload) {
      await this.assertHasApprovedAsset(campaign.id);
    }

    const destination =
      dto.destinationUrl !== undefined || dto.destinationData !== undefined || isChangingType
        ? validateCampaignDestination(
            targetContentType,
            dto.destinationUrl !== undefined
              ? dto.destinationUrl
              : isChangingType
                ? null
                : campaign.destinationUrl,
            dto.destinationData !== undefined
              ? (dto.destinationData as Record<string, any> | null)
              : isChangingType
                ? null
                : (campaign.destinationData as Record<string, any> | null),
          )
        : undefined;

    await prisma.qrCampaign.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
        folder: dto.folder === undefined ? undefined : dto.folder?.trim() || null,
        tags: dto.tags === undefined ? undefined : this.normalizeTags(dto.tags),
        contentType: dto.contentType,
        destinationUrl: destination?.destinationUrl,
        destinationData:
          destination === undefined
            ? undefined
            : destination.destinationData ?? Prisma.JsonNull,
        scanMode: dto.scanMode,
        brandName: dto.brandName === undefined ? undefined : dto.brandName?.trim() || null,
        brandPrimaryColor: dto.brandPrimaryColor === undefined ? undefined : dto.brandPrimaryColor || null,
        brandAccentColor: dto.brandAccentColor === undefined ? undefined : dto.brandAccentColor || null,
        designSettings: dto.designSettings === undefined ? undefined : dto.designSettings ?? Prisma.JsonNull,
      },
    });
    return this.findMineById(userId, id);
  }

  async activate(userId: string, id: string) {
    const campaign = await this.requireOwnerCampaign(userId, id);
    if (campaign.status === 'ACTIVE' && (!campaign.expiresAt || campaign.expiresAt > new Date())) {
      return this.findMineById(userId, id);
    }

    const entitlement = await this.entitlements.chooseEntitlementForActivation(
      userId,
      campaign.contentType,
    );

    if (campaign.scanMode === 'DIRECT_OPEN') {
      const summary = await this.entitlements.listForUser(userId);
      assertScanModeAllowed(campaign.scanMode, summary.hasPro);
    }

    if (campaign.contentType === 'FILE' || campaign.contentType === 'IMAGE_GALLERY') {
      await this.assertHasApprovedAsset(campaign.id);
    }

    await prisma.qrCampaign.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        // Member/free campaigns have no entitlement and no fixed expiry.
        entitlementId: entitlement?.id ?? null,
        activatedAt: campaign.activatedAt ?? new Date(),
        expiresAt: entitlement?.expiresAt ?? null,
      },
    });
    return this.findMineById(userId, id);
  }

  async pause(userId: string, id: string) {
    await this.requireOwnerCampaign(userId, id);
    await prisma.qrCampaign.update({ where: { id }, data: { status: 'PAUSED' } });
    return this.findMineById(userId, id);
  }

  async archive(userId: string, id: string) {
    await this.requireOwnerCampaign(userId, id);
    await prisma.qrCampaign.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
    return this.findMineById(userId, id);
  }

  async duplicate(userId: string, id: string) {
    const campaign = await this.requireOwnerCampaign(userId, id);
    await this.entitlements.assertCanCreateCampaign(userId, campaign.contentType);
    const copy = await prisma.qrCampaign.create({
      data: {
        ownerId: userId,
        publicCode: await this.generatePublicCode('c'),
        title: `${campaign.title} copy`.slice(0, 120),
        description: campaign.description,
        folder: campaign.folder,
        tags: campaign.tags,
        contentType: campaign.contentType,
        status: 'DRAFT',
        scanMode: campaign.scanMode,
        destinationUrl: campaign.destinationUrl,
        destinationData: campaign.destinationData ?? Prisma.JsonNull,
        brandName: campaign.brandName,
        brandPrimaryColor: campaign.brandPrimaryColor,
        brandAccentColor: campaign.brandAccentColor,
        designSettings: campaign.designSettings ?? Prisma.JsonNull,
      },
    });
    return this.findMineById(userId, copy.id);
  }

  async bulkAction(userId: string, ids: string[], action: 'PAUSE' | 'ARCHIVE') {
    if (ids.length === 0) return { updated: 0 };
    const result = await prisma.qrCampaign.updateMany({
      where: {
        id: { in: ids },
        ownerId: userId,
        status: action === 'ARCHIVE' ? { not: 'ARCHIVED' } : 'ACTIVE',
      },
      data: action === 'ARCHIVE'
        ? { status: 'ARCHIVED', archivedAt: new Date() }
        : { status: 'PAUSED' },
    });
    return { updated: result.count };
  }

  async createVariant(userId: string, campaignId: string, dto: CreateQrPlacementVariantDto) {
    const campaign = await this.requireOwnerCampaign(userId, campaignId);
    const access = await this.entitlements.listForUser(userId);
    if (!access.hasPro) {
      throw new ForbiddenException('Placement variants and UTM attribution require Pro QR Studio');
    }
    this.assertVariantAttributionAllowed(campaign.contentType, dto);
    const name = this.variantName(dto.name);
    const variant = await prisma.qrPlacementVariant.create({
      data: {
        campaignId,
        publicCode: await this.generatePublicCode('p'),
        name,
        ...this.variantAttribution(dto),
      },
    });
    return { ...variant, publicUrl: `/qr/${variant.publicCode}` };
  }

  async updateVariant(
    userId: string,
    campaignId: string,
    variantId: string,
    dto: UpdateQrPlacementVariantDto,
  ) {
    const campaign = await this.requireOwnerCampaign(userId, campaignId);
    const access = await this.entitlements.listForUser(userId);
    if (!access.hasPro && !this.isDisableOnly(dto)) {
      throw new ForbiddenException('Placement variants and UTM attribution require Pro QR Studio');
    }
    const variant = await prisma.qrPlacementVariant.findFirst({
      where: { id: variantId, campaignId },
    });
    if (!variant) throw new NotFoundException('QR placement variant not found');
    this.assertVariantAttributionAllowed(campaign.contentType, dto);
    const updated = await prisma.qrPlacementVariant.update({
      where: { id: variantId },
      data: {
        name: dto.name === undefined ? undefined : this.variantName(dto.name),
        active: dto.active,
        ...this.variantAttribution(dto),
      },
    });
    return { ...updated, publicUrl: `/qr/${updated.publicCode}` };
  }

  async requireOwnerCampaign(userId: string, id: string) {
    const campaign = await prisma.qrCampaign.findFirst({
      where: { id, ownerId: userId },
    });
    if (!campaign) throw new NotFoundException('QR campaign not found');
    return campaign;
  }

  async isPubliclyAvailable(campaign: {
    status: QrCampaignStatus;
    expiresAt: Date | null;
    entitlement?: { status: string; expiresAt: Date } | null;
  }) {
    const now = new Date();
    return (
      campaign.status === 'ACTIVE' &&
      (!campaign.expiresAt || campaign.expiresAt > now) &&
      (!campaign.entitlement ||
        (campaign.entitlement.status === 'ACTIVE' && campaign.entitlement.expiresAt > now))
    );
  }

  private async assertHasApprovedAsset(campaignId: string) {
    const asset = await prisma.qrAsset.findFirst({
      where: {
        campaignId,
        active: true,
        safetyStatus: 'APPROVED' as QrAssetSafetyStatus,
      },
    });
    if (!asset) {
      throw new BadRequestException('Upload an approved file before activating this QR campaign');
    }
  }

  private async generatePublicCode(namespace: 'c' | 'p') {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `${namespace}_${randomBytes(18).toString('base64url')}`;
      const [campaign, variant] = await Promise.all([
        prisma.qrCampaign.findUnique({ where: { publicCode: code } }),
        prisma.qrPlacementVariant.findUnique({ where: { publicCode: code } }),
      ]);
      if (!campaign && !variant) return code;
    }
    throw new BadRequestException('Could not generate a QR campaign code');
  }

  private serializeOwnerCampaign(campaign: any) {
    const { _count, events, placementVariants, ...ownerCampaign } = campaign;
    return {
      ...ownerCampaign,
      publicUrl: `/qr/${campaign.publicCode}`,
      assets: campaign.assets ?? [],
      scanCount: _count?.events ?? 0,
      lastScannedAt: events?.[0]?.createdAt ?? null,
      placementVariants: (placementVariants ?? []).map((variant: any) => {
        const { _count: variantCount, events: variantEvents, ...placement } = variant;
        return {
          ...placement,
          publicUrl: `/qr/${variant.publicCode}`,
          scanCount: variantCount?.events ?? 0,
          lastScannedAt: variantEvents?.[0]?.createdAt ?? null,
        };
      }),
    };
  }

  private normalizeTags(tags?: string[]) {
    return [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  }

  private assertVariantAttributionAllowed(
    contentType: QrContentType,
    dto: Partial<CreateQrPlacementVariantDto>,
  ) {
    const hasUtm = [dto.utmSource, dto.utmMedium, dto.utmCampaign, dto.utmContent, dto.utmTerm]
      .some((value) => value?.trim());
    if (hasUtm && contentType !== 'WEBSITE') {
      throw new BadRequestException('UTM attribution is available only for website QR campaigns');
    }
  }

  private variantAttribution(dto: Partial<CreateQrPlacementVariantDto>) {
    const clean = (value: string | undefined) => value === undefined ? undefined : value.trim() || null;
    return {
      utmSource: clean(dto.utmSource),
      utmMedium: clean(dto.utmMedium),
      utmCampaign: clean(dto.utmCampaign),
      utmContent: clean(dto.utmContent),
      utmTerm: clean(dto.utmTerm),
    };
  }

  private isDisableOnly(dto: UpdateQrPlacementVariantDto) {
    return dto.active === false
      && dto.name === undefined
      && dto.utmSource === undefined
      && dto.utmMedium === undefined
      && dto.utmCampaign === undefined
      && dto.utmContent === undefined
      && dto.utmTerm === undefined;
  }

  private variantName(name: string) {
    const normalized = name.trim();
    if (!normalized) throw new BadRequestException('Placement name is required');
    return normalized;
  }
}
