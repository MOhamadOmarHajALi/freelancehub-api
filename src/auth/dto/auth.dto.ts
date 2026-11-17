import { IsEmail, IsIn, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @Length(2, 60) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
  @IsIn(['OWNER', 'FREELANCER']) role: 'OWNER' | 'FREELANCER';
}
export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
export class RefreshDto {
  @IsString() @Length(20, 200) refreshToken: string;
}