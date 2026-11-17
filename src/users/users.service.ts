import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, pageMeta } from '../common/dto/pagination.dto';
import { ProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private db: PrismaService) {}

  async getFreelancer(userId: number) {
    const p = await this.db.freelancerProfile.findUnique({
      where: { userId },
      select: { avatar: true, bio: true, hourlyRate: true, user: { select: { id: true, name: true } } },
    });
    if (!p) throw new NotFoundException();
    return p;
  }
  updateProfile(userId: number, d: ProfileDto) {
    return this.db.freelancerProfile.update({ where: { userId }, data: d });
  }
  setAvatar(userId: number, path: string) {
    return this.db.freelancerProfile.update({ where: { userId }, data: { avatar: path } });
  }
  async list(q: PaginationDto) {
    const [data, total] = await this.db.$transaction([
      this.db.user.findMany({
        select: { id: true, name: true, email: true, role: true, isBanned: true },
        orderBy: { id: 'asc' }, skip: (q.page - 1) * q.limit, take: q.limit,
      }),
      this.db.user.count(),
    ]);
    return { data, meta: pageMeta(total, q) };
  }
  async setBan(id: number, banned: boolean) {
    const r = await this.db.user.updateMany({ where: { id, role: { not: 'ADMIN' } }, data: { isBanned: banned } });
    if (!r.count) throw new NotFoundException();
    return { ok: true };
  }
}
