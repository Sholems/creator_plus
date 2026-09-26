import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommunityEventDto {
  @IsString() @MaxLength(180) title: string;
  @IsOptional() @IsString() @MaxLength(100) slug?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @IsOptional() @IsIn(['MARKDOWN', 'RICH_HTML']) descriptionFormat?: 'MARKDOWN' | 'RICH_HTML';
  @IsOptional() @IsIn(['LIVE_SESSION', 'OFFICE_HOURS', 'WORKSHOP']) type?:
    'LIVE_SESSION' | 'OFFICE_HOURS' | 'WORKSHOP';
  @IsOptional() @IsIn(['FREE', 'PREMIUM']) accessLevel?: 'FREE' | 'PREMIUM';
  @IsOptional() @IsString() @MaxLength(120) hostName?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) coverImage?: string;
  @IsDateString() startsAt: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() @MaxLength(80) timezone?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) meetingUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) replayUrl?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateCommunityEventDto {
  @IsOptional() @IsString() @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(100) slug?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @IsOptional() @IsIn(['MARKDOWN', 'RICH_HTML']) descriptionFormat?: 'MARKDOWN' | 'RICH_HTML';
  @IsOptional() @IsIn(['LIVE_SESSION', 'OFFICE_HOURS', 'WORKSHOP']) type?:
    'LIVE_SESSION' | 'OFFICE_HOURS' | 'WORKSHOP';
  @IsOptional() @IsIn(['FREE', 'PREMIUM']) accessLevel?: 'FREE' | 'PREMIUM';
  @IsOptional() @IsString() @MaxLength(120) hostName?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) coverImage?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() @MaxLength(80) timezone?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) meetingUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) replayUrl?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}
