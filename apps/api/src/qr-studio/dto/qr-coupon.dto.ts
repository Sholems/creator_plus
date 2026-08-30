import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { QrOfferCode } from '@creatorplus/database';

export class CreateQrCouponDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,32}$/, { message: 'Code must be 3-32 letters, numbers, _ or -' })
  code: string;

  @IsIn(['PERCENTAGE', 'FIXED'])
  type: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsArray()
  @IsIn(['SINGLE', 'PACK', 'PRO_MONTHLY', 'PRO_YEARLY'], { each: true })
  appliesToOffers?: QrOfferCode[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class UpdateQrCouponDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsArray()
  @IsIn(['SINGLE', 'PACK', 'PRO_MONTHLY', 'PRO_YEARLY'], { each: true })
  appliesToOffers?: QrOfferCode[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
