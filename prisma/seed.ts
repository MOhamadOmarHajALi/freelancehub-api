/**
 * Seed: أدمن + تصنيفات (دائماً) + بيانات تجريبية متسقة ماليّاً (مرة واحدة).
 * التشغيل:  npx prisma db seed        |  إعادة بناء كل شيء:  npx prisma migrate reset
 *
 * حسابات التجربة (كلمة السر لكلها: Pass12345)
 *   صاحب مشروع: sara@demo.com  khaled@demo.com  noor@demo.com
 *   مستقل:      ahmad@demo.com laila@demo.com omar@demo.com huda@demo.com
 *   محظور:      rami@demo.com
 *   أدمن:       admin@freelancehub.com / Admin@12345
 */
import { PrismaClient, ProjectStatus, ProposalStatus, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';

const db = new PrismaClient();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- دوال دفتر الحسابات: كل حركة تغيّر المحفظة وتُسجَّل معاً ----------
async function walletOf(userId: number) { return db.wallet.findUniqueOrThrow({ where: { userId } }); }

async function topup(userId: number, amount: number, at: Date) {
  const w = await db.wallet.update({ where: { userId }, data: { balance: { increment: amount } } });
  await db.transaction.create({ data: { walletId: w.id, type: 'TOPUP', amount, createdAt: at } });
}
async function hold(ownerId: number, projectId: number, price: number, at: Date) {
  const w = await db.wallet.update({ where: { userId: ownerId }, data: { balance: { decrement: price }, held: { increment: price } } });
  await db.transaction.create({ data: { walletId: w.id, projectId, type: 'HOLD', amount: price, createdAt: at } });
}
async function release(ownerId: number, freelancerId: number, adminId: number, projectId: number, price: number, at: Date) {
  const fee = round2(price * 0.1);
  const pay = round2(price - fee);
  await db.wallet.update({ where: { userId: ownerId }, data: { held: { decrement: price } } });
  const fw = await db.wallet.update({ where: { userId: freelancerId }, data: { balance: { increment: pay } } });
  const aw = await db.wallet.update({ where: { userId: adminId }, data: { balance: { increment: fee } } });
  await db.transaction.createMany({ data: [
    { walletId: fw.id, projectId, type: 'PAYOUT', amount: pay, createdAt: at },
    { walletId: aw.id, projectId, type: 'COMMISSION', amount: fee, createdAt: at },
  ] });
}

function fakeDeliveryFile(projectId: number) {
  fs.mkdirSync('uploads/private', { recursive: true });
  const path = `uploads/private/seed-delivery-${projectId}.pdf`;
  fs.writeFileSync(path, '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n');
  return path;
}

// ---------- الأدمن والتصنيفات (تُنفَّذ دائماً بلا تكرار) ----------
async function base() {
  const admin = await db.user.upsert({
    where: { email: 'admin@freelancehub.com' }, update: {},
    create: { name: 'Admin', email: 'admin@freelancehub.com', role: 'ADMIN',
      password: await bcrypt.hash('Admin@12345', 12), wallet: { create: {} } },
  });
  const cats: Record<string, number> = {};
  for (const name of ['برمجة', 'تصميم', 'ترجمة', 'تسويق'])
    cats[name] = (await db.category.upsert({ where: { name }, update: {}, create: { name } })).id;
  return { admin, cats };
}

async function demo(adminId: number, cats: Record<string, number>) {
  const hash = await bcrypt.hash('Pass12345', 10);
  const mk = async (name: string, email: string, role: Role, extra: { bio?: string; rate?: number; banned?: boolean } = {}) =>
    db.user.create({
      data: {
        name, email, role, password: hash, isBanned: !!extra.banned, createdAt: daysAgo(40),
        wallet: { create: {} },
        ...(role === 'FREELANCER' ? { profile: { create: { bio: extra.bio, hourlyRate: extra.rate } } } : {}),
      },
    });

  // ---- المستخدمون ----
  const sara = await mk('سارة', 'sara@demo.com', 'OWNER');
  const khaled = await mk('خالد', 'khaled@demo.com', 'OWNER');
  const noor = await mk('نور', 'noor@demo.com', 'OWNER');
  const ahmad = await mk('أحمد', 'ahmad@demo.com', 'FREELANCER', { rate: 25, bio: 'مصمم هويات بصرية وشعارات، خبرة 6 سنوات في المتاجر الإلكترونية.' });
  const laila = await mk('ليلى', 'laila@demo.com', 'FREELANCER', { rate: 18, bio: 'مترجمة ومسوّقة محتوى، أعمل بالعربية والإنجليزية.' });
  const omar = await mk('عمر', 'omar@demo.com', 'FREELANCER', { rate: 40, bio: 'مطوّر Laravel وNestJS، أبني واجهات برمجية وتطبيقات جوال.' });
  const huda = await mk('هدى', 'huda@demo.com', 'FREELANCER', { rate: 22, bio: 'مصممة واجهات ومطبوعات، وأتقن التسويق عبر وسائل التواصل.' });
  await mk('رامي', 'rami@demo.com', 'FREELANCER', { banned: true, bio: 'حساب محظور لتجربة سلوك الحظر.' });

  const project = (ownerId: number, categoryId: number, title: string, description: string, budget: number, status: ProjectStatus, age: number) =>
    db.project.create({ data: { ownerId, categoryId, title, description, budget, status, createdAt: daysAgo(age) } });
  const proposal = (projectId: number, freelancerId: number, price: number, days: number, message: string, status: ProposalStatus, age: number) =>
    db.proposal.create({ data: { projectId, freelancerId, price, days, message, status, createdAt: daysAgo(age) } });

  // ---- سارة: شحن 1500$ ----
  await topup(sara.id, 1500, daysAgo(30));

  // 1) مكتمل: تصميم شعار (أحمد 200$ مقبول، ليلى 180$ مرفوض) => أحمد 180 + منصة 20
  const p1 = await project(sara.id, cats['تصميم'], 'تصميم شعار لمتجري الإلكتروني',
    'أحتاج شعاراً عصرياً وبسيطاً لمتجر ملابس، مع ملفات بصيغ مختلفة وألوان بديلة.', 200, 'COMPLETED', 28);
  const p1a = await proposal(p1.id, ahmad.id, 200, 3, 'سأسلّم ثلاث مقترحات خلال ثلاثة أيام مع تعديلين مجانيين.', 'ACCEPTED', 27);
  await proposal(p1.id, laila.id, 180, 5, 'أستطيع تنفيذه خلال خمسة أيام.', 'REJECTED', 27);
  await hold(sara.id, p1.id, 200, daysAgo(26));
  await db.delivery.create({ data: { projectId: p1.id, proposalId: p1a.id, file: fakeDeliveryFile(p1.id), createdAt: daysAgo(23) } });
  await release(sara.id, ahmad.id, adminId, p1.id, 200, daysAgo(22));

  // 2) قيد التنفيذ بلا تسليم: موقع تعريفي (عمر 550$ مقبول، هدى 600$ مرفوض) => محجوز 550
  const p2 = await project(sara.id, cats['برمجة'], 'بناء موقع تعريفي لشركة استشارات',
    'موقع من خمس صفحات (الرئيسية، من نحن، الخدمات، المدونة، اتصل بنا) متجاوب وسريع.', 600, 'IN_PROGRESS', 12);
  await proposal(p2.id, omar.id, 550, 10, 'سأبنيه بـ Next.js مع لوحة بسيطة لإدارة المدونة.', 'ACCEPTED', 11);
  await proposal(p2.id, huda.id, 600, 12, 'أقدّم تصميماً كاملاً ثم أطبّقه.', 'REJECTED', 11);
  await hold(sara.id, p2.id, 550, daysAgo(10));

  // 3) مفتوح: ترجمة كتيّب (عرضان بانتظار القرار)
  const p3 = await project(sara.id, cats['ترجمة'], 'ترجمة كتيّب تعريفي من الإنجليزية إلى العربية',
    'كتيّب من 20 صفحة عن منتجات العناية بالبشرة، يحتاج ترجمة دقيقة وتدقيقاً لغوياً.', 150, 'OPEN', 3);
  await proposal(p3.id, laila.id, 140, 4, 'ترجمة مع تدقيق لغوي وتسليم خلال أربعة أيام.', 'PENDING', 2);
  await proposal(p3.id, huda.id, 150, 5, 'أستطيع البدء فوراً.', 'PENDING', 2);

  // ---- خالد: شحن 800$ ----
  await topup(khaled.id, 800, daysAgo(20));

  // 4) مفتوح: حملة إعلانية (3 عروض)
  const p4 = await project(khaled.id, cats['تسويق'], 'إدارة حملة إعلانية على إنستغرام لمدة شهر',
    'مطلوب خطة محتوى وتصميم منشورات وإدارة إعلانات ممولة لمتجر قهوة مختصة.', 400, 'OPEN', 5);
  await proposal(p4.id, ahmad.id, 380, 30, 'تصميم المنشورات والإعلانات مع تقرير أسبوعي.', 'PENDING', 4);
  await proposal(p4.id, omar.id, 350, 30, 'أركّز على الإعلانات الممولة وتحليل النتائج.', 'PENDING', 4);
  await proposal(p4.id, laila.id, 400, 28, 'خطة محتوى كاملة مع كتابة النصوص.', 'PENDING', 3);

  // 5) قيد التنفيذ + تسليم مرفوع بانتظار موافقة خالد (عمر 500$ مقبول، أحمد 480$ مرفوض)
  const p5 = await project(khaled.id, cats['برمجة'], 'تطبيق جوال لحجز المواعيد',
    'تطبيق بسيط لحجز المواعيد مع إشعارات وربط بتقويم الهاتف، لنظامي أندرويد وiOS.', 500, 'IN_PROGRESS', 15);
  const p5a = await proposal(p5.id, omar.id, 500, 14, 'Flutter مع واجهة برمجية جاهزة.', 'ACCEPTED', 14);
  await proposal(p5.id, ahmad.id, 480, 16, 'أستطيع التنفيذ بسعر أقل.', 'REJECTED', 14);
  await hold(khaled.id, p5.id, 500, daysAgo(13));
  await db.delivery.create({ data: { projectId: p5.id, proposalId: p5a.id, file: fakeDeliveryFile(p5.id), createdAt: daysAgo(1) } });

  // ---- نور: رصيد قليل (100$) لتجربة رفض الميزانية الأكبر من الرصيد ----
  await topup(noor.id, 100, daysAgo(7));
  const p6 = await project(noor.id, cats['تصميم'], 'تصميم بطاقة أعمال',
    'بطاقة أعمال بوجهين لعيادة أسنان، جاهزة للطباعة.', 80, 'OPEN', 2);
  await proposal(p6.id, huda.id, 75, 2, 'تصميم بوجهين مع ملف جاهز للطباعة.', 'PENDING', 1);
}

async function main() {
  const { admin, cats } = await base();
  if (await db.user.findUnique({ where: { email: 'sara@demo.com' } })) {
    console.log('البيانات التجريبية موجودة مسبقاً، لم يُضَف شيء. (لإعادة البناء: npx prisma migrate reset)');
    return;
  }
  await demo(admin.id, cats);

  const sum = async (e: string) => { const w = await walletOf((await db.user.findUniqueOrThrow({ where: { email: e } })).id); return `${e}: balance=${w.balance} held=${w.held}`; };
  console.log('تمّ إنشاء البيانات التجريبية. الأرصدة:');
  for (const e of ['sara@demo.com', 'khaled@demo.com', 'noor@demo.com', 'ahmad@demo.com', 'admin@freelancehub.com']) console.log('  ' + await sum(e));
  console.log('كلمة سر الحسابات التجريبية: Pass12345');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());