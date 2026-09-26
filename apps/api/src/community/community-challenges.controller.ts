import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommunityChallengesService } from './community-challenges.service';
import {
  ChallengeCheckInDto,
  CreateChallengeMilestoneDto,
  CreateCommunityChallengeDto,
  UpdateCommunityChallengeDto,
} from './dto/community-challenge.dto';

@Controller('community')
export class CommunityChallengesController {
  constructor(private readonly challenges: CommunityChallengesService) {}
  @Get('challenges') @UseGuards(JwtAuthGuard) list(@Request() req: any) {
    return this.challenges.list(req.user.sub);
  }
  @Get('challenges/:slug') @UseGuards(JwtAuthGuard) get(
    @Request() req: any,
    @Param('slug') slug: string,
  ) {
    return this.challenges.get(req.user.sub, slug);
  }
  @Post('challenges/:id/join') @UseGuards(JwtAuthGuard) join(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.challenges.join(req.user.sub, id);
  }
  @Post('challenges/:id/check-ins') @UseGuards(JwtAuthGuard) checkIn(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ChallengeCheckInDto,
  ) {
    return this.challenges.checkIn(req.user.sub, id, dto);
  }
  @Get('admin/challenges')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  adminList() {
    return this.challenges.adminList();
  }
  @Post('admin/challenges')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  create(@Body() dto: CreateCommunityChallengeDto) {
    return this.challenges.create(dto);
  }
  @Patch('admin/challenges/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateCommunityChallengeDto) {
    return this.challenges.update(id, dto);
  }
  @Post('admin/challenges/:id/milestones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  milestone(@Param('id') id: string, @Body() dto: CreateChallengeMilestoneDto) {
    return this.challenges.addMilestone(id, dto);
  }
}
