import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';
import { validateFile, validateUploadMeta, getMaxFileSizeFromSettings } from '../common/file-validation';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Body('folder') folder: string = 'uploads'
  ) {
    validateFile(file, await getMaxFileSizeFromSettings());

    const result = await this.storageService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder
    );

    return result;
  }

  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  async getPresignedUrl(
    @Body() body: {
      filename: string;
      contentType: string;
      folder?: string;
      expiresIn?: number;
    }
  ) {
    validateUploadMeta(body.filename, body.contentType);

    const result = await this.storageService.getSignedUploadUrl(
      body.filename,
      body.contentType,
      body.folder,
      body.expiresIn
    );

    return result;
  }
}
