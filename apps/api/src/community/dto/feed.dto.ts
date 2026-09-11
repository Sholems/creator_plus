import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString() @MaxLength(200)
  title: string;

  @IsString() @MaxLength(10000)
  body: string;

  @IsOptional() @IsUUID()
  categoryId?: string;
}

export class UpdatePostDto {
  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  body?: string;

  @IsOptional() @IsUUID()
  categoryId?: string;
}

export class CreateCommentDto {
  @IsString() @MaxLength(5000)
  body: string;
}

export class CategoryDto {
  @IsString() @MaxLength(80)
  name: string;

  @IsOptional() @IsString() @MaxLength(60)
  slug?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}
