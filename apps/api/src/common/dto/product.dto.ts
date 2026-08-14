import { IsString, IsNumber, IsOptional, IsArray, Min, Max, Matches, IsEnum, MinLength, MaxLength, IsBoolean, IsIn, IsUrl, ValidateIf } from 'class-validator';

// Creator-selectable affiliate reward rates (MVP). Anything outside this set is
// rejected — the calculator trusts stored values at fulfillment time.
export const AFFILIATE_RATE_OPTIONS = [20, 25, 30, 35, 40, 50] as const;

export class CreateProductDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  @MinLength(50, { message: 'Description must be at least 50 characters' })
  description: string;

  @IsString()
  categoryId: string;

  @IsNumber()
  @Min(0.01, { message: 'Price must be at least $0.01' })
  @Max(99999.99, { message: 'Price must be at most $99,999.99' })
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['personal', 'commercial', 'extended', 'enterprise'], {
    message: 'License type must be one of: personal, commercial, extended, enterprise',
  })
  licenseType?: 'personal' | 'commercial' | 'extended' | 'enterprise';

  @IsOptional()
  @IsString()
  thumbnail?: string;

  /**
   * Optional external delivery link (hosted file, Drive/Dropbox, or a landing
   * page). Buyers access it after purchase; it is never shown publicly.
   * An empty string clears the link.
   */
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.deliveryUrl !== '')
  @IsUrl({ require_protocol: true }, { message: 'Delivery URL must be a valid URL' })
  deliveryUrl?: string;

  /** Opt the product into the affiliate program (submits it for review). */
  @IsOptional()
  @IsBoolean()
  affiliateEnabled?: boolean;

  /** Creator-chosen affiliate reward percent — one of 20, 25, 30, 35, 40, 50. */
  @IsOptional()
  @IsIn(AFFILIATE_RATE_OPTIONS, { message: 'Affiliate rate must be one of 20, 25, 30, 35, 40, 50' })
  affiliateCommissionRate?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters' })
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(50, { message: 'Description must be at least 50 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Price must be at least $0.01' })
  @Max(99999.99, { message: 'Price must be at most $99,999.99' })
  price?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['personal', 'commercial', 'extended', 'enterprise'], {
    message: 'License type must be one of: personal, commercial, extended, enterprise',
  })
  licenseType?: 'personal' | 'commercial' | 'extended' | 'enterprise';

  @IsOptional()
  @IsString()
  thumbnail?: string;

  /** Optional external delivery link buyers access after purchase. Empty clears. */
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.deliveryUrl !== '')
  @IsUrl({ require_protocol: true }, { message: 'Delivery URL must be a valid URL' })
  deliveryUrl?: string;

  /** Opt the product into the affiliate program (submits it for review). */
  @IsOptional()
  @IsBoolean()
  affiliateEnabled?: boolean;

  /** Creator-chosen affiliate reward percent — one of 20, 25, 30, 35, 40, 50. */
  @IsOptional()
  @IsIn(AFFILIATE_RATE_OPTIONS, { message: 'Affiliate rate must be one of 20, 25, 30, 35, 40, 50' })
  affiliateCommissionRate?: number;
}
