import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { pageMeta } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListProjectsDto, ProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private db: PrismaService) {}

  async list(q: ListProjectsDto) {
    const where: Prisma.ProjectWhereInput = {
      status: 'OPEN',
      ...(q.categoryId && { categoryId: q.categoryId }),
      ...(q.search && { title: { contains: q.search, mode: 'insensitive' } }),
    };
    const orderBy: Prisma.ProjectOrderByWithRelationInput =
      q.sort === 'budget_asc' ? { budget: 'asc' } : q.sort === 'budget_desc' ? { budget: 'desc' } : { createdAt: 'desc' };
    const [data, total] = await this.db.$transaction([
      this.db.project.findMany({ where, orderBy, skip: (q.page - 1) * q.limit, take: q.limit, include: { category: true } }),
      this.db.project.count({ where }),
    ]);
    return { data, meta: pageMeta(total, q) };
  }

  mine(ownerId: number) {
    return this.db.project.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const p = await this.db.project.findUnique({
      where: { id }, include: { category: true, owner: { select: { id: true, name: true } } },
    });
    if (!p) throw new NotFoundException();
    return p;
  }

  async create(ownerId: number, d: ProjectDto, attachment: string | null) {
    if (!(await this.db.category.findUnique({ where: { id: d.categoryId } }))) throw new BadRequestException('Unknown category');
    return this.db.project.create({ data: { ...d, ownerId, attachment } });
  }

  async update(ownerId: number, id: number, d: UpdateProjectDto) {
    await this.assertOwnerAndOpen(id, ownerId);
    const r = await this.db.project.updateMany({ where: { id, status: 'OPEN' }, data: d });
    if (!r.count) throw new ConflictException('Project is no longer open');
    return this.db.project.findUnique({ where: { id } });
  }

  async remove(ownerId: number, id: number) {
    await this.assertOwnerAndOpen(id, ownerId);
    const r = await this.db.project.deleteMany({ where: { id, status: 'OPEN' } });
    if (!r.count) throw new ConflictException('Project is no longer open');
    return { deleted: true };
  }

  private async assertOwnerAndOpen(id: number, uid: number) {
    const p = await this.db.project.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    if (p.ownerId !== uid) throw new ForbiddenException();
    if (p.status !== 'OPEN') throw new ConflictException('Only open projects can be changed');
  }
}
