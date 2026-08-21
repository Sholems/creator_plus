import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LicensesService } from './licenses.service';
import { LicenseSigningService } from './license-signing.service';
import { ActivateLicenseDto, LicenseDeviceDto, UpdateLicenseDto } from './dto/license.dto';

function clientIp(req: any): string | undefined {
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.ip ?? undefined;
}

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(
    private readonly licenses: LicensesService,
    private readonly signing: LicenseSigningService,
  ) {}

  // ─── Public activation API (used by the buyer's app / SDK) ────────────────

  @Post('activate')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Activate a license key on a device' })
  @ApiResponse({ status: 201, description: 'Signed activation certificate returned' })
  @ApiResponse({ status: 409, description: 'Device activation limit reached' })
  async activate(@Body() dto: ActivateLicenseDto, @Request() req: any) {
    return this.licenses.activate(dto.key, dto.deviceId, dto.deviceName, clientIp(req));
  }

  @Post('validate')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Re-validate an activated device and renew its certificate' })
  async validate(@Body() dto: LicenseDeviceDto, @Request() req: any) {
    return this.licenses.validate(dto.key, dto.deviceId, clientIp(req));
  }

  @Post('deactivate')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Release a device activation to free a slot' })
  async deactivate(@Body() dto: LicenseDeviceDto) {
    return this.licenses.deactivate(dto.key, dto.deviceId);
  }

  @Get('public-key')
  @ApiOperation({ summary: 'Public key for offline certificate verification' })
  publicKey() {
    return { algorithm: 'ES256', publicKey: this.signing.getPublicKeyPem() };
  }

  // ─── Buyer dashboard ──────────────────────────────────────────────────────

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current user's license keys" })
  findMine(@Request() req: any) {
    return this.licenses.findForBuyer(req.user.sub);
  }

  @Delete('mine/:id/devices/:deviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate one of your devices from a license' })
  removeDevice(
    @Request() req: any,
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.licenses.deactivateOwnDevice(req.user.sub, id, deviceId);
  }

  // ─── Creator dashboard ────────────────────────────────────────────────────

  @Get('creator')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List license keys issued for the creator products' })
  findForCreator(@Request() req: any) {
    return this.licenses.findForCreator(req.user.sub);
  }

  @Post('creator/:id/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a license key' })
  revoke(@Request() req: any, @Param('id') id: string) {
    return this.licenses.revoke(req.user.sub, id);
  }

  @Post('creator/:id/reset')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset (clear) all activations on a license key' })
  reset(@Request() req: any, @Param('id') id: string) {
    return this.licenses.resetActivations(req.user.sub, id);
  }

  @Patch('creator/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a license key (devices, expiry, status)' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateLicenseDto) {
    return this.licenses.update(req.user.sub, id, dto);
  }
}
