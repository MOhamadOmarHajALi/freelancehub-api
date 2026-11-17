import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalDto, UpdateProposalDto } from './dto/proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(private db: PrismaService) {}

  async create(freelancerId: number, projectId: number, d: ProposalDto) {
    const p = await this.db.project.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException();
    if (p.status !== 'OPEN') throw new ConflictException('Project is not open');
    try { return await this.db.proposal.create({ data: { ...d, projectId, freelancerId } }); }
    catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('You already submitted a proposal');   // قيد فريد
      throw e;
    }
  }

  async forProject(ownerId: number, projectId: number) {
    const p = await this.db.project.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException();
    if (p.ownerId !== ownerId) throw new ForbiddenException();
    return this.db.proposal.findMany({
      where: { projectId }, orderBy: { createdAt: 'asc' },
      include: { freelancer: { select: { id: true, name: true, profile: { select: { hourlyRate: true, avatar: true } } } } },
    });
  }

  mine(freelancerId: number) {
    return this.db.proposal.findMany({
      where: { freelancerId }, orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, title: true, status: true } } },
    });
  }

  async update(freelancerId: number, id: number, d: UpdateProposalDto) {
    const p = await this.db.proposal.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    if (p.freelancerId !== freelancerId) throw new ForbiddenException();
    const r = await this.db.proposal.updateMany({ where: { id, status: 'PENDING', project: { status: 'OPEN' } }, data: d });
    if (!r.count) throw new ConflictException('Proposal can no longer be edited');
    return this.db.proposal.findUnique({ where: { id } });
  }
}
