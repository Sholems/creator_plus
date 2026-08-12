import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @ApiPropertyOptional({
    description: 'Payment provider to use for this order',
    example: 'paystack',
    enum: ['paystack', 'flutterwave', 'stripe'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['paystack', 'flutterwave', 'stripe'])
  provider?: string;
}
