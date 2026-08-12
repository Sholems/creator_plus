import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];
}

export class SetUserRolesDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roles: string[];
}
