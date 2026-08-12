import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';

@ApiTags('feature-flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Public list of feature flags' })
  async list() {
    return this.featureFlagsService.publicList();
  }
}
