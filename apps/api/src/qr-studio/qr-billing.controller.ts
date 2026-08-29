import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QrBillingService } from './qr-billing.service';
import { QrEntitlementsService } from './qr-entitlements.service';
import { CreateQrCheckoutDto } from './dto/qr-billing.dto';

@ApiTags('qr-studio')
@Controller('qr-studio/billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrBillingController {
  constructor(
    private readonly billing: QrBillingService,
    private readonly entitlements: QrEntitlementsService,
  ) {}

  @Get('offers')
  @ApiOperation({ summary: 'List QR Studio paid offers' })
  @ApiResponse({ status: 200, description: 'QR Studio offers returned' })
  offers() {
    return this.billing.listOffers();
  }

  @Get('access')
  @ApiOperation({ summary: "The user's QR Studio entitlement summary (paid access, Pro, slots)" })
  access(@Request() req) {
    return this.entitlements.listForUser(req.user.sub);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Start Paystack checkout for a QR Studio offer' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  checkout(@Request() req, @Body() dto: CreateQrCheckoutDto) {
    return this.billing.createCheckout(req.user.sub, req.user.email, dto.offerCode);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get QR Studio payment status' })
  payment(@Request() req, @Param('id') id: string) {
    return this.billing.findPayment(req.user.sub, id);
  }
}
