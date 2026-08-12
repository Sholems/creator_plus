import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';

@Module({
  imports: [PaymentsModule, NotificationsModule, AffiliatesModule],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
