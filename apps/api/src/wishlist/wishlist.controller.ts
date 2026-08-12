import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist returned' })
  async getWishlist(@Request() req) {
    return this.wishlistService.getOrCreateDefault(req.user.sub);
  }

  @Post('items/:productId')
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist' })
  @ApiResponse({ status: 409, description: 'Product already in wishlist' })
  async addItem(@Request() req, @Param('productId') productId: string) {
    return this.wishlistService.addItem(req.user.sub, productId);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({ status: 200, description: 'Product removed from wishlist' })
  async removeItem(@Request() req, @Param('productId') productId: string) {
    return this.wishlistService.removeItem(req.user.sub, productId);
  }
}
