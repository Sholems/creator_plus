import { Controller, Get, Post, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DownloadsService } from './downloads.service';

@ApiTags('downloads')
@Controller('downloads')
export class DownloadsController {
  constructor(private downloadsService: DownloadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user downloads' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiResponse({ status: 200, description: 'Downloads returned' })
  async getUserDownloads(
    @Request() req,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.downloadsService.getUserDownloads(
      req.user.sub,
      page ? parseInt(page) : undefined,
      perPage ? parseInt(perPage) : undefined,
    );
  }

  @Get('file/:token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download file by token' })
  @ApiResponse({ status: 200, description: 'File URLs returned' })
  @ApiResponse({ status: 400, description: 'Download expired or limit reached' })
  @ApiResponse({ status: 403, description: 'Not authorized for this download' })
  async getFile(@Request() req: any, @Param('token') token: string) {
    return this.downloadsService.issueSignedUrls(
      token,
      req.user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('token/:token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a download by token' })
  @ApiResponse({ status: 200, description: 'Download recorded' })
  @ApiResponse({ status: 400, description: 'Download expired or limit reached' })
  @ApiResponse({ status: 403, description: 'Not authorized for this download' })
  async recordDownload(
    @Param('token') token: string,
    @Request() req: any,
  ) {
    return this.downloadsService.issueSignedUrls(
      token,
      req.user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
