import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryDto } from './dto/category.dto';

const KEY = 'categories';

@Injectable()
export class CategoriesService {
  constructor(private db: PrismaService, @Inject(CACHE_MANAGER) private cache: Cache) {}

  async list() {
    let c = await this.cache.get<any[]>(KEY);
    if (!c) { c = await this.db.category.findMany({ orderBy: { name: 'asc' } }); await this.cache.set(KEY, c); }
    return c;
  }
  create(d: CategoryDto) { return this.write(() => this.db.category.create({ data: d })); }
  update(id: number, d: CategoryDto) { return this.write(() => this.db.category.update({ where: { id }, data: d })); }
  remove(id: number) { return this.write(() => this.db.category.delete({ where: { id } })); }

  // أي تعديل يمسح الكاش => الجميع يرى التغيير مباشرة
  private async write(fn: () => Promise<any>) {
    try { const r = await fn(); await this.cache.del(KEY); return r; }
    catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Name already exists');
      if (e.code === 'P2003') throw new ConflictException('Category has projects');
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }
}
