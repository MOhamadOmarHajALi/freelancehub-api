import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export interface ClientMeta { ip?: string; userAgent?: string; }

const REFRESH_DAYS = 30;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');   // نخزّن الـ hash لا التوكن نفسه
const newToken = () => randomBytes(48).toString('base64url');
const expiry = () => new Date(Date.now() + REFRESH_DAYS * 86_400_000);

@Injectable()
export class AuthService {
  constructor(private db: PrismaService, private jwt: JwtService) {}

  async register(d: RegisterDto, meta: ClientMeta) {
    try {
      const u = await this.db.user.create({
        data: {
          name: d.name, email: d.email.toLowerCase(), role: d.role,
          password: await bcrypt.hash(d.password, 12),
          wallet: { create: {} },
          ...(d.role === 'FREELANCER' ? { profile: { create: {} } } : {}),
        },
      });
      return this.issue(u, meta);
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Email already used');
      throw e;
    }
  }

  async login(d: LoginDto, meta: ClientMeta) {
    const u = await this.db.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (!u || !(await bcrypt.compare(d.password, u.password))) throw new UnauthorizedException('Invalid credentials');
    if (u.isBanned) throw new ForbiddenException('Account banned');
    return this.issue(u, meta);
  }

  /** جلسة جديدة (جهاز جديد) */
  private async issue(u: any, meta: ClientMeta) {
    const refreshToken = newToken();
    const s = await this.db.session.create({
      data: { userId: u.id, tokenHash: sha(refreshToken), ip: meta.ip, userAgent: meta.userAgent?.slice(0, 250), expiresAt: expiry() },
    });
    return this.tokens(u, s.id, refreshToken);
  }

  private tokens(u: any, sid: string, refreshToken: string) {
    return {
      accessToken: this.jwt.sign({ sub: u.id, sid }),
      refreshToken,
      expiresIn: 900,   // ثوانٍ (15 دقيقة)
      user: { id: u.id, name: u.name, email: u.email, role: u.role },
    };
  }

  /** تجديد: refresh token جديد في كل مرة، والقديم يموت */
  async refresh(refreshToken: string) {
    const hash = sha(refreshToken);
    const s = await this.db.session.findFirst({
      where: { OR: [{ tokenHash: hash }, { prevHash: hash }] }, include: { user: true },
    });
    if (!s || s.revokedAt || s.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');

    if (s.prevHash === hash) {   // توكن قديم أُعيد استخدامه = احتمال سرقة => نلغي الجلسة
      await this.db.session.update({ where: { id: s.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (s.user.isBanned) throw new ForbiddenException('Account banned');

    const next = newToken();
    const r = await this.db.session.updateMany({           // شرط tokenHash يمنع تجديدين متزامنين بنفس التوكن
      where: { id: s.id, tokenHash: hash, revokedAt: null },
      data: { tokenHash: sha(next), prevHash: hash, lastUsedAt: new Date(), expiresAt: expiry() },
    });
    if (!r.count) throw new UnauthorizedException('Invalid refresh token');
    return this.tokens(s.user, s.id, next);
  }

  /** خروج من هذا الجهاز */
  async logout(sid: string) {
    await this.db.session.updateMany({ where: { id: sid, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
  }

  /** خروج من كل الأجهزة */
  async logoutAll(userId: number) {
    const r = await this.db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true, revoked: r.count };
  }

  async sessions(userId: number, currentSid: string) {
    const list = await this.db.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, ip: true, userAgent: true, createdAt: true, lastUsedAt: true },
    });
    return list.map((s) => ({ ...s, current: s.id === currentSid }));
  }

  async revokeOne(userId: number, id: string) {
    const r = await this.db.session.updateMany({ where: { id, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!r.count) throw new NotFoundException();   // لا يستطيع أحد إلغاء جلسة غيره
    return { ok: true };
  }
}