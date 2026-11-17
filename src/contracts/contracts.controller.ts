import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { BadRequestException, Controller, Get, Param, ParseIntPipe, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Auth, CurrentUser, JwtUser } from '../common/decorators/auth.decorator';
import { PDF_OR_ZIP, uploadOptions } from '../common/upload/upload.options';
import { ContractsService } from './contracts.service';

@ApiTags('Contracts (accept / deliver / approve)')
@Controller()
export class ContractsController {
  constructor(private service: ContractsService) {}

  @Post('proposals/:id/accept') @Auth('OWNER')
  accept(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number) { return this.service.accept(u.id, id); }

  @Post('projects/:id/delivery') @Auth('FREELANCER')
  @ApiConsumes('multipart/form-data') @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
    @UseInterceptors(FileInterceptor('file', uploadOptions('private', PDF_OR_ZIP, 20)))   // PDF أو ZIP
  deliver(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number, @UploadedFile() f?: Express.Multer.File) {
    if (!f) throw new BadRequestException('file is required');
    return this.service.deliver(u.id, id, f);
  }

  @Get('projects/:id/delivery') @Auth()
  async download(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    return res.download(await this.service.deliveryPath(u.id, id));
  }

  @Post('projects/:id/approve') @Auth('OWNER')
  approve(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number) { return this.service.approve(u.id, id); }
}
