import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PushService } from './push.service';

@Controller('community/push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('public-key')
  @UseGuards(JwtAuthGuard)
  publicKey() {
    return { publicKey: this.push.getPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@Request() req: any, @Body() body: any) {
    return this.push.subscribe(req.user.sub, body);
  }

  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(@Request() req: any, @Body() body: { endpoint?: string }) {
    return this.push.unsubscribe(req.user.sub, body?.endpoint);
  }
}
