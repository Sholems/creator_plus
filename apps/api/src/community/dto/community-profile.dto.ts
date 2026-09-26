import { IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateCommunityProfileDto {
  @IsOptional() @IsString() @MaxLength(120) headline?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) expertise?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) goals?: string[];
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) links?: string[];
  @IsOptional() @IsIn(['PUBLIC', 'MEMBERS_ONLY', 'HIDDEN']) visibility?:
    'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';
}

export class UpdateCommunityPreferencesDto {
  @IsOptional() @IsBoolean() inAppEnabled?: boolean;
  @IsOptional() @IsBoolean() replyEnabled?: boolean;
  @IsOptional() @IsBoolean() mentionEnabled?: boolean;
  @IsOptional() @IsBoolean() reminderEmail?: boolean;
  @IsOptional() @IsBoolean() digestEmail?: boolean;
}
