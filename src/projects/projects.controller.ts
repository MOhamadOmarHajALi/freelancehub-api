import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth, CurrentUser, JwtUser } from '../common/decorators/auth.decorator';
import { IMAGE_OR_PDF, uploadOptions } from '../common/upload/upload.options';
import { ListProjectsDto, ProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Get() @Auth() list(@Query() q: ListProjectsDto) { return this.service.list(q); }
  @Get('mine') @Auth('OWNER') mine(@CurrentUser() u: JwtUser) { return this.service.mine(u.id); }
  @Get(':id') @Auth() one(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() @Auth('OWNER')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['title', 'description', 'categoryId', 'budget'], properties: {
    title: { type: 'string' }, description: { type: 'string' }, categoryId: { type: 'integer' },
    budget: { type: 'number' }, file: { type: 'string', format: 'binary', description: 'اختياري: صورة أو PDF ≤ 5MB' } } } })
  @UseInterceptors(FileInterceptor('file', uploadOptions('public', IMAGE_OR_PDF, 5)))   // صورة أو PDF ≤ 5MB
  create(@CurrentUser() u: JwtUser, @Body() d: ProjectDto, @UploadedFile() f?: Express.Multer.File) {
    return this.service.create(u.id, d, f ? `/files/${f.filename}` : null);
  }

  @Patch(':id') @Auth('OWNER')
  update(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number, @Body() d: UpdateProjectDto) {
    return this.service.update(u.id, id, d);
  }

  @Delete(':id') @Auth('OWNER')
  remove(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number) { return this.service.remove(u.id, id); }
}
