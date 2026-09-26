import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  attachments?: any[];

  @IsOptional()
  @IsIn(['MARKDOWN', 'RICH_HTML'])
  contentFormat?: 'MARKDOWN' | 'RICH_HTML';

  @IsOptional()
  @IsIn(['DISCUSSION', 'QUESTION'])
  postType?: 'DISCUSSION' | 'QUESTION';

  @IsOptional()
  @IsIn(['FREE', 'PREMIUM'])
  accessLevel?: 'FREE' | 'PREMIUM';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contextType?: string;

  @IsOptional()
  @IsUUID()
  contextId?: string;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  attachments?: any[];

  @IsOptional()
  @IsIn(['MARKDOWN', 'RICH_HTML'])
  contentFormat?: 'MARKDOWN' | 'RICH_HTML';
}

export class CreateCommentDto {
  @IsString()
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsIn(['MARKDOWN', 'RICH_HTML'])
  contentFormat?: 'MARKDOWN' | 'RICH_HTML';

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class CreateCommunityReportDto {
  @IsIn(['POST', 'COMMENT', 'PROFILE']) targetType: 'POST' | 'COMMENT' | 'PROFILE';
  @IsUUID() targetId: string;
  @IsString() @MaxLength(80) reason: string;
  @IsOptional() @IsString() @MaxLength(1000) details?: string;
}

export class CategoryDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
