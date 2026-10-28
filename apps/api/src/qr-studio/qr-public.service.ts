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
    const target = await this.findTarget(code, {
      where: { active: true },
      select: {
        id: true,
        kind: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        safetyStatus: true,
      },
    });
    const campaign = target?.campaign;
    const placement = target?.placement;

    if (!campaign || placement?.active === false || !(await this.campaigns.isPubliclyAvailable(campaign))) {
      return this.unavailable();
    }

    void this.analytics.recordEvent({
      campaignId: campaign.id,
      placementVariantId: placement?.id,
      kind: 'SCAN',
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      referer: req?.headers?.referer || req?.headers?.referrer,
      country: req?.headers?.['cf-ipcountry'],
    }).catch(() => undefined);

    const usesHostedFile = campaign.contentType === 'FILE' || campaign.contentType === 'IMAGE_GALLERY';
    const primaryAsset = usesHostedFile
      ? campaign.assets.find((asset: any) => asset.kind === 'CAMPAIGN_FILE')
      : undefined;
    const canOpenFile = primaryAsset?.safetyStatus === 'APPROVED';
    const destinationUrl = this.destinationWithAttribution(campaign, placement);
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
      code,
      title: campaign.title,
      description: campaign.description,
      contentType: campaign.contentType,
      destinationUrl: primaryAsset ? null : destinationUrl,
      destinationData: primaryAsset ? null : campaign.destinationData,
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
      placement: placement ? { id: placement.id, name: placement.name } : null,
      branding: {
        name: campaign.brandName,
        primaryColor: campaign.brandPrimaryColor,
        accentColor: campaign.brandAccentColor,
        design: campaign.designSettings,
      },
    };
  }

  async openFile(code: string, req?: any) {
    const target = await this.findTarget(code, {
      where: { active: true, kind: 'CAMPAIGN_FILE', safetyStatus: 'APPROVED' },
      take: 1,
    });
    const campaign = target?.campaign;
    const placement = target?.placement;

    const usesHostedFile = campaign?.contentType === 'FILE' || campaign?.contentType === 'IMAGE_GALLERY';
    if (!campaign || placement?.active === false || !usesHostedFile || !(await this.campaigns.isPubliclyAvailable(campaign))) {
      throw new NotFoundException('QR campaign not available');
    }

    const asset = campaign.assets[0];
    if (!asset) throw new NotFoundException('QR file not available');

    const ttl = Math.min(Number(process.env.QR_SIGNED_URL_TTL_SECONDS || 300), 900);
    const url = await this.storage.getSignedDownloadUrl(asset.fileKey, ttl);

    void this.analytics.recordEvent({
      campaignId: campaign.id,
      placementVariantId: placement?.id,
      kind: 'OPEN',
      actionType: 'FILE_OPEN',
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      referer: req?.headers?.referer || req?.headers?.referrer,
      country: req?.headers?.['cf-ipcountry'],
    }).catch(() => undefined);

    return {
      url,
      expiresIn: ttl,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    };
  }

  async recordAction(code: string, actionType: string, req?: any) {
    const target = await this.findTarget(code);
    const campaign = target?.campaign;
    const placement = target?.placement;
    if (!campaign || placement?.active === false || !(await this.campaigns.isPubliclyAvailable(campaign))) {
      throw new NotFoundException('QR campaign not available');
    }

    void this.analytics.recordEvent({
      campaignId: campaign.id,
      placementVariantId: placement?.id,
      kind: 'ACTION',
      actionType,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      referer: req?.headers?.referer || req?.headers?.referrer,
      country: req?.headers?.['cf-ipcountry'],
    }).catch(() => undefined);

    return { recorded: true };
  }

  private async findTarget(code: string, assets?: Record<string, any>) {
    const include = {
      entitlement: true,
      ...(assets ? { assets } : {}),
    };
    if (code.startsWith('p_')) {
      const placement = await prisma.qrPlacementVariant.findUnique({
        where: { publicCode: code },
        include: { campaign: { include } },
      });
      if (placement) return { campaign: placement.campaign, placement };
    }

    const campaign = await prisma.qrCampaign.findUnique({
      where: { publicCode: code },
      include,
    });
    if (campaign) return { campaign, placement: null };
    return null;
  }

  private destinationWithAttribution(campaign: any, placement: any) {
    if (!campaign.destinationUrl || campaign.contentType !== 'WEBSITE' || !placement) {
      return campaign.destinationUrl;
    }
    const url = new URL(campaign.destinationUrl);
    const fields = [
      ['utm_source', placement.utmSource],
      ['utm_medium', placement.utmMedium],
      ['utm_campaign', placement.utmCampaign],
      ['utm_content', placement.utmContent],
      ['utm_term', placement.utmTerm],
    ];
    for (const [key, value] of fields) {
      if (value) url.searchParams.set(key, value);
    }
    return url.toString();
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
