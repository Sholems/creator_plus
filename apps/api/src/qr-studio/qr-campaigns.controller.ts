import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QrCampaignsService } from './qr-campaigns.service';
import {
  BulkQrCampaignActionDto,
  ChangeQrCampaignStatusDto,
  CreateQrCampaignDto,
  CreateQrPlacementVariantDto,
  UpdateQrCampaignDto,
  UpdateQrPlacementVariantDto,
} from './dto/qr-campaign.dto';

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

  @Post('bulk')
  @ApiOperation({ summary: 'Pause or archive several owned QR campaigns' })
  bulk(@Request() req, @Body() dto: BulkQrCampaignActionDto) {
    return this.campaigns.bulkAction(req.user.sub, dto.ids, dto.action);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an owned QR campaign as a draft' })
  duplicate(@Request() req, @Param('id') id: string) {
    return this.campaigns.duplicate(req.user.sub, id);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Create a placement variant with its own stable QR code' })
  createVariant(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateQrPlacementVariantDto,
  ) {
    return this.campaigns.createVariant(req.user.sub, id, dto);
  }

  @Patch(':id/variants/:variantId')
  @ApiOperation({ summary: 'Update or disable a placement variant' })
  updateVariant(
    @Request() req,
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateQrPlacementVariantDto,
  ) {
    return this.campaigns.updateVariant(req.user.sub, id, variantId, dto);
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
