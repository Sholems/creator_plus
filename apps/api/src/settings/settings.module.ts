import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { PlatformController } from './platform.controller';

@Module({
  controllers: [PlatformController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
