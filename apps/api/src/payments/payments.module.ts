import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { LicensesModule } from '../licenses/licenses.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EmailModule, NotificationsModule, SettingsModule, AffiliatesModule, LicensesModule, EventsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProviderFactory],
  exports: [PaymentsService, PaymentProviderFactory],
})
export class PaymentsModule {}
