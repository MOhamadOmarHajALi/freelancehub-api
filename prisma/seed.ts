import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main() {
  await db.user.upsert({
    where: { email: 'admin@freelancehub.com' }, update: {},
    create: { name: 'Admin', email: 'admin@freelancehub.com', role: 'ADMIN',
      password: await bcrypt.hash('Admin@12345', 12), wallet: { create: {} } },
  });
  for (const name of ['برمجة', 'تصميم', 'ترجمة', 'تسويق'])
    await db.category.upsert({ where: { name }, update: {}, create: { name } });
}
main().finally(() => db.$disconnect());
