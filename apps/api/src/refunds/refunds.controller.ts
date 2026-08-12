import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RefundsService } from './refunds.service';

@ApiTags('refunds')
@Controller('refunds')
export class RefundsController {
  constructor(private refundsService: RefundsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a refund for a paid order' })
  create(@Request() req, @Body() dto: { orderId: string; reason: string }) {
    return this.refundsService.create(req.user.sub, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my refund requests' })
  findMine(@Request() req) {
    return this.refundsService.findMine(req.user.sub);
  }
}
