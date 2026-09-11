import { IsOptional, IsString, IsUUID } from 'class-validator';

export class StartMembershipCheckoutDto {
  @IsUUID()
  priceId: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
