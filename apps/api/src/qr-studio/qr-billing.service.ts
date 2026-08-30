import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { prisma, Prisma, QrOfferCode } from '@creatorplus/database';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import { webBaseUrl } from '../common/urls';
import { QrCouponsService } from './qr-coupons.service';
import { QrEntitlementsService } from './qr-entitlements.service';
import {
  addDays,
  getQrOffer,
  isQrStudioEnabled,
  QR_PAYMENT_REFERENCE_PREFIX,
} from './qr-offer-definitions';

@Injectable()
export class QrBillingService {
  private readonly logger = new Logger(QrBillingService.name);

  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly coupons: QrCouponsService,
    private readonly entitlements: QrEntitlementsService,
  ) {}

  listOffers() {
    return Object.values(QrOfferCode).map(getQrOffer);
  }

  async createCheckout(userId: string, userEmail: string, offerCode: QrOfferCode, couponCode?: string) {
    if (!isQrStudioEnabled()) {
      throw new ServiceUnavailableException('QR Studio is not available yet');
    }

    const offer = getQrOffer(offerCode);
    if (!offer) {
      throw new BadRequestException('Unknown QR Studio offer');
    }

    // Optional admin discount coupon: reduces the charge; a full discount makes
    // it free and skips Paystack entirely.
    let chargeAmount = offer.amount;
    let couponApplication: Awaited<ReturnType<QrCouponsService['validateForOffer']>> | null = null;
    if (couponCode && couponCode.trim()) {
      couponApplication = await this.coupons.validateForOffer(couponCode, offer.code, offer.amount);
      chargeAmount = couponApplication.finalAmount;
    }

    const now = new Date();
    const accessEndsAt = addDays(now, offer.durationDays);
    const webBase = webBaseUrl();

    // Free (100% / full-discount) purchase: fulfil immediately, no Paystack.
    if (chargeAmount <= 0) {
      const payment = await prisma.qrPayment.create({
        data: {
          userId,
          offerCode: offer.code,
          offerName: offer.name,
          amount: new Prisma.Decimal(0),
          currency: offer.currency,
          campaignCredits: offer.campaignCredits,
          maxActiveCampaigns: offer.maxActiveCampaigns,
          accessStartsAt: now,
          accessEndsAt,
          status: 'SUCCEEDED',
          provider: 'free',
          providerReference: `${QR_PAYMENT_REFERENCE_PREFIX}_free_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          fulfilledAt: now,
          couponCode: couponApplication?.code ?? null,
          couponId: couponApplication?.couponId ?? null,
          discountAmount: couponApplication ? new Prisma.Decimal(couponApplication.discount) : null,
        },
      });
      await prisma.$transaction(async (tx) => {
        await this.entitlements.grantFromPayment({ userId, offerCode: offer.code, paymentId: payment.id, now });
        if (couponApplication) {
          await this.coupons.redeem(tx, {
            couponId: couponApplication.couponId,
            userId,
            paymentId: payment.id,
            offerCode: offer.code,
            discount: couponApplication.discount,
          });
        }
      });
      return {
        provider: 'free',
        free: true,
        paymentId: payment.id,
        offer,
        url: `${webBase}/creator/qr-studio?payment=${payment.id}&status=paid`,
      };
    }

    const provider = this.providerFactory.get('paystack');
    if (provider.name !== 'paystack') {
      throw new BadRequestException('QR Studio payments use Paystack');
    }

    const placeholderReference = `${QR_PAYMENT_REFERENCE_PREFIX}_pending_${Date.now()}`;
    const payment = await prisma.qrPayment.create({
      data: {
        userId,
        offerCode: offer.code,
        offerName: offer.name,
        amount: new Prisma.Decimal(chargeAmount),
        currency: offer.currency,
        campaignCredits: offer.campaignCredits,
        maxActiveCampaigns: offer.maxActiveCampaigns,
        accessStartsAt: now,
        accessEndsAt,
        provider: 'paystack',
        providerReference: placeholderReference,
        couponCode: couponApplication?.code ?? null,
        couponId: couponApplication?.couponId ?? null,
        discountAmount: couponApplication ? new Prisma.Decimal(couponApplication.discount) : null,
      },
    });
    try {
      const checkout = await provider.createCheckout({
        orderId: payment.id,
        buyerEmail: userEmail,
        currency: offer.currency,
        totalAmount: chargeAmount,
        items: [
          {
            productId: `qr:${offer.code}`,
            title: offer.name,
            unitPrice: chargeAmount,
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
