import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QrAnalyticsService } from './qr-analytics.service';
import { QrAnalyticsQueryDto } from './dto/qr-analytics.dto';

@ApiTags('qr-studio')
@Controller('qr-studio/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrAnalyticsController {
  constructor(private readonly analytics: QrAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my QR campaign analytics' })
  overview(@Request() req: any, @Query() query: QrAnalyticsQueryDto) {
    return this.analytics.overview(req.user.sub, query);
  }
}
