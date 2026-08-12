import { Controller, Get, Post, Body, Req, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSubscriptionCheckoutDto, PurchaseCreditPackDto } from './dto/billing.dto';
import { prisma } from '@creatormarket/database';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription returned' })
  async getSubscription(@Request() req: any) {
    return this.billingService.getSubscription(req.user.sub);
  }

  @Post('subscription/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async createSubscriptionCheckout(
    @Request() req: any,
    @Body() dto: CreateSubscriptionCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(
      req.user.sub,
      dto.tier,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Post('subscription/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancelSubscription(@Request() req: any) {
    return this.billingService.cancelSubscription(req.user.sub);
  }

  @Post('subscription/reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate subscription' })
  @ApiResponse({ status: 200, description: 'Subscription reactivated' })
  async reactivateSubscription(@Request() req: any) {
    return this.billingService.reactivateSubscription(req.user.sub);
  }

  @Get('credits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credit balance' })
  @ApiResponse({ status: 200, description: 'Credit balance returned' })
  async getCreditBalance(@Request() req: any) {
    return this.billingService.getCreditBalance(req.user.sub);
  }

  @Get('credit-packs')
  @ApiOperation({ summary: 'List available credit packs' })
  @ApiResponse({ status: 200, description: 'Credit packs returned' })
  async getCreditPacks() {
    return this.billingService.getCreditPacks();
  }

  @Post('credit-packs/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase credit pack checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async purchaseCreditPack(
    @Request() req: any,
    @Body() dto: PurchaseCreditPackDto,
  ) {
    return this.billingService.purchaseCreditPack(
      req.user.sub,
      dto.packId,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get usage records for current user' })
  @ApiResponse({ status: 200, description: 'Usage records returned' })
  async getUsage(@Request() req: any) {
    return prisma.usageRecord.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
    });
  }
}
