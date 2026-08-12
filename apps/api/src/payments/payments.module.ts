import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';

@Module({
  imports: [EmailModule, NotificationsModule, SettingsModule, AffiliatesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProviderFactory],
  exports: [PaymentsService, PaymentProviderFactory],
})
export class PaymentsModule {}
