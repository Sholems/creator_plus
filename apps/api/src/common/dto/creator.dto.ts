import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, Matches, IsUrl, IsObject } from 'class-validator';

export class ApplyCreatorDto {
  @IsString()
  @MinLength(3, { message: 'Store name must be at least 3 characters' })
  @MaxLength(50, { message: 'Store name must be at most 50 characters' })
  storeName: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;
}

export class UpdateCreatorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Store name must be at least 3 characters' })
  @MaxLength(50, { message: 'Store name must be at most 50 characters' })
  storeName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio must be at most 500 characters' })
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;
}

export class CreateBankAccountDto {
  @IsString()
  @MinLength(2, { message: 'Bank name must be at least 2 characters' })
  @MaxLength(60, { message: 'Bank name must be at most 60 characters' })
  bankName: string;

  @IsString()
  @Matches(/^\d{10}$/, { message: 'Account number must be 10 digits' })
  accountNumber: string;

  @IsString()
  @MinLength(3, { message: 'Account name must be at least 3 characters' })
  @MaxLength(100, { message: 'Account name must be at most 100 characters' })
  accountName: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class SubmitVerificationDto {
  @IsString()
  @MinLength(2, { message: 'Identity type is required' })
  identityType: string;

  @IsString()
  @MinLength(4, { message: 'Identity number must be at least 4 characters' })
  identityNumber: string;

  @IsString()
  @MinLength(3, { message: 'Identity document is required' })
  identityDocument: string;
}
