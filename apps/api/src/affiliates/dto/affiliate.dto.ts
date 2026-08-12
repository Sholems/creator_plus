import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ArrayMaxSize,
} from 'class-validator';

export class ApplyAffiliateDto {
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Application message must be at most 300 characters' })
  applicationMessage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20, { message: 'No more than 20 promotion channels' })
  promotionChannels?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Website URL must be at most 200 characters' })
  websiteUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20, { message: 'No more than 20 social media links' })
  socialMediaLinks?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country must be at most 100 characters' })
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Payment method must be at most 50 characters' })
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Payment details must be at most 200 characters' })
  paymentDetails?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{3,30}$/, {
    message: 'Code must be 3-30 characters (lowercase letters, numbers, hyphens)',
  })
  code?: string;
}

export class UpdateAffiliateDto {
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Application message must be at most 300 characters' })
  applicationMessage?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20, { message: 'No more than 20 promotion channels' })
  promotionChannels?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Website URL must be at most 200 characters' })
  websiteUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20, { message: 'No more than 20 social media links' })
  socialMediaLinks?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country must be at most 100 characters' })
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Payment method must be at most 50 characters' })
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Payment details must be at most 200 characters' })
  paymentDetails?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{3,30}$/, {
    message: 'Code must be 3-30 characters (lowercase letters, numbers, hyphens)',
  })
  code?: string;
}

export class CreateAffiliateLinkDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9-]{3,40}$/, {
    message: 'Link code must be 3-40 characters (letters, numbers, hyphens)',
  })
  code?: string;
}

export class UpdateAffiliateLinkDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9-]{3,40}$/, {
    message: 'Link code must be 3-40 characters (letters, numbers, hyphens)',
  })
  code?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

export class TrackClickDto {
  @IsOptional()
  @IsString()
  visitorId?: string;

  @IsOptional()
  @IsString()
  referer?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class RequestAffiliatePayoutDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, any>;
}

export class CreatePromotionalAssetDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class AdminAffiliateRejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class AdminAffiliateSuspendDto {
  @IsString()
  @MinLength(3, { message: 'Suspension reason is required' })
  @MaxLength(300)
  reason: string;
}

export class AdminProductAffiliateRejectDto {
  @IsString()
  @MinLength(3, { message: 'Rejection reason is required' })
  @MaxLength(300)
  reason: string;
}

export class UpdateCommissionSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  affiliateRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  holdingDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  cookieDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPayout?: number;
}
