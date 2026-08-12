import { Controller, Post, Get, Body, Param, Req, Res, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCheckoutDto } from './dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    private providerFactory: PaymentProviderFactory,
  ) {}

  @Post('checkout/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a checkout session for an order' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  @ApiResponse({ status: 400, description: 'Invalid order or provider' })
  async createCheckout(
    @Request() req,
    @Param('orderId') orderId: string,
    @Body() dto?: CreateCheckoutDto,
  ) {
    return this.paymentsService.createCheckoutSession(
      orderId,
      req.user.sub,
      req.user.email,
      dto?.provider,
    );
  }

  @Get('providers')
  @ApiOperation({ summary: 'List configured payment providers' })
  @ApiResponse({ status: 200, description: 'Available providers returned' })
  getProviders() {
    return this.providerFactory.listAvailable();
  }

  @Post('wallet/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay for an order using the wallet balance' })
  @ApiResponse({ status: 201, description: 'Order paid from wallet' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid order' })
  async payWithWallet(@Request() req, @Param('orderId') orderId: string) {
    return this.paymentsService.payWithWallet(orderId, req.user.sub);
  }

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet returned' })
  async getWallet(@Request() req) {
    return this.paymentsService.getWallet(req.user.sub);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payments for an order' })
  @ApiResponse({ status: 200, description: 'Payments returned' })
  async findByOrder(@Request() req, @Param('orderId') orderId: string) {
    return this.paymentsService.findByOrderId(orderId, req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment returned' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findById(@Request() req, @Param('id') id: string) {
    return this.paymentsService.findById(id, req.user.sub);
  }

  @Post('webhook/:provider')
  @SkipThrottle()
  @ApiOperation({ summary: 'Handle a payment provider webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const signature =
      provider === 'stripe'
        ? (req.headers['stripe-signature'] as string)
        : provider === 'paystack'
          ? (req.headers['x-paystack-signature'] as string)
          : (req.headers['verif-hash'] as string);

    try {
      await this.paymentsService.handleWebhook(
        provider,
        req.rawBody || req.body,
        signature,
      );
      res.json({ received: true });
    } catch (err: any) {
      this.logger.error(`[webhook:${provider}] ${err.message}`);
      res.status(400).json({ error: err.message || 'Webhook processing failed' });
    }
  }
}
