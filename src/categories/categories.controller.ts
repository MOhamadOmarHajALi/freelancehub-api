import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Auth } from '../common/decorators/auth.decorator';
import { CategoriesService } from './categories.service';
import { CategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get() list() { return this.service.list(); }
  @Post() @Auth('ADMIN') create(@Body() d: CategoryDto) { return this.service.create(d); }
  @Patch(':id') @Auth('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() d: CategoryDto) { return this.service.update(id, d); }
  @Delete(':id') @Auth('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
