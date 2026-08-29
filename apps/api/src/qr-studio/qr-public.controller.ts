import { Controller, Get, Header, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QrPublicService } from './qr-public.service';

@ApiTags('qr-public')
@Controller('qr')
export class QrPublicController {
  constructor(private readonly publicQr: QrPublicService) {}

  @Get(':code')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Resolve a public QR campaign' })
  @ApiResponse({ status: 200, description: 'QR campaign resolution returned' })
  resolve(@Param('code') code: string, @Req() req: any) {
    return this.publicQr.resolve(code, req);
  }

  @Get(':code/open')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Open the private file for an active QR campaign' })
  open(@Param('code') code: string, @Req() req: any) {
    return this.publicQr.openFile(code, req);
  }
}
