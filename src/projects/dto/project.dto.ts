import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ProjectDto {
  @IsString() @Length(3, 120) title: string;
  @IsString() @Length(10, 5000) description: string;
  @IsInt() categoryId: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) budget: number;
}
export class UpdateProjectDto extends PartialType(ProjectDto) {}

export class ListProjectsDto extends PaginationDto {
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['newest', 'budget_asc', 'budget_desc']) sort: string = 'newest';
}
