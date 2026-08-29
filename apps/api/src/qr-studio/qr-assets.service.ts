import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { prisma, QrAssetKind } from '@creatorplus/database';
import { StorageService } from '../storage/storage.service';
import { QrCampaignsService } from './qr-campaigns.service';
import { QrFileSafetyService } from './qr-file-safety.service';
import { validateQrAsset } from './qr-asset-validation';

export interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class QrAssetsService {
  constructor(
    private readonly storage: StorageService,
    private readonly campaigns: QrCampaignsService,
    private readonly fileSafety: QrFileSafetyService,
  ) {}

  async upload(userId: string, campaignId: string, file: MulterFile, kind: QrAssetKind = 'CAMPAIGN_FILE') {
    await this.campaigns.requireOwnerCampaign(userId, campaignId);
    validateQrAsset(file, kind);

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const folder = kind === 'CAMPAIGN_FILE' ? `qr/campaigns/${campaignId}/files` : `qr/campaigns/${campaignId}/brand`;
    const uploaded = await this.storage.uploadFile(file.buffer, file.originalname, file.mimetype, folder);

    const asset = await prisma.$transaction(async (tx) => {
      if (kind === 'CAMPAIGN_FILE') {
        await tx.qrAsset.updateMany({
          where: { campaignId, kind, active: true },
          data: { active: false },
        });
      }
      return tx.qrAsset.create({
        data: {
          campaignId,
          kind,
          fileName: file.originalname,
          fileKey: uploaded.key,
          fileSize: BigInt(file.size),
          mimeType: file.mimetype,
          checksum,
          safetyStatus: this.fileSafety.initialStatus(),
        },
        select: {
          id: true,
          kind: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          checksum: true,
          safetyStatus: true,
          safetyReason: true,
          active: true,
          createdAt: true,
        },
      });
    });

    return asset;
  }
}
