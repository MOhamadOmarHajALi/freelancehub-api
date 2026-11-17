import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Auth, CurrentUser, JwtUser } from '../common/decorators/auth.decorator';
import { ProposalDto, UpdateProposalDto } from './dto/proposal.dto';
import { ProposalsService } from './proposals.service';

@ApiTags('Proposals')
@Controller()
export class ProposalsController {
  constructor(private service: ProposalsService) {}

  @Post('projects/:id/proposals') @Auth('FREELANCER')
  create(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number, @Body() d: ProposalDto) {
    return this.service.create(u.id, id, d);
  }
  @Get('projects/:id/proposals') @Auth('OWNER')
  forProject(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number) { return this.service.forProject(u.id, id); }

  @Get('proposals/mine') @Auth('FREELANCER')
  mine(@CurrentUser() u: JwtUser) { return this.service.mine(u.id); }

  @Patch('proposals/:id') @Auth('FREELANCER')
  update(@CurrentUser() u: JwtUser, @Param('id', ParseIntPipe) id: number, @Body() d: UpdateProposalDto) {
    return this.service.update(u.id, id, d);
  }
}
