import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query,
  UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth, CurrentUser, JwtUser } from '../common/decorators/auth.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { IMAGES, uploadOptions } from '../common/upload/upload.options';
import { BanDto, ProfileDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users & Profile')
@Controller()
export class UsersController {
  constructor(private service: UsersService) {}

  @Get('freelancers/:id')                      // مفتوح للجميع
  getFreelancer(@Param('id', ParseIntPipe) id: number) { return this.service.getFreelancer(id); }

  @Patch('profile') @Auth('FREELANCER')
  update(@CurrentUser() u: JwtUser, @Body() d: ProfileDto) { return this.service.updateProfile(u.id, d); }

  @Post('profile/avatar') @Auth('FREELANCER')
  @ApiConsumes('multipart/form-data') @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
    @UseInterceptors(FileInterceptor('file', uploadOptions('public', IMAGES, 10)))   // صورة فقط ≤ 2MB
  avatar(@CurrentUser() u: JwtUser, @UploadedFile() f?: Express.Multer.File) {
    if (!f) throw new BadRequestException('file is required');
    return this.service.setAvatar(u.id, `/files/${f.filename}`);
  }

  // ---- الأدمن ----
  @Get('admin/users') @Auth('ADMIN')
  list(@Query() q: PaginationDto) { return this.service.list(q); }

  @Patch('admin/users/:id/ban') @Auth('ADMIN')
  ban(@Param('id', ParseIntPipe) id: number, @Body() d: BanDto) { return this.service.setBan(id, d.banned); }
}
