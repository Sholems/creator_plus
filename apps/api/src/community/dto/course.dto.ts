import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

const CONTENT_TYPES = ['VIDEO', 'TEXT', 'FILE'] as const;

export class CreateCourseDto {
  @IsString() @MaxLength(160)
  title: string;

  @IsOptional() @IsString() @MaxLength(80)
  slug?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsString()
  coverImage?: string;

  @IsOptional() @IsBoolean()
  published?: boolean;
}

export class UpdateCourseDto {
  @IsOptional() @IsString() @MaxLength(160)
  title?: string;

  @IsOptional() @IsString() @MaxLength(80)
  slug?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsString()
  coverImage?: string;

  @IsOptional() @IsBoolean()
  published?: boolean;

  @IsOptional() @IsInt()
  sortOrder?: number;
}

export class CreateModuleDto {
  @IsString() @MaxLength(160)
  title: string;
}

export class UpdateModuleDto {
  @IsOptional() @IsString() @MaxLength(160)
  title?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;
}

export class CreateLessonDto {
  @IsString() @MaxLength(200)
  title: string;

  @IsOptional() @IsIn(CONTENT_TYPES)
  contentType?: (typeof CONTENT_TYPES)[number];

  @IsOptional() @IsString()
  videoUrl?: string;

  @IsOptional() @IsString()
  body?: string;

  @IsOptional() @IsString()
  fileUrl?: string;

  @IsOptional() @IsInt() @Min(0)
  durationMinutes?: number;

  @IsOptional() @IsBoolean()
  isPreview?: boolean;

  @IsOptional() @IsInt() @Min(0)
  dripDelayDays?: number;

  @IsOptional() @IsInt()
  sortOrder?: number;
}

export class UpdateLessonDto {
  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @IsOptional() @IsIn(CONTENT_TYPES)
  contentType?: (typeof CONTENT_TYPES)[number];

  @IsOptional() @IsString()
  videoUrl?: string;

  @IsOptional() @IsString()
  body?: string;

  @IsOptional() @IsString()
  fileUrl?: string;

  @IsOptional() @IsInt() @Min(0)
  durationMinutes?: number;

  @IsOptional() @IsBoolean()
  isPreview?: boolean;

  @IsOptional() @IsInt() @Min(0)
  dripDelayDays?: number;

  @IsOptional() @IsInt()
  sortOrder?: number;
}
