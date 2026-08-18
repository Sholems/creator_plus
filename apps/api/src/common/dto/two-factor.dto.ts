import { IsString, Length } from 'class-validator';

export class EnableTwoFactorDto {
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be 6 digits' })
  code: string;
}

export class VerifyTwoFactorDto {
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be 6 digits' })
  code: string;
}

export class DisableTwoFactorDto {
  @IsString()
  password: string;
}
