import { IsString, IsNumber, IsInt, IsOptional, IsArray, ArrayMaxSize, Min, Max, Matches, IsEnum, MinLength, MaxLength, IsBoolean, IsIn, IsUrl, ValidateIf } from 'class-validator';

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
  @MaxLength(50000, { message: 'Description must be at most 50,000 characters' })
  description: string;

  @IsString()
  categoryId: string;

  @IsNumber()
  @Min(0.01, { message: 'Price must be at least ₦0.01' })
  @Max(99999.99, { message: 'Price must be at most ₦99,999.99' })
  price: number;

  /** Original price shown as strikethrough when set higher than `price`. */
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Sale price must be at least ₦0' })
  compareAtPrice?: number;

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

  @IsOptional()
  @IsString()
  coverImage?: string;

  // Gallery images shown on the product page. Capped so the page stays fast.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8, { message: 'You can add up to 8 gallery images' })
  @IsString({ each: true })
  previewImages?: string[];

  // Licensing (activation keys). Optional; defaults keep it off.
  @IsOptional()
  @IsBoolean()
  licenseKeysEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  licenseMaxActivations?: number;

  // Null / omitted = lifetime license; a positive number = validity in days.
  @IsOptional()
  @IsInt()
  @Min(1)
  licenseValidityDays?: number | null;

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
  @MaxLength(50000, { message: 'Description must be at most 50,000 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Price must be at least ₦0.01' })
  @Max(99999.99, { message: 'Price must be at most ₦99,999.99' })
  price?: number;

  /** Original price shown as strikethrough when set higher than `price`. */
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Sale price must be at least ₦0' })
  compareAtPrice?: number;

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

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8, { message: 'You can add up to 8 gallery images' })
  @IsString({ each: true })
  previewImages?: string[];

  // Licensing (activation keys). Optional; omitted fields are left unchanged.
  @IsOptional()
  @IsBoolean()
  licenseKeysEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  licenseMaxActivations?: number;

  // Null = lifetime license; a positive number = validity in days.
  @IsOptional()
  @IsInt()
  @Min(1)
  licenseValidityDays?: number | null;

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
