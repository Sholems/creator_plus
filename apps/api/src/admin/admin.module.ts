import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/roles.guard';
import { EmailModule } from '../email/email.module';
import { SearchModule } from '../search/search.module';
import { RefundsModule } from '../refunds/refunds.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { PaymentsModule } from '../payments/payments.module';
import { ContactModule } from '../contact/contact.module';
import { SupportTicketsModule } from '../support-tickets/support-tickets.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [
    EmailModule,
    SearchModule,
    RefundsModule,
    NotificationsModule,
    SettingsModule,
    PaymentsModule,
    ContactModule,
    SupportTicketsModule,
    FeatureFlagsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
