import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [BillingController, WebhooksController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
