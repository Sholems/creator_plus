import { IsEnum } from 'class-validator';
import { QrOfferCode } from '@creatorplus/database';

export class CreateQrCheckoutDto {
  @IsEnum(QrOfferCode)
  offerCode!: QrOfferCode;
}
