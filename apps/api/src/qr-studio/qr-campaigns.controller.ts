import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QrCampaignsService } from './qr-campaigns.service';
import { ChangeQrCampaignStatusDto, CreateQrCampaignDto, UpdateQrCampaignDto } from './dto/qr-campaign.dto';

@ApiTags('qr-studio')
@Controller('qr-studio/campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrCampaignsController {
  constructor(private readonly campaigns: QrCampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List my QR campaigns' })
  @ApiResponse({ status: 200, description: 'QR campaigns returned' })
  mine(@Request() req) {
    return this.campaigns.findMine(req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a paid QR campaign draft' })
  @ApiResponse({ status: 201, description: 'QR campaign created' })
  create(@Request() req, @Body() dto: CreateQrCampaignDto) {
    return this.campaigns.create(req.user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my QR campaigns' })
  get(@Request() req, @Param('id') id: string) {
    return this.campaigns.findMineById(req.user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a QR campaign' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateQrCampaignDto) {
    return this.campaigns.update(req.user.sub, id, dto);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Change QR campaign status' })
  changeStatus(@Request() req, @Param('id') id: string, @Body() dto: ChangeQrCampaignStatusDto) {
    if (dto.status === 'ACTIVE') return this.campaigns.activate(req.user.sub, id);
    if (dto.status === 'PAUSED') return this.campaigns.pause(req.user.sub, id);
    return this.campaigns.archive(req.user.sub, id);
  }
}
