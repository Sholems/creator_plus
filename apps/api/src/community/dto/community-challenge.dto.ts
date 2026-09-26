import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommunityChallengeDto {
  @IsString() @MaxLength(180) title: string;
  @IsOptional() @IsString() @MaxLength(100) slug?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @IsOptional() @IsIn(['MARKDOWN', 'RICH_HTML']) descriptionFormat?: 'MARKDOWN' | 'RICH_HTML';
  @IsOptional() @IsIn(['FREE', 'PREMIUM']) accessLevel?: 'FREE' | 'PREMIUM';
  @IsOptional() @IsString() coverImage?: string;
  @IsDateString() startsAt: string;
  @IsDateString() endsAt: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateCommunityChallengeDto {
  @IsOptional() @IsString() @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(100) slug?: string;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @IsOptional() @IsIn(['MARKDOWN', 'RICH_HTML']) descriptionFormat?: 'MARKDOWN' | 'RICH_HTML';
  @IsOptional() @IsIn(['FREE', 'PREMIUM']) accessLevel?: 'FREE' | 'PREMIUM';
  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class CreateChallengeMilestoneDto {
  @IsString() @MaxLength(180) title: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsDateString() dueAt?: string;
}

export class ChallengeCheckInDto {
  @IsOptional() @IsUUID() milestoneId?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsInt() @Min(0) @Max(100) progress: number;
}
