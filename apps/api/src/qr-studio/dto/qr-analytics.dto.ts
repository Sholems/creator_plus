import { IsOptional, IsUUID, Matches } from 'class-validator';

export class QrAnalyticsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must use YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must use YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;
}
