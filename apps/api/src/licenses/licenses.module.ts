import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';
import { LicenseSigningService } from './license-signing.service';

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, LicenseSigningService],
  // Exported so PaymentsService can issue keys during order fulfillment.
  exports: [LicensesService],
})
export class LicensesModule {}
