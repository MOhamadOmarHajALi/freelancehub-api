import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsNumber, IsString, Length, Max, Min } from 'class-validator';

export class ProposalDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) price: number;
  @IsInt() @Min(1) @Max(365) days: number;
  @IsString() @Length(5, 1000) message: string;
}
export class UpdateProposalDto extends PartialType(ProposalDto) {}
