import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Auth, CurrentUser, JwtUser } from '../common/decorators/auth.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

const meta = (req: any) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}

  @Post('register')
  register(@Body() d: RegisterDto, @Req() req: any) { return this.service.register(d, meta(req)); }

  @Post('login') @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() d: LoginDto, @Req() req: any) { return this.service.login(d, meta(req)); }

  @Post('refresh') @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  refresh(@Body() d: RefreshDto) { return this.service.refresh(d.refreshToken); }

  @Post('logout') @Auth() @HttpCode(200)
  logout(@CurrentUser() u: JwtUser) { return this.service.logout(u.sid); }

  @Post('logout-all') @Auth() @HttpCode(200)
  logoutAll(@CurrentUser() u: JwtUser) { return this.service.logoutAll(u.id); }

  @Get('sessions') @Auth()
  sessions(@CurrentUser() u: JwtUser) { return this.service.sessions(u.id, u.sid); }

  @Delete('sessions/:id') @Auth()
  revoke(@CurrentUser() u: JwtUser, @Param('id') id: string) { return this.service.revokeOne(u.id, id); }
}