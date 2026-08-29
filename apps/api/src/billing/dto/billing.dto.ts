import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanTier } from '@creatorplus/database';

export class CreateSubscriptionCheckoutDto {
  @ApiProperty({ enum: PlanTier, description: 'Subscription tier' })
  @IsEnum(PlanTier)
  tier: PlanTier;

  @ApiPropertyOptional({ description: 'URL to redirect after successful payment' })
  @IsString()
  @IsOptional()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'URL to redirect after cancelled payment' })
  @IsString()
  @IsOptional()
  cancelUrl?: string;
}

export class PurchaseCreditPackDto {
  @ApiProperty({ description: 'Credit pack ID' })
  @IsString()
  packId: string;

  @ApiPropertyOptional({ description: 'URL to redirect after successful payment' })
  @IsString()
  @IsOptional()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'URL to redirect after cancelled payment' })
  @IsString()
  @IsOptional()
  cancelUrl?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsString()
  @IsOptional()
  reason?: string;
}
