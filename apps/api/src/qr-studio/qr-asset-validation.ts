import { BadRequestException } from '@nestjs/common';
import { validateFile, UploadableFile } from '../common/file-validation';

const QR_FILE_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const QR_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function validateQrAsset(file: UploadableFile, kind: 'CAMPAIGN_FILE' | 'BRAND_LOGO' | 'GALLERY_IMAGE') {
  validateFile(file);
  const contentType = file.mimetype.toLowerCase().split(';')[0].trim();
  const allowed = kind === 'CAMPAIGN_FILE' ? QR_FILE_CONTENT_TYPES : QR_IMAGE_CONTENT_TYPES;
  if (!allowed.has(contentType)) {
    throw new BadRequestException(`Content type "${contentType}" is not allowed for this QR asset`);
  }
  if ((kind === 'BRAND_LOGO' || kind === 'GALLERY_IMAGE') && file.size > 10 * 1024 * 1024) {
    throw new BadRequestException('QR images must be 10MB or smaller');
  }
  return true;
}
