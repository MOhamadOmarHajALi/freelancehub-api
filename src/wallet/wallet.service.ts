import { BadRequestException, Injectable } from '@nestjs/common';
import { PaginationDto, pageMeta } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private db: PrismaService) {}

  get(userId: number) {
    return this.db.wallet.findUniqueOrThrow({ where: { userId }, select: { balance: true, held: true } });
  }

  topup(userId: number, amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than zero');
    }
    return this.db.$transaction(async (tx) => {
      const w = await tx.wallet.update({ where: { userId }, data: { balance: { increment: amount } } });
      await tx.transaction.create({ data: { walletId: w.id, type: 'TOPUP', amount } });
      return { balance: w.balance, held: w.held };
    });
  }

  async transactions(userId: number, q: PaginationDto) {
    const w = await this.db.wallet.findUniqueOrThrow({ where: { userId } });
    const where = { walletId: w.id };
    const [data, total] = await this.db.$transaction([
      this.db.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.db.transaction.count({ where }),
    ]);
    return { data, meta: pageMeta(total, q) };
  }
}
