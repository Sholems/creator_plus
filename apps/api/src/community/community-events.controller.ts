import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommunityEventsService } from './community-events.service';
import { CreateCommunityEventDto, UpdateCommunityEventDto } from './dto/community-event.dto';

@Controller('community')
export class CommunityEventsController {
  constructor(private readonly events: CommunityEventsService) {}

  @Get('events')
  @UseGuards(JwtAuthGuard)
  list(@Request() req: any) {
    return this.events.list(req.user.sub);
  }

  @Get('events/:slug')
  @UseGuards(JwtAuthGuard)
  get(@Request() req: any, @Param('slug') slug: string) {
    return this.events.get(req.user.sub, slug);
  }

  @Post('events/:id/rsvp')
  @UseGuards(JwtAuthGuard)
  rsvp(@Request() req: any, @Param('id') id: string, @Body() body: { going?: boolean }) {
    return this.events.rsvp(req.user.sub, id, body.going ?? true);
  }

  @Get('admin/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  adminList() {
    return this.events.adminList();
  }

  @Post('admin/events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  create(@Body() dto: CreateCommunityEventDto) {
    return this.events.create(dto);
  }

  @Patch('admin/events/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateCommunityEventDto) {
    return this.events.update(id, dto);
  }
}
