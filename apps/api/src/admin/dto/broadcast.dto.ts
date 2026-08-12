import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class BroadcastDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsIn(['all', 'role', 'users'])
  audience: 'all' | 'role' | 'users';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
