import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { QrCampaignStatus, QrContentType, QrScanMode } from '@creatorplus/database';

export class CreateQrCampaignDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(QrContentType)
  contentType!: QrContentType;

  @IsOptional()
  @IsString()
  destinationUrl?: string;

  @IsOptional()
  destinationData?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brandName?: string;

  @IsOptional()
  @IsString()
  brandPrimaryColor?: string;

  @IsOptional()
  @IsString()
  brandAccentColor?: string;

  @IsOptional()
  designSettings?: Record<string, any>;
}

export class UpdateQrCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  destinationUrl?: string | null;

  @IsOptional()
  destinationData?: Record<string, any> | null;

  @IsOptional()
  @IsEnum(QrScanMode)
  scanMode?: QrScanMode;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brandName?: string | null;

  @IsOptional()
  @IsString()
  brandPrimaryColor?: string | null;

  @IsOptional()
  @IsString()
  brandAccentColor?: string | null;

  @IsOptional()
  designSettings?: Record<string, any> | null;
}

export class ChangeQrCampaignStatusDto {
  @IsEnum(QrCampaignStatus)
  status!: Extract<QrCampaignStatus, 'ACTIVE' | 'PAUSED' | 'ARCHIVED'>;
}

export class QrAdminActionDto {
  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  archive?: boolean;
}

export class QrAssetSafetyDto {
  @IsIn(['APPROVED', 'BLOCKED'])
  status: 'APPROVED' | 'BLOCKED';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  reasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
