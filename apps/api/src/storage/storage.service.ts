import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint:
        process.env.R2_ENDPOINT ||
        (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : ''),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'creatorplus';
  }

  /**
   * Guard against unconfigured/placeholder storage. Without this, a missing or
   * example R2 config makes every upload throw a low-level TLS/credential error
   * that surfaces to the client as an opaque 500. Fail early with a clear,
   * actionable message instead.
   */
  private assertConfigured() {
    const accountId = process.env.R2_ENDPOINT ? 'endpoint' : process.env.R2_ACCOUNT_ID || '';
    const accessKey = process.env.R2_ACCESS_KEY_ID || '';
    const secretKey = process.env.R2_SECRET_ACCESS_KEY || '';
    // Reject the .env.example placeholders ("your-cloudflare-account-id", etc.).
    const looksPlaceholder =
      accountId.startsWith('your-') || accessKey.startsWith('your-') || secretKey.startsWith('your-');

    if (!accountId || !accessKey || !secretKey || looksPlaceholder) {
      this.logger.error(
        'File storage (R2) is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
          'R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_URL in apps/api/.env.',
      );
      throw new ServiceUnavailableException('File storage is not configured');
    }
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<{ key: string; url: string }> {
    this.assertConfigured();
    const ext = filename.split('.').pop();
    const key = `${folder}/${uuidv4()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file,
          ContentType: contentType,
        })
      );
    } catch (err) {
      // Log the real cause server-side; return a clear, non-500 error to the client.
      this.logger.error(
        `R2 upload failed for "${key}" (bucket "${this.bucket}"): ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Upload failed — file storage is currently unavailable',
      );
    }

    const url = `${process.env.R2_PUBLIC_URL}/${key}`;

    return { key, url };
  }

  async deleteFile(key: string): Promise<void> {
    this.assertConfigured();
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (err) {
      this.logger.error(`R2 delete failed for "${key}": ${(err as Error).message}`);
      throw new ServiceUnavailableException('File storage is currently unavailable');
    }
  }

  async getSignedUploadUrl(
    filename: string,
    contentType: string,
    folder: string = 'uploads',
    expiresIn: number = 3600
  ): Promise<{ uploadUrl: string; key: string; url: string }> {
    this.assertConfigured();
    const ext = filename.split('.').pop();
    const key = `${folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    try {
      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
      const url = `${process.env.R2_PUBLIC_URL}/${key}`;
      return { uploadUrl, key, url };
    } catch (err) {
      this.logger.error(`R2 presign (upload) failed for "${key}": ${(err as Error).message}`);
      throw new ServiceUnavailableException('File storage is currently unavailable');
    }
  }

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    this.assertConfigured();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (err) {
      this.logger.error(`R2 presign (download) failed for "${key}": ${(err as Error).message}`);
      throw new ServiceUnavailableException('File storage is currently unavailable');
    }
  }
}
