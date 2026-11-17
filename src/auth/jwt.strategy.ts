import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/auth.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private db: PrismaService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET! });
  }
  // يُنفَّذ في كل طلب: لذلك يتوقف المحظور فوراً حتى لو كان توكنه صالحاً
  // في كل طلب: الجلسة موجودة وغير ملغاة وغير منتهية والمستخدم غير محظور
  async validate(p: { sub: number; sid: string }): Promise<JwtUser> {
    const s = await this.db.session.findUnique({ where: { id: p.sid }, include: { user: true } });
    if (!s || s.userId !== p.sub || s.revokedAt || s.expiresAt < new Date() || s.user.isBanned)
      throw new UnauthorizedException();
    return { id: s.user.id, role: s.user.role, sid: s.id };
  }
}
