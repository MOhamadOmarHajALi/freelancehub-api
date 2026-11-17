import { BadRequestException, ConflictException, ForbiddenException, Injectable,
  InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import { PrismaService } from '../prisma/prisma.service';

const COMMISSION_RATE = '0.10';

@Injectable()
export class ContractsService {
  constructor(private db: PrismaService) {}

  /** قبول عرض: كل الخطوات في transaction واحدة، فشل أي خطوة يتراجع عن الكل */
  async accept(ownerId: number, proposalId: number) {
    const p = await this.db.proposal.findUnique({ where: { id: proposalId }, include: { project: true } });
    if (!p) throw new NotFoundException();
    if (p.project.ownerId !== ownerId) throw new ForbiddenException();

    return this.db.$transaction(async (tx) => {
      // updateMany المشروط يحسم التزامن: طلبان معاً، واحد فقط يجد الشرط صحيحاً
      const pr = await tx.project.updateMany({ where: { id: p.projectId, status: 'OPEN' }, data: { status: 'IN_PROGRESS' } });
      if (!pr.count) throw new ConflictException('Project is not open');
      const pa = await tx.proposal.updateMany({ where: { id: proposalId, status: 'PENDING' }, data: { status: 'ACCEPTED' } });
      if (!pa.count) throw new ConflictException('Proposal is not pending');
      await tx.proposal.updateMany({ where: { projectId: p.projectId, id: { not: proposalId } }, data: { status: 'REJECTED' } });

      const w = await tx.wallet.updateMany({
        where: { userId: ownerId, balance: { gte: p.price } },           // الرصيد يكفي؟
        data: { balance: { decrement: p.price }, held: { increment: p.price } },
      });
      if (!w.count) throw new BadRequestException('Insufficient balance'); // يتراجع كل ما سبق

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: ownerId } });
      await tx.transaction.create({ data: { walletId: wallet.id, projectId: p.projectId, type: 'HOLD', amount: p.price } });
      return { accepted: proposalId, projectStatus: 'IN_PROGRESS' };
    });
  }

  /** رفع ملف التسليم (المستقل المقبول فقط والمشروع قيد التنفيذ) */
  async deliver(freelancerId: number, projectId: number, file: Express.Multer.File) {
    const p = await this.db.project.findUnique({
      where: { id: projectId }, include: { proposals: { where: { status: 'ACCEPTED' } } },
    });
    if (!p || p.status !== 'IN_PROGRESS' || p.proposals[0]?.freelancerId !== freelancerId) {
      fs.unlink(file.path, () => {});
      throw new ForbiddenException('Not your active project');
    }
    try {
      return await this.db.delivery.create({ data: { projectId, proposalId: p.proposals[0].id, file: file.path } });
    } catch (e: any) {
      fs.unlink(file.path, () => {});
      if (e.code === 'P2002') throw new ConflictException('Already delivered');
      throw e;
    }
  }

  /** مسار ملف التسليم للمالك أو المستقل المقبول فقط */
  async deliveryPath(userId: number, projectId: number) {
    const d = await this.db.delivery.findUnique({
      where: { projectId },
      include: { project: { include: { proposals: { where: { status: 'ACCEPTED' } } } } },
    });
    if (!d) throw new NotFoundException();
    if (d.project.ownerId !== userId && d.project.proposals[0]?.freelancerId !== userId) throw new ForbiddenException();
    return d.file;
  }

  /** موافقة صاحب المشروع: تحرير المحجوز، 90% للمستقل و10% عمولة، ثم اكتمال المشروع */
  async approve(ownerId: number, projectId: number) {
    const p = await this.db.project.findUnique({
      where: { id: projectId }, include: { delivery: true, proposals: { where: { status: 'ACCEPTED' } } },
    });
    if (!p) throw new NotFoundException();
    if (p.ownerId !== ownerId) throw new ForbiddenException();
    if (p.status !== 'IN_PROGRESS' || !p.delivery) throw new ConflictException('Nothing to approve');

    const prop = p.proposals[0];
    const price = new Prisma.Decimal(prop.price);
    const fee = price.mul(COMMISSION_RATE).toDecimalPlaces(2);
    const pay = price.sub(fee);
    const admin = await this.db.user.findFirstOrThrow({ where: { role: 'ADMIN' } });

    return this.db.$transaction(async (tx) => {
      const r = await tx.project.updateMany({ where: { id: projectId, status: 'IN_PROGRESS' }, data: { status: 'COMPLETED' } });
      if (!r.count) throw new ConflictException('Already completed');
      const rel = await tx.wallet.updateMany({ where: { userId: ownerId, held: { gte: price } }, data: { held: { decrement: price } } });
      if (!rel.count) throw new InternalServerErrorException('Held funds mismatch');
      const fw = await tx.wallet.update({ where: { userId: prop.freelancerId }, data: { balance: { increment: pay } } });
      const aw = await tx.wallet.update({ where: { userId: admin.id }, data: { balance: { increment: fee } } });
      await tx.transaction.createMany({ data: [
        { walletId: fw.id, projectId, type: 'PAYOUT', amount: pay },
        { walletId: aw.id, projectId, type: 'COMMISSION', amount: fee },
      ] });
      return { status: 'COMPLETED', freelancerReceived: pay, commission: fee };
    });
  }
}
