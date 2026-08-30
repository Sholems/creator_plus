import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { QrOfferCode } from '@creatorplus/database';

export class CreateQrCheckoutDto {
  @IsEnum(QrOfferCode)
  offerCode!: QrOfferCode;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  couponCode?: string;
}
