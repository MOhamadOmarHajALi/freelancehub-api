import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ProfileDto {
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) hourlyRate?: number;
}
export class BanDto { @IsBoolean() banned: boolean; }
