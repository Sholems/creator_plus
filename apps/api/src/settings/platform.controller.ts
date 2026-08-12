import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('platform')
@Controller('platform')
export class PlatformController {
  constructor(private settingsService: SettingsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Public platform status (maintenance, registration)' })
  async status() {
    const settings = await this.settingsService.getPlatformSettings();
    return {
      maintenanceMode: settings.maintenanceMode,
      registrationEnabled: settings.registrationEnabled,
    };
  }
}
