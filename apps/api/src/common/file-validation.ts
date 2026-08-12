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

  const allowed = getAllowedExtensions();
  if (allowed.length > 0) {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      throw new BadRequestException(
        `File type ".${ext || '(unknown)'}" is not allowed`,
      );
    }
  }

  return true;
}
