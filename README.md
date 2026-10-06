# فريق الروضة الرياضي الثقافي

موقع عربي متجاوب للتسجيل في البطولة الرمضانية، مع لوحة إدارة خاصة، وقاعدة بيانات PostgreSQL على Supabase. الواجهة ثابتة وخدمات الخادم تعمل كـ Vercel Functions.

## روابط المشروع المنشور

- الموقع: [al-roudah-ramadan.vercel.app](https://al-roudah-ramadan.vercel.app/)
- لوحة الإدارة: [al-roudah-ramadan.vercel.app/admin](https://al-roudah-ramadan.vercel.app/admin)
- مستودع GitHub: [github.com/ax6l4/-](https://github.com/ax6l4/-)
- إعداد متغيرات Vercel: [Environment Variables](https://vercel.com/ax6l4s-projects/al-roudah-ramadan/settings/environment-variables)

تم ربط فرع `main` من GitHub بمشروع Vercel، لذلك تؤدي التغييرات التي تُرفع إلى الفرع إلى نشر جديد تلقائيًا. واجهة الموقع منشورة حاليًا، لكن التسجيل ودخول الإدارة لن يعملا قبل إنشاء مشروع Supabase وإضافة متغيراته أدناه.

## التشغيل والنشر

### ١. إعداد قاعدة البيانات

1. أنشئ مشروعًا مجانيًا في [Supabase](https://supabase.com/).
2. افتح **SQL Editor** وشغّل كامل محتوى [`Database/schema.sql`](./Database/schema.sql).
3. من **Project Settings → API** انسخ عنوان المشروع ومفتاح `anon` ومفتاح `service_role`. لا تضع مفتاح `service_role` في ملفات الواجهة أو في مستودع عام.
4. من **Authentication → Providers → Email** عطّل تأكيد البريد الإلكتروني. حسابات المشرفين تُنشأ يدويًا ويجب أن تكون مؤكدة حتى يمكنها تسجيل الدخول.

### ٢. إنشاء حساب الإدارة الأول

1. من **Authentication → Users** أضف مستخدمًا جديدًا بعنوان بريد إلكتروني تملكه، وكلمة مرور قوية، واجعل البريد مؤكّدًا.
2. في **SQL Editor** سجّل اسم المستخدم الذي سيكتبه المشرف في صفحة `/admin`:

```sql
insert into public.admin_accounts (user_id, username, email)
select id, 'admin', email
from auth.users
where email = 'البريد-الذي-أضفته@example.com';
```

غيّر `admin` والبريد في المثال إلى القيم الفعلية. لإضافة مشرف آخر، أنشئ مستخدمًا آخر في **Authentication → Users** ثم أضف صفًا آخر إلى `admin_accounts` باسم مستخدم فريد. كلمات المرور لا تُخزّن في هذا الجدول؛ يتولى Supabase Auth تخزينها والتحقق منها بتجزئة آمنة.

لتغيير كلمة المرور، اختر المستخدم من **Authentication → Users** واستخدم إجراء إعادة تعيين/تغيير كلمة المرور في لوحة Supabase. لا حاجة لتعديل سجل `admin_accounts`.

### ٣. نشر الموقع على Vercel

1. المشروع مرتبط بالفعل بمستودع GitHub أعلاه ومشروع Vercel `al-roudah-ramadan`.
2. في **Project Settings → Environment Variables** أضف:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. اختر بيئات **Production** و**Preview** حسب الحاجة، ثم أعد النشر بعد إضافة المتغيرات. صفحة التسجيل هي `/` ولوحة الإدارة هي `/admin`.

للتشغيل المحلي، ثبّت Node.js 22 أو أحدث وVercel CLI، انسخ `.env.example` إلى `.env.local` واملأ القيم، ثم شغّل:

```bash
npm install
npm install --global vercel
vercel dev
```

## التشغيل والأمان

- لا تُحفظ معلومات المشارك قبل الضغط على «تسجيل» في الخطوة الأخيرة.
- يفحص الخادم الاسم عند الانتقال من الخطوة الأولى، ثم يفرض قيد التفرد مجددًا في PostgreSQL عند التسجيل، بعد توحيد المسافات والهمزات والتاء المربوطة.
- أرقام الهاتف لا تتطلب التفرد؛ تُقبل الأرقام العربية والهندية والفارسية والإنجليزية، وتُخزّن بالأرقام اللاتينية.
- دخول الإدارة يستخدم Supabase Auth وجلسة قصيرة في ملف تعريف ارتباط `HttpOnly` و`SameSite=Strict` و`Secure` على HTTPS. الطلبات الحساسة تتحقق من الجلسة وصلاحية المشرف على الخادم.
- تحدّ قاعدة البيانات من محاولات فحص الاسم والتسجيل وتسجيل دخول الإدارة لكل عنوان شبكة، ولا تتيح سياسات RLS قراءة بيانات المسجلين مباشرة من المتصفح.
- زر «طباعة / حفظ PDF» يفتح نافذة طباعة المتصفح؛ اختر «حفظ بصيغة PDF». التشكيل والاتجاه العربيان يعتمدان على دعم المتصفح للخط العربي، وتُطبع النتائج وفق البحث والفلاتر الحالية.

## الشعار

تم اعتماد الشعار الأصلي كما هو في الملف `assets/logo.png`، وهو مستخدم في الترويسة وصفحة دخول الإدارة وأعلى ملف الطباعة والأيقونة.
