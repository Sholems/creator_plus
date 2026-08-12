import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsIn,
  Matches,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCouponDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{3,32}$/, {
    message: 'Coupon code must be 3-32 characters using letters, numbers, _ or -',
  })
  code: string;

  @IsString()
  @IsIn(['PERCENTAGE', 'FIXED'])
  type: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CouponLineItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouponLineItemDto)
  items: CouponLineItemDto[];
}
