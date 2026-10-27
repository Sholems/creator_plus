import { IsIn } from 'class-validator';

export const QR_ACTION_TYPES = [
  'CONTINUE',
  'DIRECT_OPEN',
  'FILE_OPEN',
  'WHATSAPP',
  'CONTACT_SAVE',
  'COUPON_COPY',
  'VIDEO_PLAY',
  'AUDIO_PLAY',
  'EMAIL',
  'SMS',
  'CALL',
  'MAP_OPEN',
  'APP_OPEN',
  'WIFI_CONNECT',
  'LINK_OPEN',
] as const;

export type QrActionType = (typeof QR_ACTION_TYPES)[number];

export class RecordQrActionDto {
  @IsIn(QR_ACTION_TYPES)
  actionType: QrActionType;
}
