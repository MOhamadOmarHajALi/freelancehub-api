import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Auth, CurrentUser, JwtUser } from '../common/decorators/auth.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TopupDto } from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private service: WalletService) {}

  @Get() @Auth() get(@CurrentUser() u: JwtUser) { return this.service.get(u.id); }
  @Post('topup') @Auth('OWNER') topup(@CurrentUser() u: JwtUser, @Body() d: TopupDto) { return this.service.topup(u.id, d.amount); }
  @Get('transactions') @Auth() transactions(@CurrentUser() u: JwtUser, @Query() q: PaginationDto) { return this.service.transactions(u.id, q); }
}
