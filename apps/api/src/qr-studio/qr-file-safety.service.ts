import { Injectable } from '@nestjs/common';
import { QrAssetSafetyStatus } from '@creatorplus/database';

@Injectable()
export class QrFileSafetyService {
  initialStatus(): QrAssetSafetyStatus {
    if (process.env.QR_STUDIO_AUTO_APPROVE_UPLOADS === 'true') return 'APPROVED';
    if (process.env.NODE_ENV !== 'production') return 'APPROVED';
    return 'PENDING_SCAN';
  }
}
