import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class UpdatePaystackDto {
  // Optional so an admin can toggle `enabled` or change the public key without
  // re-entering the secret. An empty/omitted value leaves the stored secret intact.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  secretKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  publicKey?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
