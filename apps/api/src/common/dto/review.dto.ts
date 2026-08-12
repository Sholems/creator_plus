import { IsString, IsNumber, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title?: string;

  @IsString()
  @MinLength(10, { message: 'Comment must be at least 10 characters' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters' })
  comment: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Comment must be at least 10 characters' })
  @MaxLength(2000, { message: 'Comment must be at most 2000 characters' })
  comment?: string;
}

export class ReportReviewDto {
  @IsString()
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  @MaxLength(500, { message: 'Reason must be at most 500 characters' })
  reason: string;
}
