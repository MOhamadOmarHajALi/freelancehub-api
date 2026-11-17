import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional() @IsInt() @Min(1) page: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(50) limit: number = 10;
}

export const pageMeta = (total: number, p: PaginationDto) => ({
  total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit),
});
