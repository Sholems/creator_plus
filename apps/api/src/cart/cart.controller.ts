import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';

@ApiTags('cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart' })
  @ApiResponse({ status: 200, description: 'Cart returned' })
  async getCart(@Request() req) {
    return this.cartService.getOrCreateCart(req.user.sub);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addItem(
    @Request() req,
    @Body() body: { productId: string; licenseType?: string; quantity?: number },
  ) {
    return this.cartService.addItem(
      req.user.sub,
      body.productId,
      body.licenseType,
      body.quantity,
    );
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Item updated' })
  async updateItem(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateItemQuantity(req.user.sub, itemId, body.quantity);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  async removeItem(@Request() req, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(req.user.sub, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.sub);
  }
}
