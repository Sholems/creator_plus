import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommunityHomeService } from './community-home.service';

@Controller('community')
export class CommunityHomeController {
  constructor(private readonly home: CommunityHomeService) {}

  @Get('home')
  @UseGuards(JwtAuthGuard)
  getHome(@Request() req: any) {
    return this.home.getHome(req.user.sub);
  }
}
