# ระบบบันทึกการฝึกอาชีพ

ระบบบันทึกเวลาเข้า–ออกงานและข้อมูลการฝึกอาชีพ สำหรับผู้ฝึกอาชีพและเจ้าหน้าที่ศูนย์การเรียนปัญญาภิวัฒน์ขอนแก่น

แอปสร้างด้วย Next.js App Router และ TypeScript ใช้ PostgreSQL สำหรับข้อมูลหลัก, Prisma ORM สำหรับเข้าถึงฐานข้อมูล และ Cloudinary สำหรับรูปประกอบการลงเวลา

> **สถานะก่อนเปิดใช้งานจริง:** หน้า CSV นำเข้ารายชื่อในปัจจุบันตรวจสอบและแสดงตัวอย่างข้อมูลเท่านั้น ยังไม่บันทึกรายชื่อเข้าฐานข้อมูล และยังไม่มี seed/bootstrap script สำหรับสร้างบัญชี ADMIN แรก นอกจากนี้ `POST /api/auth/register` ยังเป็น public endpoint ที่สร้างบัญชี STUDENT ได้ ซึ่งไม่สอดคล้องกับนโยบายไม่ให้สมัครเอง หากนโยบายนี้ยังมีผล ต้องปิดหรือจำกัด endpoint ดังกล่าว และกำหนดวิธี provision บัญชี ADMIN ที่ปลอดภัยก่อนเปิดระบบให้ผู้ใช้จริง

## สารบัญ

