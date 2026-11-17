# FreelanceHub API (NestJS + Prisma + PostgreSQL)

## التشغيل (أول مرة)
```bash
npm install
cp .env.example .env              # عدّل DATABASE_URL و JWT_SECRET
npx prisma migrate dev --name init
npx prisma db seed                # أدمن: admin@freelancehub.com / Admin@12345 + 4 تصنيفات
npm run start:dev
```
- Swagger:  http://localhost:3000/docs   (زر Authorize ثم الصق accessToken)
- الـ API:  http://localhost:3000

## Postman
1. Import: `postman/FreelanceHub.postman_collection.json` و `postman/FreelanceHub.postman_environment.json` واختر البيئة.
2. في طلبات رفع الملفات (اسمها فيها "select ...") اضغط Select Files واختر ملفاً من مجلد `samples/` مرة واحدة.
3. شغّل الـ Collection بالترتيب من Runner (80 طلباً، فيها اختبارات تلقائية). تحتاج seed والسيرفر شغّالين.
   كل تشغيل ينشئ مستخدمين جدداً (runId جديد) فيمكن إعادته دون تنظيف قاعدة البيانات.

## اختبار التزامن
`npm run test:concurrency` (والسيرفر شغّال): واحد 201 وواحد 409، والمحفظة balance=100 و held=200.

## قرارات التصميم
1. المبالغ Decimal(12,2) وتُعاد كنصوص في JSON.
2. عمولة المنصة (10%) تذهب إلى محفظة حساب الأدمن (يُنشأ بالـ seed فقط).
3. المبلغ المحجوز في عمود held لدى صاحب المشروع ويخرج منه عند الموافقة فقط.
4. التزامن: updateMany مشروط داخل $transaction، فلا يُقبل عرضان ولا يُصرف المحجوز مرتين.
5. الحظر يُفحص في كل طلب (JwtStrategy.validate).
6. Throttling: 5 محاولات دخول/دقيقة لكل (IP+إيميل)، و300 طلب/دقيقة لباقي المسارات.
7. كاش التصنيفات في ذاكرة السيرفر ويُمسح عند أي تعديل (مع عدة نسخ من السيرفر استخدم Redis).
8. الملفات العامة تُخدم من /files، وملف التسليم خاص يُنزَّل عبر endpoint يتحقق من الملكية (حدّه 20MB).
9. غير مذكور في المواصفات فاعتمدنا: تسليم واحد لكل مشروع، لا رفض للتسليم، منع حذف تصنيف مرتبط بمشاريع، شحن حتى 100000 للعملية.
