import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { prisma, Prisma } from '@creatorplus/database';
import { PaymentProviderFactory } from '../payments/providers/payment-provider.factory';
import { NotificationsService } from '../notifications/notifications.service';
import { CommissionService } from '../affiliates/commission.service';
import { clawBackCreatorCredits } from '../common/money-reversal';
import { paginate, pageMeta } from '../common/pagination';

const REFUNDABLE_ORDER_STATUSES = ['PAID', 'FULFILLED', 'COMPLETED'] as const;

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly providerFactory: PaymentProviderFactory,
    private readonly notificationsService: NotificationsService,
    private readonly commissionService: CommissionService,
  ) {}

  async create(userId: string, dto: { orderId: string; reason: string }) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Please provide a reason for the refund');
    }

    const order = await prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Not authorized to request a refund for this order');
    }

    if (!(REFUNDABLE_ORDER_STATUSES as readonly string[]).includes(order.status)) {
      throw new BadRequestException('Refunds can only be requested for paid orders');
    }

    const existing = await prisma.refund.findFirst({
      where: {
        orderId: order.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (existing) {
      throw new BadRequestException('A refund is already pending or approved for this order');
    }

    const payment = await prisma.payment.findFirst({
      where: { orderId: order.id, status: 'SUCCEEDED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      throw new BadRequestException('No successful payment found for this order');
    }

    return prisma.refund.create({
      data: {
        orderId: order.id,
        paymentId: payment.id,
        amount: order.totalAmount,
        reason: dto.reason.trim(),
        status: 'PENDING',
      },
      include: {
        order: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            currency: true,
            status: true,
          },
        },
      },
    });
  }

  async findMine(userId: string) {
    return prisma.refund.findMany({
      where: { order: { buyerId: userId } },
      include: {
        order: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            currency: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(pageArg = 1, perPageArg = 20, status?: string) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);
    const where = status ? { status: status as any } : {};

    const [data, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              currency: true,
              status: true,
              buyer: {
                select: { email: true, displayName: true },
              },
            },
          },
        },
      }),
      prisma.refund.count({ where }),
    ]);

    return {
      data,
      pagination: pageMeta(page, perPage, total),
    };
  }

  async approve(id: string, adminId: string) {
    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        payment: {
          select: {
            provider: true,
            providerPaymentId: true,
            providerResponse: true,
          },
        },
        order: {
          select: {
            id: true,
            totalAmount: true,
            buyerId: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Only pending refunds can be approved');
    }

    // Best-effort provider refund (network I/O) — done before the transaction so
    // we never hold a DB transaction open across an external call. Case approval
    // is never blocked on it.
    let providerRefundId: string | undefined;
    try {
      const provider = this.providerFactory.get(refund.payment.provider);
      const providerResponse = (refund.payment.providerResponse as any) || {};
      const result = await provider.refundPayment({
        providerPaymentId:
          refund.payment.providerPaymentId || providerResponse.reference || '',
        amount: refund.order.totalAmount.toNumber(),
        reason: refund.reason,
      });
      providerRefundId = result.providerRefundId;
    } catch (err) {
      this.logger.error(`Provider refund failed (continuing case approval): ${(err as Error).message}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Idempotent claim — a concurrent approval can't double-process.
      const claim = await tx.refund.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
          providerRefundId,
        },
      });
      if (claim.count === 0) {
        throw new BadRequestException('Refund is no longer pending');
      }

      await tx.payment.update({
        where: { id: refund.paymentId },
        data: { status: 'REFUNDED' },
      });
      await tx.order.update({
        where: { id: refund.orderId },
        data: { status: 'REFUNDED' },
      });

      // Reverse every money record for this order: affiliate conversions (fully),
      // the platform Commission rows, and the exact creator net that was
      // credited at fulfillment. The ledger drives the clawback so a creator
      // never keeps money for a refunded sale.
      const refundRatio = new Prisma.Decimal(1);
      const { creatorNets } = await this.commissionService.reverseOrderCommissions(
        tx,
        refund.orderId,
        'Refund approved',
        refundRatio,
      );
      await clawBackCreatorCredits(tx, refund.orderId, creatorNets, refund.id);

      return tx.refund.findUniqueOrThrow({ where: { id } });
    });

    void this.notificationsService.create(
      refund.order.buyerId,
      'REFUND_REQUEST',
      'Refund approved',
      `Your refund of ${refund.order.totalAmount.toNumber()} NGN for order ${refund.orderId.slice(0, 8).toUpperCase()} has been approved.`,
      { orderId: refund.orderId, refundId: refund.id },
    );

    return updated;
  }

  async reject(id: string, adminId: string) {
    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            buyerId: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Only pending refunds can be rejected');
    }

    const updated = await prisma.refund.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    void this.notificationsService.create(
      refund.order.buyerId,
      'REFUND_REQUEST',
      'Refund request rejected',
      `Your refund request for order ${refund.orderId.slice(0, 8).toUpperCase()} was not approved. Contact support if you have questions.`,
      { orderId: refund.orderId, refundId: refund.id },
    );

    return updated;
  }
}
