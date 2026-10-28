import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { QrCampaignStatus, QrContentType, QrScanMode } from '@creatorplus/database';

export class CreateQrCampaignDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  folder?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  tags?: string[];

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
  @MaxLength(80)
  folder?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(QrContentType)
  contentType?: QrContentType;

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

export class BulkQrCampaignActionDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsIn(['PAUSE', 'ARCHIVE'])
  action!: 'PAUSE' | 'ARCHIVE';
}

export class CreateQrPlacementVariantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmTerm?: string;
}

export class UpdateQrPlacementVariantDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmTerm?: string;
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