- [ความสามารถและกฎธุรกิจ](#ความสามารถและกฎธุรกิจ)
- [เทคโนโลยีและโครงสร้าง](#เทคโนโลยีและโครงสร้าง)
- [ข้อกำหนดก่อนเริ่ม](#ข้อกำหนดก่อนเริ่ม)
- [ติดตั้งสำหรับเครื่องพัฒนา](#ติดตั้งสำหรับเครื่องพัฒนา)
- [คำสั่งที่ใช้บ่อย](#คำสั่งที่ใช้บ่อย)
- [ฐานข้อมูลและ Prisma](#ฐานข้อมูลและ-prisma)
- [ตัวแปรแวดล้อม](#ตัวแปรแวดล้อม)
- [การทดสอบและตรวจสอบก่อนส่งงาน](#การทดสอบและตรวจสอบก่อนส่งงาน)
- [แนวทาง deploy production](#แนวทาง-deploy-production)
- [ความปลอดภัยและการดูแลระบบ](#ความปลอดภัยและการดูแลระบบ)
- [ข้อจำกัดที่ควรทราบ](#ข้อจำกัดที่ควรทราบ)
- [เอกสาร API](#เอกสาร-api)

## ความสามารถและกฎธุรกิจ

- **ผู้ฝึกอาชีพ:** ดูแดชบอร์ด, ลงเวลาเข้า–ออก, ดูประวัติลงเวลา, ดูรายการเงินส่วนตัว และแจ้ง/ดูประวัติการลา
- **เจ้าหน้าที่:** ดูภาพรวม, ค้นหาและกรองข้อมูลลงเวลา, ดูรายงาน, รายชื่อนักศึกษา และหน้าตรวจสอบไฟล์รายชื่อ
- **การยืนยันตัวตน:** session cookie แบบ HttpOnly; ระบบมีบทบาท `ADMIN` และ `STUDENT`
- **ลงเวลา:** จำกัดหนึ่งรายการลงเวลาต่อผู้ใช้ต่อวัน โดยใช้วันทำงานตามเขตเวลา Asia/Bangkok
- **บันทึกเงิน:** ผูกกับรายการลงเวลา โดยจำกัดหนึ่งรายการเงินเข้า (`IN`) และหนึ่งรายการเงินออก (`OUT`) ต่อรายการลงเวลา; รองรับ `CASH` และ `TRUEMONEY`
- **การลา:** มีประเภท `HOLIDAY`, `SICK` และ `PERSONAL`; ตามกฎระบบปัจจุบันไม่ต้องรอการอนุมัติ
- **รูปภาพ:** รูปเช็กอิน/เช็กเอาท์ตรวจชนิดไฟล์และขนาดก่อนอัปโหลดไป Cloudinary

รายละเอียด endpoint, สิทธิ์, request/response และรหัส error อยู่ใน [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) และ [API.md](./API.md) โปรดตรวจสอบเอกสารกับ implementation ปัจจุบันก่อนเชื่อมต่อ client ภายนอก

## เทคโนโลยีและโครงสร้าง

| ส่วน | เทคโนโลยี |
| --- | --- |
| Web framework | Next.js 16 App Router |
| ภาษา | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Validation | Zod 4 |
| Database | PostgreSQL (รองรับ Supabase PostgreSQL) |
| ORM | Prisma ORM 7 พร้อม `@prisma/adapter-pg` และ `pg` |
| รูปภาพ | Cloudinary |
| รหัสผ่าน | Argon2id สำหรับ hash ใหม่; รองรับตรวจสอบ hash รูปแบบเดิม |

โครงสร้างสำคัญ:

```text
app/
  admin/                  หน้าสำหรับเจ้าหน้าที่
  student/                หน้าสำหรับผู้ฝึกอาชีพ
  api/                    Next.js Route Handlers
  components/             UI และ client components ที่ใช้ร่วมกัน
  generated/prisma/       Prisma Client ที่ generate (ไม่ commit)
lib/
  api.ts                  รูปแบบ response/error และ helper สำหรับ API
  auth.ts                 session, cookie และการตรวจสอบผู้ใช้
  db.ts                   Prisma Client และ PostgreSQL adapter
  page-auth.ts            guards สำหรับหน้า admin/student
prisma/
  schema.prisma           Prisma schema
  migrations/             migration history ที่ใช้กับฐานข้อมูล
services/                 งานและกฎธุรกิจที่เรียกจาก routes/pages
validators/               Zod schemas และ helpers สำหรับ query
tests/                    unit tests
```

Route Handlers ตรวจสิทธิ์/อ่าน input และเรียก service; หน้า server-rendered เรียก service สำหรับข้อมูลที่ต้องแสดง; `lib/db.ts` สร้าง Prisma Client singleton สำหรับ process และเชื่อมต่อ PostgreSQL ผ่าน adapter คำสั่ง query ของ Prisma อยู่ใน service modules ปัจจุบัน (ยังไม่มี repository module แยก)

## ข้อกำหนดก่อนเริ่ม

- Node.js **24.x** แนะนำ (โปรเจกต์นี้ตรวจด้วย Node.js 24.14.1) เพื่อให้ทั้ง Next.js และ Node test runner รองรับการใช้งาน TypeScript ที่มีอยู่
- npm และ Git
- PostgreSQL ที่แอปและ Prisma CLI เชื่อมต่อได้ เช่น PostgreSQL บน Supabase
- บัญชี Cloudinary สำหรับฟังก์ชันอัปโหลดรูปลงเวลา
- คำสั่ง Prisma migration ต้องเชื่อมต่อฐานข้อมูลเป้าหมายได้

## ติดตั้งสำหรับเครื่องพัฒนา

### 1. ดาวน์โหลด source และติดตั้ง dependencies

```bash
git clone <repository-url>
cd panyapiwat-time-attendance
npm ci
```

`npm ci` ติดตั้ง dependency ตาม `package-lock.json` และเหมาะสำหรับ CI/CD หากแก้ dependency manifest ให้ปรับ lockfile ด้วย npm แล้ว commit ทั้งคู่

### 2. ตั้งค่าตัวแปรแวดล้อม

คัดลอกไฟล์ตัวอย่างเป็น `.env` ที่ root ของโปรเจกต์:

```powershell
Copy-Item .env.example .env
```

หรือบน macOS/Linux:

```bash
cp .env.example .env
```

แก้ค่าภายใน `.env` ให้ตรงกับ PostgreSQL และ Cloudinary ของคุณ ดูรายละเอียดที่หัวข้อ [ตัวแปรแวดล้อม](#ตัวแปรแวดล้อม) ห้าม commit `.env` หรือใส่ secret ลงใน source code

> ใช้ `.env` สำหรับขั้นตอน Prisma CLI ด้วย เพราะ [prisma7.config.ts](./prisma7.config.ts) โหลด `dotenv/config` ซึ่งอ่าน `.env` โดยตรง Next.js ก็อ่าน `.env` ได้เช่นกัน อย่าใส่ connection string จริงลงใน `.env.example`

### 3. ติดตั้ง schema และสร้าง Prisma Client

คำสั่งต่อไปนี้ใช้ migration ที่มีอยู่ใน `prisma/migrations`:

```bash
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` ใช้ apply migration ที่ยังไม่ถูกติดตั้งโดยไม่สร้าง migration ใหม่ เหมาะกับฐานข้อมูลว่างและ deployment หากกำลังต่อกับฐานข้อมูลที่มีข้อมูลอยู่แล้ว ให้ตรวจสอบสถานะและ migration history ก่อน ห้ามใช้คำสั่ง reset กับฐานข้อมูลที่มีข้อมูลสำคัญ

### 4. เริ่มแอป

```bash
npm run dev
```

เปิด `http://localhost:3000` หาก port ถูกใช้งาน Next.js จะแจ้ง port อื่นใน terminal

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ใช้ทำอะไร |
| --- | --- |
| `npm run dev` | เปิด development server |
| `npm run build` | compile และสร้าง production build |
| `npm run start` | เปิด production build ที่สร้างแล้ว |
| `npm run lint` | ตรวจ ESLint |
| `npx tsc --noEmit` | ตรวจ TypeScript โดยไม่สร้างไฟล์ output |
| `npm test` | รัน unit tests ด้วย `node --test` |
| `npx prisma generate` | สร้าง Prisma Client จาก schema |
| `npx prisma migrate status` | ตรวจ migration history เทียบกับฐานข้อมูล |
| `npx prisma migrate dev --name <ชื่อการเปลี่ยนแปลง>` | สร้างและ apply migration ใน development |
| `npx prisma migrate deploy` | apply migration ที่ commit แล้วใน staging/production |

หลังเปลี่ยน `prisma/schema.prisma` ให้สร้าง migration ใน development, ตรวจ SQL ที่ได้และทดสอบกับฐานข้อมูล development ก่อน จากนั้น commit ทั้ง schema และ migration directory ห้ามสร้าง migration ใหม่หรือใช้ `migrate dev` ระหว่าง production release

## ฐานข้อมูลและ Prisma

- Prisma schema อยู่ที่ [prisma/schema.prisma](./prisma/schema.prisma)
- Prisma config อยู่ที่ [prisma7.config.ts](./prisma7.config.ts) และใช้ `DATABASE_URL`
- Migration history อยู่ที่ [prisma/migrations](./prisma/migrations)
- Prisma Client ถูก generate ไปที่ `app/generated/prisma` ซึ่งถูก ignore โดย Git
- Runtime ใช้ `PrismaPg` จาก `@prisma/adapter-pg` และอ่าน `DATABASE_URL` ผ่าน [lib/db.ts](./lib/db.ts)
- ใช้ Prisma 7; อย่าเปลี่ยน generator, adapter, config หรือ schema เป็นตัวอย่างของ Prisma รุ่นอื่นโดยไม่วางแผนอัปเกรดแยก

ถ้าใช้ Supabase ให้เลือก connection string ที่เข้าถึงได้จาก runtime ของแอปและ Prisma CLI ใช้ได้สำหรับ migration ด้วย โปรเจกต์ปัจจุบันใช้ `DATABASE_URL` ตัวเดียวทั้งสองกรณี ตรวจการตั้งค่า SSL, network allowlist, connection pooler และจำนวน connection ให้เหมาะกับ hosting platform โดยเฉพาะเมื่อรันหลาย instance

## ตัวแปรแวดล้อม

| ตัวแปร | จำเป็น | ใช้สำหรับ |
| --- | --- | --- |
| `DATABASE_URL` | จำเป็น | PostgreSQL connection string สำหรับ Prisma CLI และ runtime |
| `CLOUDINARY_CLOUD_NAME` | จำเป็นสำหรับอัปโหลดรูป | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | จำเป็นสำหรับอัปโหลดรูป | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | จำเป็นสำหรับอัปโหลดรูป | Cloudinary API secret |
| `NODE_ENV` | กำหนดโดย Next.js/host | ใช้เปิด `Secure` flag ของ session cookie เมื่อเป็น `production` |

ตัวอย่างรูปแบบ PostgreSQL URL (ใช้ค่าของฐานข้อมูลจริงแทน placeholder):

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

หาก password มีอักขระพิเศษ ให้ URL-encode ส่วน password ตามรูปแบบ URL ห้ามเผยแพร่ connection string หรือ Cloudinary secret ใน issue, log, screenshot หรือ repository

## การทดสอบและตรวจสอบก่อนส่งงาน

รันชุดตรวจหลัก:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

ชุดทดสอบปัจจุบันเน้นตรรกะที่ไม่ต้องพึ่ง database เช่น การคำนวณวันทำงานตามเวลาไทย, ช่วงเดือน, การสรุปชั่วโมง, กฎเช็กเอาท์, การคำนวณเงิน และ validation การลา ดูที่ [tests/api-logic.test.mjs](./tests/api-logic.test.mjs) การผ่าน unit tests ไม่ได้แทนการทดสอบ integration กับ PostgreSQL/Cloudinary หรือการทดสอบ flow ด้วยบัญชีจริง

ก่อน release ให้ทดสอบอย่างน้อย:

1. การเข้าสู่ระบบ/ออกจากระบบและการ redirect ตาม role
2. การเช็กอินและเช็กเอาท์ พร้อมอัปโหลดรูปไป Cloudinary
3. การบันทึกยอดเงินและตรวจยอดสรุป
4. การแจ้งลาและตรวจช่วงวันที่
5. หน้ารายงานและตัวกรองของ ADMIN
6. behavior เมื่อฐานข้อมูลหรือ Cloudinary ใช้งานไม่ได้

## แนวทาง deploy production

1. เตรียม PostgreSQL production แยกจาก development และเปิด backup/point-in-time recovery ตามนโยบายข้อมูลขององค์กร
2. ตั้งค่า environment variables ใน secret manager ของ hosting platform โดยไม่ใช้ไฟล์ `.env` ใน deployment
3. ตรวจว่ารุ่น Node.js เป็นรุ่นที่รองรับและ runtime เป็น Node.js server runtime (ไม่ใช่ Edge runtime สำหรับ Prisma/`pg`/`argon2`)
4. ติดตั้ง dependency แบบ reproducible ด้วย `npm ci`
5. สร้าง Prisma Client และ build แอป:

   ```bash
   npx prisma generate
   npm run build
   ```

6. ใน release step ที่เชื่อมต่อ production database ได้ ให้ apply migration ที่ผ่านการ review:

   ```bash
   npx prisma migrate deploy
   ```

   ให้มี release/migration runner เพียงหนึ่งตัว apply migration ในเวลาเดียวกัน ตรวจ backup และแผน rollback ก่อน migration ที่มีผลกับข้อมูล
7. เริ่ม process ด้วย:

   ```bash
   npm run start
   ```

8. ตรวจ log, database connectivity, การ login, การอัปโหลดรูป และ flow หลักหลัง deploy

เปิดใช้ production ได้ต่อเมื่อมีบัญชี ADMIN แรกที่ provision อย่างปลอดภัย และตรวจสอบ/จัดการ public registration endpoint กับขั้นตอนนำเข้ารายชื่อให้เป็นไปตามนโยบาย enrollment ขององค์กรแล้ว

## ความปลอดภัยและการดูแลระบบ

- Session ใช้ cookie ชื่อ `attendance_session` แบบ HttpOnly, SameSite=Strict, อายุ 12 ชั่วโมง และเปิด `Secure` เมื่อ `NODE_ENV=production`
- การเรียก mutation API ที่ต้องป้องกัน CSRF ตรวจ `Origin` ให้ตรงกับ host ของ request (การ register เป็นข้อยกเว้นใน implementation ปัจจุบัน)
- Login มี rate limit ตาม identifier หลังพยายามผิด 10 ครั้งในช่วง 15 นาที
- รหัสผ่านใหม่ hash ด้วย Argon2id; ห้าม log หรือส่ง password/hash กลับไป client
- รูปลงเวลารับเฉพาะ JPEG, PNG หรือ WebP ขนาดไม่เกิน 5 MB และตรวจลายเซ็นไฟล์ก่อนอัปโหลด
- API response ส่วนตัวตั้ง `Cache-Control: no-store`
- จำกัดสิทธิ์เข้าถึง database, Cloudinary และ hosting secrets เฉพาะผู้/ระบบที่จำเป็น และหมุน secret ทันทีเมื่อสงสัยว่ารั่ว
- เก็บข้อมูลส่วนบุคคลและรูปภาพเท่าที่จำเป็น กำหนดสิทธิ์เข้าถึงและระยะเวลาเก็บรักษาตามนโยบายองค์กร
- ตรวจสอบ schema และ migration ด้วย review ก่อน apply; migration ที่ deploy แล้วไม่ควรแก้ย้อนหลัง ให้เพิ่ม migration ใหม่แทน

## ข้อจำกัดที่ควรทราบ

- ยังไม่มี seed/bootstrap script สำหรับบัญชี ADMIN แรก
- หน้าตรวจสอบ CSV เป็น preview ฝั่ง client; ปุ่มแจ้งว่า API สำหรับบันทึกรายชื่อจะเปิดในเฟสถัดไป จึงยังไม่นำเข้าฐานข้อมูล
- `POST /api/auth/register` ปัจจุบันเป็น public endpoint สำหรับสร้างบัญชี STUDENT แม้ UI ไม่มีหน้าสมัครบัญชี นี่เป็นข้อขัดแย้งกับนโยบาย “ไม่มี self-register” และต้องแก้/จำกัดก่อน production หากนโยบายดังกล่าวยังใช้
- มี automated unit tests แต่ยังไม่ใช่ full end-to-end suite สำหรับทุก role และ external service
- การเปลี่ยนรหัสผ่าน, การกู้คืนบัญชี, การจัดการ retention ของรูปภาพ และระบบ provision ADMIN ต้องมีขั้นตอนปฏิบัติการที่องค์กรกำหนด

## เอกสาร API

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — เอกสาร API โดยละเอียดและตัวอย่าง
- [API.md](./API.md) — สรุป endpoint และขั้นตอนทดสอบเบื้องต้น

สำหรับการเรียก API ที่ต้องยืนยันตัวตน ให้ login ก่อนและรักษา cookie jar ไว้ สำหรับ mutation ที่ตรวจ Origin ให้ส่ง `Origin` ซึ่ง host ตรงกับ base URL ของ API
