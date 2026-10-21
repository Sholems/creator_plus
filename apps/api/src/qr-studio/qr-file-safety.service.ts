import { Injectable } from '@nestjs/common';
import { QrAssetSafetyStatus } from '@creatorplus/database';

interface FileSafetyInput {
  mimetype: string;
  buffer: Buffer;
}

const PDF_ACTIVE_CONTENT = /\/(?:JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile|RichMedia)\b/i;

@Injectable()
export class QrFileSafetyService {
  initialStatus(file?: FileSafetyInput): QrAssetSafetyStatus {
    if (process.env.QR_STUDIO_AUTO_APPROVE_UPLOADS === 'true') return 'APPROVED';
    if (file && this.isPassivePdf(file)) return 'APPROVED';
    if (process.env.NODE_ENV !== 'production') return 'APPROVED';
    return 'PENDING_SCAN';
  }

  private isPassivePdf(file: FileSafetyInput): boolean {
    const contentType = file.mimetype.toLowerCase().split(';')[0].trim();
    if (contentType !== 'application/pdf') return false;

    const header = file.buffer.subarray(0, 8).toString('latin1');
    const trailer = file.buffer.subarray(Math.max(0, file.buffer.length - 1024)).toString('latin1');
    if (!header.startsWith('%PDF-') || !trailer.includes('%%EOF')) return false;

    return !PDF_ACTIVE_CONTENT.test(file.buffer.toString('latin1'));
  }
}
