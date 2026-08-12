import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}

export class UpdateContactStatusDto {
  @IsIn(['NEW', 'READ', 'ARCHIVED'])
  status: 'NEW' | 'READ' | 'ARCHIVED';
}
