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
  assertScanModeAllowed,
  validateCampaignDestination,
} from './qr-content-validation';
import { CreateQrCampaignDto, UpdateQrCampaignDto } from './dto/qr-campaign.dto';
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
        _count: { select: { events: true } },
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
        _count: { select: { events: true } },
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
        publicCode: await this.generatePublicCode(),
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
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
    assertContentTypeAllowed(campaign.contentType, entitlements.hasPro);
    if (dto.scanMode) assertScanModeAllowed(dto.scanMode, entitlements.hasPro);

    const destination =
      dto.destinationUrl !== undefined || dto.destinationData !== undefined
        ? validateCampaignDestination(
            campaign.contentType,
            dto.destinationUrl ?? campaign.destinationUrl,
            (dto.destinationData as Record<string, any> | null) ?? (campaign.destinationData as Record<string, any> | null),
          )
        : undefined;

    await prisma.qrCampaign.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
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
        entitlementId: entitlement.id,
        activatedAt: campaign.activatedAt ?? new Date(),
        expiresAt: entitlement.expiresAt,
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

  private async generatePublicCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomBytes(18).toString('base64url');
      const existing = await prisma.qrCampaign.findUnique({ where: { publicCode: code } });
      if (!existing) return code;
    }
    throw new BadRequestException('Could not generate a QR campaign code');
  }

  private serializeOwnerCampaign(campaign: any) {
    return {
      ...campaign,
      publicUrl: `/qr/${campaign.publicCode}`,
      assets: campaign.assets ?? [],
    };
  }
}
