import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { StorageService } from '../storage/storage.service';
import { QrAnalyticsService } from './qr-analytics.service';
import { QrCampaignsService } from './qr-campaigns.service';
import { destinationDomain, isCreatorPlusHost } from './qr-content-validation';

@Injectable()
export class QrPublicService {
  constructor(
    private readonly storage: StorageService,
    private readonly analytics: QrAnalyticsService,
    private readonly campaigns: QrCampaignsService,
  ) {}

  async resolve(code: string, req?: any) {
    const campaign = await prisma.qrCampaign.findUnique({
      where: { publicCode: code },
      include: {
        entitlement: true,
        assets: {
          where: { active: true },
          select: {
            id: true,
            kind: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            safetyStatus: true,
          },
        },
      },
    });

    if (!campaign || !(await this.campaigns.isPubliclyAvailable(campaign))) {
      return this.unavailable();
    }

    await this.analytics.recordEvent({
      campaignId: campaign.id,
      kind: 'SCAN',
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      referer: req?.headers?.referer || req?.headers?.referrer,
    });

    const primaryAsset = campaign.assets.find((asset) => asset.kind === 'CAMPAIGN_FILE');
    const canOpenFile = primaryAsset?.safetyStatus === 'APPROVED';
    const destinationUrl = campaign.destinationUrl;
    const externalDomain = destinationDomain(destinationUrl);

    if (campaign.scanMode === 'DIRECT_OPEN' && destinationUrl && !primaryAsset) {
      return {
        available: true,
        mode: 'DIRECT_OPEN',
        redirectUrl: destinationUrl,
        externalDomain,
        leavesCreatorPlus: !isCreatorPlusHost(destinationUrl),
      };
    }

    return {
      available: true,
      mode: 'LANDING_PAGE',
      code: campaign.publicCode,
      title: campaign.title,
      description: campaign.description,
      contentType: campaign.contentType,
      destinationUrl: primaryAsset ? null : destinationUrl,
      externalDomain,
      canOpenFile,
      asset: canOpenFile && primaryAsset
        ? {
            id: primaryAsset.id,
            fileName: primaryAsset.fileName,
            fileSize: primaryAsset.fileSize,
            mimeType: primaryAsset.mimeType,
          }
        : null,
      branding: {
        name: campaign.brandName,
        primaryColor: campaign.brandPrimaryColor,
        accentColor: campaign.brandAccentColor,
        design: campaign.designSettings,
      },
    };
  }

  async openFile(code: string, req?: any) {
    const campaign = await prisma.qrCampaign.findUnique({
      where: { publicCode: code },
      include: {
        entitlement: true,
        assets: {
          where: { active: true, kind: 'CAMPAIGN_FILE', safetyStatus: 'APPROVED' },
          take: 1,
        },
      },
    });

    if (!campaign || !(await this.campaigns.isPubliclyAvailable(campaign))) {
      throw new NotFoundException('QR campaign not available');
    }

    const asset = campaign.assets[0];
    if (!asset) throw new NotFoundException('QR file not available');

    await this.analytics.recordEvent({
      campaignId: campaign.id,
      kind: 'OPEN',
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      referer: req?.headers?.referer || req?.headers?.referrer,
    });

    const ttl = Math.min(Number(process.env.QR_SIGNED_URL_TTL_SECONDS || 300), 900);
    return {
      url: await this.storage.getSignedDownloadUrl(asset.fileKey, ttl),
      expiresIn: ttl,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    };
  }

  private unavailable() {
    return {
      available: false,
      mode: 'UNAVAILABLE',
      title: 'This QR campaign is unavailable',
      description: 'The creator may have paused, archived, or expired this campaign.',
    };
  }
}
