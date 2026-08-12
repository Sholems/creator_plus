import { Module } from '@nestjs/common';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [CreatorsController],
  providers: [CreatorsService],
  exports: [CreatorsService],
})
export class CreatorsModule {}
