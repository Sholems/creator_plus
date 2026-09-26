import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommunityAdminService } from './community-admin.service';

@Controller('community/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
export class CommunityAdminController {
  constructor(private readonly admin: CommunityAdminService) {}
  @Get('overview') overview() {
    return this.admin.overview();
  }
  @Get('reports') reports(@Query('status') status?: string) {
    return this.admin.reports(status);
  }
  @Patch('reports/:id') updateReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'RESOLVED' | 'DISMISSED' },
  ) {
    return this.admin.updateReport(req.user.sub, id, body.status);
  }
  @Get('moderation-history') history() {
    return this.admin.moderationHistory();
  }
  @Patch('members/:id/participation') participation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED'; reason?: string },
  ) {
    return this.admin.setParticipation(req.user.sub, id, body.status, body.reason);
  }
}
