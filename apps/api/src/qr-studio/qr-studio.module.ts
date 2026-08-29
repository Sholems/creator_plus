import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { PaymentsModule } from '../payments/payments.module';
import { QrAssetsController } from './qr-assets.controller';
import { QrBillingController } from './qr-billing.controller';
import { QrCampaignsController } from './qr-campaigns.controller';
import { QrPublicController } from './qr-public.controller';
import { QrAssetsService } from './qr-assets.service';
import { QrBillingService } from './qr-billing.service';
import { QrCampaignsService } from './qr-campaigns.service';
import { QrEntitlementsService } from './qr-entitlements.service';
import { QrFileSafetyService } from './qr-file-safety.service';
import { QrPublicService } from './qr-public.service';
import { QrAnalyticsService } from './qr-analytics.service';

@Module({
  imports: [StorageModule, PaymentsModule],
  controllers: [
    QrBillingController,
    QrCampaignsController,
    QrAssetsController,
    QrPublicController,
  ],
  providers: [
    QrBillingService,
    QrCampaignsService,
    QrEntitlementsService,
    QrAssetsService,
    QrFileSafetyService,
    QrPublicService,
    QrAnalyticsService,
  ],
  exports: [QrEntitlementsService],
})
export class QrStudioModule {}
