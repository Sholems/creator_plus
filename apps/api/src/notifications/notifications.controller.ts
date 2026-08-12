import { Controller, Get, Post, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List current user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications returned' })
  async findAll(@Request() req, @Query('page') page?: string, @Query('perPage') perPage?: string) {
    return this.notificationsService.findByUser(req.user.sub, Number(page) || 1, Number(perPage) || 20);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Count unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread count returned' })
  async unreadCount(@Request() req) {
    return this.notificationsService.unreadCount(req.user.sub);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.sub, id);
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllRead(@Request() req) {
    return this.notificationsService.markAllRead(req.user.sub);
  }
}
