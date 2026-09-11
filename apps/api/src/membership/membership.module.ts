import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';

@Module({
  imports: [SettingsModule],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
