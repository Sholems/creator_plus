import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { prisma, Prisma, QrOfferCode } from '@creatorplus/database';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import { webBaseUrl } from '../common/urls';
import {
  addDays,
  getQrOffer,
  isQrStudioEnabled,
  QR_PAYMENT_REFERENCE_PREFIX,
} from './qr-offer-definitions';

@Injectable()
export class QrBillingService {
  private readonly logger = new Logger(QrBillingService.name);

  constructor(private readonly providerFactory: PaymentProviderFactory) {}

  listOffers() {
    return Object.values(QrOfferCode).map(getQrOffer);
  }

  async createCheckout(userId: string, userEmail: string, offerCode: QrOfferCode) {
    if (!isQrStudioEnabled()) {
      throw new ServiceUnavailableException('QR Studio is not available yet');
    }

    const offer = getQrOffer(offerCode);
    if (!offer) {
      throw new BadRequestException('Unknown QR Studio offer');
    }

    const provider = this.providerFactory.get('paystack');
    if (provider.name !== 'paystack') {
      throw new BadRequestException('QR Studio payments use Paystack');
    }

    const now = new Date();
    const accessEndsAt = addDays(now, offer.durationDays);
    const placeholderReference = `${QR_PAYMENT_REFERENCE_PREFIX}_pending_${Date.now()}`;

    const payment = await prisma.qrPayment.create({
      data: {
        userId,
        offerCode: offer.code,
        offerName: offer.name,
        amount: new Prisma.Decimal(offer.amount),
        currency: offer.currency,
        campaignCredits: offer.campaignCredits,
        maxActiveCampaigns: offer.maxActiveCampaigns,
        accessStartsAt: now,
        accessEndsAt,
        provider: 'paystack',
        providerReference: placeholderReference,
      },
    });

    const webBase = webBaseUrl();
    try {
      const checkout = await provider.createCheckout({
        orderId: payment.id,
        buyerEmail: userEmail,
        currency: offer.currency,
        totalAmount: offer.amount,
        items: [
          {
            productId: `qr:${offer.code}`,
            title: offer.name,
            unitPrice: offer.amount,
            quantity: 1,
          },
        ],
        successUrl: `${webBase}/creator/qr-studio?payment=${payment.id}&status=pending`,
        cancelUrl: `${webBase}/creator/qr-studio?payment=${payment.id}&status=canceled`,
        platformFeePercent: 0,
        purpose: 'qr_studio',
        referencePrefix: QR_PAYMENT_REFERENCE_PREFIX,
        metadata: {
          qrPaymentId: payment.id,
          offerCode: offer.code,
          userId,
          custom_fields: [
            {
              display_name: 'QR Studio offer',
              variable_name: 'qr_offer_code',
              value: offer.code,
            },
          ],
        },
      });

      await prisma.qrPayment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: checkout.providerPaymentId,
          providerReference: checkout.providerReference || checkout.providerPaymentId || placeholderReference,
          providerResponse: { redirectUrl: checkout.redirectUrl },
        },
      });

      return {
        provider: 'paystack',
        paymentId: payment.id,
        offer,
        url: checkout.redirectUrl,
      };
    } catch (err: any) {
      this.logger.error(`[qr-checkout:paystack] ${err?.message}`);
      await prisma.qrPayment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', providerResponse: { error: err?.message || 'checkout_failed' } },
      });
      throw new BadRequestException(err?.message || 'Could not start QR Studio checkout');
    }
  }

  async findPayment(userId: string, paymentId: string) {
    const payment = await prisma.qrPayment.findFirst({
      where: { id: paymentId, userId },
      select: {
        id: true,
        offerCode: true,
        offerName: true,
        amount: true,
        currency: true,
        status: true,
        fulfilledAt: true,
        accessEndsAt: true,
        createdAt: true,
      },
    });
    if (!payment) throw new BadRequestException('QR payment not found');
    return payment;
  }
}
