import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPayoutAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  holdingPeriodDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10240)
  maxFileSize?: number;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;
}
