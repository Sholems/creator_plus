import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PLATFORM_ADMIN_ROLES } from './community-roles';
import { CommunityTeamService } from './community-team.service';

// Platform admins only — community managers cannot appoint other managers.
@ApiTags('community')
@Controller('community/admin/team')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PLATFORM_ADMIN_ROLES)
export class CommunityTeamController {
  constructor(private readonly team: CommunityTeamService) {}

  @Get()
  @ApiOperation({ summary: 'List community managers' })
  list() {
    return this.team.list();
  }

  @Post()
  @ApiOperation({ summary: 'Make a member a community manager (by email)' })
  grant(@Body() body: { email?: string }) {
    return this.team.grant(body?.email ?? '');
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a community manager' })
  revoke(@Param('userId') userId: string) {
    return this.team.revoke(userId);
  }
}
