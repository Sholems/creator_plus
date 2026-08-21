import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class ActivateLicenseDto {
  @IsString()
  key: string;

  @IsString()
  deviceId: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class LicenseDeviceDto {
  @IsString()
  key: string;

  @IsString()
  deviceId: string;
}

export class UpdateLicenseDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxActivations?: number;

  // ISO date string, or null/empty to clear (make it a lifetime license).
  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'REVOKED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
}
