import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommunityProfilesService } from './community-profiles.service';
import {
  UpdateCommunityPreferencesDto,
  UpdateCommunityProfileDto,
} from './dto/community-profile.dto';

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityProfilesController {
  constructor(private readonly profiles: CommunityProfilesService) {}
  @Get('members') list(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.profiles.list(req.user.sub, search, cursor);
  }
  @Get('members/:id') get(@Request() req: any, @Param('id') id: string) {
    return this.profiles.get(req.user.sub, id);
  }
  @Patch('me/profile') updateMe(@Request() req: any, @Body() dto: UpdateCommunityProfileDto) {
    return this.profiles.updateMe(req.user.sub, dto);
  }
  @Post('members/:id/follow') follow(@Request() req: any, @Param('id') id: string) {
    return this.profiles.toggleFollow(req.user.sub, id);
  }
  @Get('me/community-preferences') preferences(@Request() req: any) {
    return this.profiles.getPreferences(req.user.sub);
  }
  @Patch('me/community-preferences') updatePreferences(
    @Request() req: any,
    @Body() dto: UpdateCommunityPreferencesDto,
  ) {
    return this.profiles.updatePreferences(req.user.sub, dto);
  }
  @Post('posts/:id/save') save(@Request() req: any, @Param('id') id: string) {
    return this.profiles.togglePostRelation(req.user.sub, id, 'bookmark');
  }
  @Post('posts/:id/subscribe') subscribe(@Request() req: any, @Param('id') id: string) {
    return this.profiles.togglePostRelation(req.user.sub, id, 'subscription');
  }
}
