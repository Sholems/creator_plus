import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from '../common';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(@Request() req, @Body() dto: CreateOrderDto) {
    const forwarded = req.headers?.['x-forwarded-for'];
    const ipAddress =
      typeof forwarded === 'string' && forwarded.length > 0
        ? forwarded.split(',')[0].trim()
        : (req.ip ?? undefined);
    return this.ordersService.create(
      req.user.sub,
      dto.items,
      dto.couponCode,
      dto.affiliateCode,
      {
        visitorId: dto.visitorId,
        sessionId: dto.sessionId,
        ipAddress,
        userAgent: req.headers?.['user-agent'],
        referer: req.headers?.['referer'] ?? req.headers?.['referrer'],
        utm: dto.utm,
        acquisitionSource: dto.acquisitionSource as any,
      },
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders for current user' })
  @ApiResponse({ status: 200, description: 'Orders returned' })
  async findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.ordersService.findByBuyer(
      req.user.sub,
      page ? parseInt(page as any) : undefined,
      perPage ? parseInt(perPage as any) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order returned' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findById(@Request() req, @Param('id') id: string) {
    return this.ordersService.findById(id, req.user.sub);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel order' })
  async cancel(@Request() req, @Param('id') id: string) {
    return this.ordersService.cancel(id, req.user.sub);
  }
}
