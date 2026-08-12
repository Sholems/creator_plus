import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from '../common';

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  @ApiResponse({ status: 400, description: 'Invalid coupon data' })
  async create(@Request() req, @Body() dto: CreateCouponDto) {
    return this.couponsService.create(req.user.sub, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List my coupons' })
  @ApiResponse({ status: 200, description: 'Coupons returned' })
  async findMine(@Request() req) {
    return this.couponsService.findMine(req.user.sub);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code against cart items' })
  @ApiResponse({ status: 201, description: 'Coupon validated' })
  @ApiResponse({ status: 400, description: 'Invalid, expired or inapplicable coupon' })
  async validate(@Request() req, @Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto.code, dto.items);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon deactivated' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.couponsService.remove(req.user.sub, id);
  }
}
