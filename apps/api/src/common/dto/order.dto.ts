import { IsArray, IsString, IsNumber, IsOptional, ValidateNested, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const ACQUISITION_SOURCES = [
  'CREATOR_DIRECT',
  'AFFILIATE',
  'MARKETPLACE_ORGANIC',
  'PLATFORM_CAMPAIGN',
  'UNKNOWN',
] as const;

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  quantity: number;

  @IsString()
  licenseType: string;
}

export class UtmDto {
  @IsOptional()
  @IsString()
  @Max(128)
  campaign?: string;

  @IsOptional()
  @IsString()
  @Max(128)
  source?: string;

  @IsOptional()
  @IsString()
  @Max(128)
  medium?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  @Max(40)
  affiliateCode?: string;

  @IsOptional()
  @IsString()
  @Max(64)
  visitorId?: string;

  @IsOptional()
  @IsString()
  @Max(128)
  sessionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UtmDto)
  utm?: UtmDto;

  /** Caller-declared acquisition source (analytics only; never affects money). */
  @IsOptional()
  @IsIn(ACQUISITION_SOURCES as unknown as string[])
  acquisitionSource?: string;
}
