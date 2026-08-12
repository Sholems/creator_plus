import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';
import { StorageService } from '../storage/storage.service';
import { paginate, pageMeta } from '../common/pagination';

@Injectable()
export class DownloadsService {
  constructor(private storageService: StorageService) {}

  async getUserDownloads(userId: string, pageArg = 1, perPageArg = 20) {
    const { page, perPage, skip, take } = paginate(pageArg, perPageArg);

    const [downloads, total] = await Promise.all([
      prisma.download.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              creator: {
                select: {
                  id: true,
                  storeName: true,
                },
              },
            },
          },
          orderItem: {
            select: {
              id: true,
              licenseType: true,
              totalPrice: true,
              order: {
                select: {
                  id: true,
                  createdAt: true,
                  invoiceNumber: true,
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.download.count({ where: { userId } }),
    ]);

    return {
      data: downloads,
      pagination: pageMeta(page, perPage, total),
    };
  }

  /**
   * Resolve a download by its token and verify the caller owns it. A download
   * token is a capability, but it is NOT a bearer credential — every route is
   * authenticated and the grant must belong to the requesting user. Expiry is
   * checked here; the per-download limit is enforced atomically at issue time.
   */
  async getDownloadByToken(token: string, userId: string) {
    const download = await prisma.download.findUnique({
      where: { token },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!download) {
      throw new NotFoundException('Download not found');
    }

    if (download.userId !== userId) {
      throw new ForbiddenException('Not authorized for this download');
    }

    if (new Date() > download.expiresAt) {
      throw new BadRequestException('Download link has expired');
    }

    return download;
  }

  /**
   * Verify ownership, atomically consume one download slot, log the access, and
   * return signed URLs. The single metered path for issuing download URLs —
   * both the GET and POST routes go through here, so the `maxDownloads` cap
   * cannot be bypassed by picking a different route, and the atomic consume
   * closes the check-then-increment race (a leaked token can't exceed the cap).
   */
  async issueSignedUrls(
    token: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const download = await this.getDownloadByToken(token, userId);

    const files = await prisma.productFile.findMany({
      where: { productId: download.productId },
    });

    if (files.length === 0) {
      // Nothing to hand out — don't burn a download slot.
      return {
        downloadUrl: `/api/v1/downloads/file/${token}`,
        files: [],
        message: 'No files available for download',
      };
    }

    // Atomically consume one slot; the column-to-column guard fails once the
    // cap is reached, so concurrent requests can never overshoot maxDownloads.
    const consumed = await prisma.download.updateMany({
      where: {
        id: download.id,
        downloadCount: { lt: prisma.download.fields.maxDownloads },
      },
      data: { downloadCount: { increment: 1 } },
    });
    if (consumed.count === 0) {
      throw new BadRequestException('Download limit reached');
    }

    await prisma.downloadLog.create({
      data: { downloadId: download.id, ipAddress, userAgent, success: true },
    });

    const signedFiles = await Promise.all(
      files.map(async (file) => ({
        fileName: file.fileName,
        fileSize: file.fileSize.toString(),
        mimeType: file.mimeType,
        downloadUrl: await this.storageService.getSignedDownloadUrl(file.fileKey, 3600),
      })),
    );

    return {
      downloadUrl: signedFiles[0]?.downloadUrl || `/api/v1/downloads/file/${token}`,
      files: signedFiles,
    };
  }

  async getDownloadsByOrderItemId(orderItemId: string) {
    return prisma.download.findMany({
      where: { orderItemId },
    });
  }
}
