import { Controller, Param, Post, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QrAssetKind } from '@creatorplus/database';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QrAssetsService, MulterFile } from './qr-assets.service';

@ApiTags('qr-studio')
@Controller('qr-studio/campaigns/:campaignId/assets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrAssetsController {
  constructor(private readonly assets: QrAssetsService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a private hosted file for a QR campaign' })
  @ApiResponse({ status: 201, description: 'QR asset uploaded' })
  uploadFile(
    @Request() req,
    @Param('campaignId') campaignId: string,
    @UploadedFile() file: MulterFile,
  ) {
    return this.assets.upload(req.user.sub, campaignId, file, 'CAMPAIGN_FILE');
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a brand logo for a QR campaign' })
  uploadLogo(
    @Request() req,
    @Param('campaignId') campaignId: string,
    @UploadedFile() file: MulterFile,
  ) {
    return this.assets.upload(req.user.sub, campaignId, file, 'BRAND_LOGO' as QrAssetKind);
  }
}
