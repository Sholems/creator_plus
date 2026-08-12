import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateFeatureFlagDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_.-]+$/i)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  environment?: string;
}

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_.-]+$/i)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  environment?: string;
}
