import { Module } from '@nestjs/common';
import { AffiliatesController, AdminAffiliatesController } from './affiliates.controller';
import { AffiliatesService } from './affiliates.service';
import { CommissionService } from './commission.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AffiliatesController, AdminAffiliatesController],
  providers: [AffiliatesService, CommissionService],
  exports: [AffiliatesService, CommissionService],
})
export class AffiliatesModule {}
