import { BadRequestException } from '@nestjs/common';
import { prisma } from '@creatormarket/database';

export interface UploadableFile {
  originalname: string;
  mimetype: string;
  size: number;
}

export function getMaxFileSize(): number {
  return Number(process.env.MAX_FILE_SIZE || 104857600);
}

/** Override limit (bytes) from platform settings when provided. */
export async function getMaxFileSizeFromSettings(): Promise<number> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: 'platform.max_file_size_bytes' },
    });
    if (row && Number(row.value) > 0) return Number(row.value);
  } catch {
    // Fall through to env default if the setting is unavailable.
  }
  return getMaxFileSize();
}

export function getAllowedExtensions(): string[] {
  return (process.env.ALLOWED_FILE_TYPES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// HTML content served inline from the (public) storage domain lets any
// authenticated user host XSS/phishing pages under the brand's storage URL.
// Always rejected, regardless of the (optional) extension allowlist. SVG/XML
// are intentionally NOT blocked here — they are legitimate seller assets; the
// safe way to neutralize them is attachment/CSP at serve time, not an upload
// ban that breaks logos and templates.
const DANGEROUS_CONTENT_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
]);

export function assertSafeContentType(contentType?: string) {
  const ct = (contentType || '').toLowerCase().split(';')[0].trim();
  if (DANGEROUS_CONTENT_TYPES.has(ct) || ct.includes('html')) {
    throw new BadRequestException(`Content type "${ct || '(unknown)'}" is not allowed`);
  }
}

function assertAllowedExtension(filename: string) {
  const allowed = getAllowedExtensions();
  if (allowed.length > 0) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      throw new BadRequestException(
        `File type ".${ext || '(unknown)'}" is not allowed`,
      );
    }
  }
}

export function validateFile(file: UploadableFile, maxSizeOverride?: number) {
  if (!file) {
    throw new BadRequestException('No file provided');
  }

  const maxSize = maxSizeOverride ?? getMaxFileSize();
  if (file.size > maxSize) {
    throw new BadRequestException(
      `File exceeds the maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
    );
  }

  assertSafeContentType(file.mimetype);
  assertAllowedExtension(file.originalname);

  return true;
}

/**
 * Validate the metadata for a presigned (direct-to-bucket) upload, where the
 * server never sees the bytes. Applies the same content-type denylist and
 * extension allowlist as validateFile so the presigned path can't be used to
 * smuggle active content past the checks the buffered upload enforces.
 */
export function validateUploadMeta(filename: string, contentType?: string) {
  if (!filename) {
    throw new BadRequestException('A filename is required');
  }
  assertSafeContentType(contentType);
  assertAllowedExtension(filename);
  return true;
}
