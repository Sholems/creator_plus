import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CouponsModule } from '../coupons/coupons.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [CouponsModule, AffiliatesModule, EventsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
