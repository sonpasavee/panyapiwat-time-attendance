# ระบบบันทึกการฝึกอาชีพ

ระบบเว็บสำหรับบันทึกเวลาเข้า–ออกงานและติดตามข้อมูลการฝึกอาชีพของนักศึกษา พร้อมเครื่องมือสำหรับเจ้าหน้าที่ในการจัดการบัญชี ตรวจสอบการลงเวลา การลา และรายงาน

แอปนี้พัฒนาด้วย Next.js App Router และ TypeScript ใช้ PostgreSQL (สามารถใช้ Supabase PostgreSQL ได้), Prisma ORM และ Cloudinary สำหรับจัดเก็บภาพเช็กอิน/เช็กเอาท์

> **ข้อควรรู้ก่อนเปิดใช้:** ระบบปิดการสมัครสมาชิกเอง ไม่มีคำสั่ง seed หรือ bootstrap สำหรับสร้างผู้ดูแลระบบคนแรก บัญชี ADMIN ต้องถูก provision ผ่านขั้นตอนที่ผู้ดูแลระบบโครงการกำหนดอย่างปลอดภัยก่อนจึงจะนำเข้ารายชื่อหรือเข้าใช้หน้าผู้ดูแลระบบได้

## สารบัญ

- [ภาพรวมความสามารถ](#ภาพรวมความสามารถ)
- [เริ่มใช้งานสำหรับนักศึกษา](#เริ่มใช้งานสำหรับนักศึกษา)
- [เริ่มใช้งานสำหรับเจ้าหน้าที่](#เริ่มใช้งานสำหรับเจ้าหน้าที่)
- [เทคโนโลยี](#เทคโนโลยี)
- [ข้อกำหนดและการติดตั้งสำหรับนักพัฒนา](#ข้อกำหนดและการติดตั้งสำหรับนักพัฒนา)
- [ตัวแปรแวดล้อม](#ตัวแปรแวดล้อม)
- [ฐานข้อมูลและ Prisma](#ฐานข้อมูลและ-prisma)
- [โครงสร้างโครงการและแนวทางพัฒนา](#โครงสร้างโครงการและแนวทางพัฒนา)
- [เส้นทางหน้าเว็บ](#เส้นทางหน้าเว็บ)
- [API](#api)
- [การทดสอบและตรวจสอบ](#การทดสอบและตรวจสอบ)
- [Deploy และงานตามกำหนดเวลา](#deploy-และงานตามกำหนดเวลา)
- [ความปลอดภัยและการดูแลข้อมูล](#ความปลอดภัยและการดูแลข้อมูล)
- [แก้ปัญหาเบื้องต้น](#แก้ปัญหาเบื้องต้น)
- [เอกสารประกอบ](#เอกสารประกอบ)

## ภาพรวมความสามารถ

### ผู้ฝึกอาชีพ

- เข้าสู่ระบบด้วยรหัสนักศึกษาและรหัสผ่านที่เจ้าหน้าที่กำหนด
- ดูแดชบอร์ด สถานะวันนี้ เวลาทำงาน สรุปเงิน และประวัติล่าสุด
- เช็กอินและเช็กเอาท์พร้อมภาพถ่ายและบันทึกเงินสด/TrueMoney
- ดูประวัติการลงเวลาและสรุปประจำเดือน
- ดูสรุปเงินส่วนตัว แยกตามวันและประเภทเงิน
- แจ้งลาป่วย/ลากิจ และเลือกวันหยุด พร้อมดูและจัดการรายการของตนเอง

### เจ้าหน้าที่

- ดูภาพรวมการฝึกอาชีพ แยกตามรหัสร้านและสถานะ
- ค้นหา/กรองรายการลงเวลา ดูรายละเอียด และส่งออก CSV
- ดูรายงานชั่วโมงทำงานรายวัน/รายเดือน และส่งออก Excel
- ดูรายงานการเงินรายบุคคลและรายร้าน พร้อมส่งออกข้อมูล
- ค้นหา เพิ่ม แก้ไข เปิด/ปิดใช้งาน จัดการบทบาท และรีเซ็ตรหัสผ่านบัญชี
- นำเข้ารายชื่อนักศึกษาจาก CSV โดยตรวจข้อมูลก่อนบันทึก
- ตรวจสอบการลาและวันหยุดของนักศึกษา การลาไม่ต้องรออนุมัติ

### กฎและขอบเขตข้อมูล

- บทบาทมี `STUDENT` และ `ADMIN`; ทุกหน้าที่ต้องมีสิทธิ์จะตรวจ session และ role ฝั่งเซิร์ฟเวอร์
- นักศึกษาหนึ่งคนเช็กอินได้หนึ่งครั้งต่อวัน โดยใช้วันที่ทำงานตามเขตเวลา `Asia/Bangkok`; เช็กเอาท์ต้องมีเช็กอินของวันนั้นก่อน
- ตอนเช็กอินต้องกรอกเงินเข้าอย่างน้อยหนึ่งประเภท และตอนเช็กเอาท์ต้องกรอกเงินออกอย่างน้อยหนึ่งประเภท เลือกได้ทั้ง `CASH` และ `TRUEMONEY`; หากกรอกทั้งสองประเภทจะบันทึกแยกประเภท
- เวลาและจำนวนเงินที่แสดงในรายงานคำนวณจากระเบียนการลงเวลาและรายการเงินที่สัมพันธ์กัน
- ประเภทการลา/วันหยุดคือ `SICK`, `PERSONAL`, `HOLIDAY`; ไม่มี workflow อนุมัติ
- ไม่เปิด self-register; การเพิ่มบัญชีทำโดยผู้ดูแลระบบเท่านั้น
- ภาพเช็กอิน/เช็กเอาท์ถูกซ่อนเมื่ออายุเกิน 7 วัน และมีงานตามกำหนดเวลาลบภาพจาก Cloudinary ดู [รายละเอียดการเก็บภาพ](./documents/image-retention.md)

## เริ่มใช้งานสำหรับนักศึกษา

1. เปิดหน้าเข้าสู่ระบบนักศึกษา: `/login?role=student`
2. กรอกรหัสนักศึกษาและรหัสผ่านเริ่มต้นที่ได้รับจากเจ้าหน้าที่ โดยปกติรหัสผ่านเริ่มต้นคือรหัสพนักงานที่ใช้ตอนนำเข้ารายชื่อ
3. หลังเข้าสู่ระบบ ใช้เมนูหลักเพื่อไปยังแดชบอร์ด การลงเวลา ประวัติ เงิน หรือการลา
4. หน้าเช็กอิน/เช็กเอาท์จะแสดงสถานะของวันนี้และขั้นตอนที่ยังทำไม่ครบ
5. เตรียมภาพ JPEG, PNG หรือ WebP ขนาดไม่เกิน 5 MB และกรอกเงินสดหรือ TrueMoney อย่างน้อยหนึ่งช่องก่อนส่งรายการ
6. ตรวจรายการที่บันทึกได้ในหน้าประวัติการลงเวลาและหน้าเงิน
7. หากต้องแจ้งลาหรือเลือกวันหยุด ให้เปิดหน้าการลา เลือกแท็บที่ต้องการ และกรอกช่วงวันที่ ระบบจะเก็บเป็นประวัติโดยไม่ต้องรอการอนุมัติ
8. เลือก “ออกจากระบบ” เมื่อใช้เครื่องร่วมกับผู้อื่น

การนำเข้ารายชื่อยังไม่มีขั้นตอนเปลี่ยนรหัสผ่านด้วยตนเองในหน้าของนักศึกษา หากลืมรหัสผ่านให้ติดต่อเจ้าหน้าที่ ผู้ดูแลระบบสามารถใช้เครื่องมือรีเซ็ตรหัสผ่านในหน้าจัดการผู้ใช้ ซึ่งจะตั้งกลับเป็นรหัสเริ่มต้นตามข้อมูลบัญชี

## เริ่มใช้งานสำหรับเจ้าหน้าที่

1. เปิด `/login?role=admin` และเข้าสู่ระบบด้วย username หรือรหัสพนักงานและรหัสผ่านของบัญชี ADMIN
2. จากแดชบอร์ด ตรวจภาพรวมการลงเวลา การลา และข้อมูลของแต่ละร้าน
3. ใช้หน้าการลงเวลาเพื่อค้นหาด้วยชื่อ/รหัสนักศึกษา กรองรหัสร้าน วันที่ และลำดับการเรียง ดูรายละเอียด และส่งออก CSV
4. ใช้หน้ารายงานเพื่อดูชั่วโมงรายวันหรือรายเดือน ค้นหาบุคคล/รหัสร้าน และส่งออก Excel
5. ใช้หน้าการเงินเพื่อดูยอดตามช่วงเวลาและบุคคล แล้วส่งออกข้อมูลเมื่อจำเป็น
6. ใช้หน้ารายชื่อผู้ใช้เพื่อค้นหา เพิ่มหรือแก้ไขบัญชี จัดการบทบาท/สถานะ และรีเซ็ตรหัสผ่าน
7. ใช้หน้านำเข้ารายชื่อสำหรับ batch นำเข้านักศึกษา ดูหัวข้อ [รูปแบบ CSV สำหรับนำเข้า](#รูปแบบ-csv-สำหรับนำเข้ารายชื่อ)
8. ใช้หน้าการลาเพื่อดูรายการและไทม์ไลน์ของนักศึกษา โดยรายการเป็นข้อมูลเพื่อการตรวจสอบ ไม่ใช่รายการรออนุมัติ

### รูปแบบ CSV สำหรับนำเข้ารายชื่อ

หัวคอลัมน์ที่ต้องมี: `studentId`, `firstName`, `lastName`, `employeeCode`

หัวคอลัมน์เพิ่มเติมที่เลือกใส่ได้: `shopCode`, `gradeLevel`

```csv
studentId,firstName,lastName,employeeCode,shopCode,gradeLevel
68000001,สมชาย,ใจดี,EMP0001,SHOP01,3
```

- บันทึกเป็นไฟล์ `.csv`; รองรับ UTF-8 และ Windows-874 สำหรับไฟล์ภาษาไทย
- ขนาดไฟล์ไม่เกิน 1 MB และนำเข้าได้สูงสุด 500 รายชื่อในหนึ่งครั้ง
- ชื่อ/นามสกุลไม่เกิน 80 ตัวอักษร; รหัสนักศึกษา/รหัสพนักงาน/รหัสร้านไม่เกิน 40 ตัวอักษร; ชั้นปีถ้ามีต้องเป็นจำนวนเต็ม 1–20
- รหัสนักศึกษาและรหัสพนักงานต้องไม่ซ้ำกันทั้งภายในไฟล์และกับบัญชีในฐานข้อมูล
- หน้าเว็บแสดงผลตรวจแต่ละแถวก่อนกดยืนยัน หากพบแถวผิดพลาดต้องแก้ไฟล์แล้วเลือกใหม่
- username ของนักศึกษาที่นำเข้าคือ `studentId`; รหัสผ่านเริ่มต้นคือ `employeeCode` และระบบจัดเก็บเป็น Argon2id hash
- แจ้งรหัสเริ่มต้นให้ผู้ใช้เป็นการส่วนตัว ห้ามส่งรหัสผ่านเป็นกลุ่มสาธารณะหรือบันทึกไว้ใน log

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
| --- | --- |
| Framework / routing | Next.js 16 App Router |
| ภาษา | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Validation | Zod 4 |
| ฐานข้อมูล | PostgreSQL (ใช้กับ Supabase PostgreSQL ได้) |
| ORM | Prisma ORM 7, `@prisma/adapter-pg`, `pg` |
| รูปภาพ | Cloudinary |
| Password hashing | Argon2id |
| Unit tests | Node.js test runner (`node:test`) |

## ข้อกำหนดและการติดตั้งสำหรับนักพัฒนา

### สิ่งที่ต้องเตรียม

- Node.js 24.x แนะนำ (เป็นรุ่นที่โครงการใช้ตรวจสอบ)
- npm และ Git
- PostgreSQL ที่เข้าถึงได้จากเครื่องพัฒนา เช่น Supabase
- Cloudinary account สำหรับทดสอบเช็กอิน/เช็กเอาท์พร้อมภาพ

### ติดตั้งในเครื่อง

```bash
git clone <repository-url>
cd panyapiwat-time-attendance
```

คัดลอกไฟล์ตัวอย่าง environment ไปไว้ที่ root ของ repository:

```powershell
Copy-Item .env.example .env
```

หรือ macOS/Linux:

```bash
cp .env.example .env
```

แก้ `.env` ด้วยค่า `DATABASE_URL` และ Cloudinary ของสภาพแวดล้อมที่ต้องการใช้ จากนั้นติดตั้ง dependencies:

```bash
npm ci
```

สคริปต์ `postinstall` ของโครงการจะ generate Prisma Client ให้อัตโนมัติ; หากต้องการสั่งเองหรือสร้างใหม่ ใช้:

```bash
npx prisma generate
```

ติดตั้ง migration ที่มีใน repository:

```bash
npx prisma migrate deploy
```

สั่งเริ่ม development server:

```bash
npm run dev
```

เปิด `http://localhost:3000` (หรือ port ที่ Next.js แจ้งหาก port 3000 ถูกใช้งาน)

> ขั้นตอน `migrate deploy` ใช้กับฐานข้อมูลว่างหรือฐานข้อมูลที่ migration history ตรงกับ repository เท่านั้น หากฐานข้อมูลมีข้อมูลอยู่แล้ว ให้ตรวจ `npx prisma migrate status` และสำรองข้อมูลก่อน ห้ามใช้ `prisma migrate reset` กับฐานข้อมูลที่ต้องเก็บข้อมูล

### คำสั่งที่ใช้บ่อย

| คำสั่ง | จุดประสงค์ |
| --- | --- |
| `npm run dev` | เริ่ม development server |
| `npm run build` | Generate Prisma Client และ build แอปสำหรับ production |
| `npm run start` | เริ่ม production server หลัง build แล้ว |
| `npm run lint` | ตรวจ ESLint |
| `npx tsc --noEmit` | ตรวจ TypeScript โดยไม่สร้าง output |
| `npm test` | รัน unit tests |
| `npx prisma generate` | Generate Prisma Client ไปที่ `app/generated/prisma` |
| `npx prisma migrate status` | ตรวจ migration status |
| `npx prisma migrate dev --name <ชื่อ>` | สร้างและ apply migration ใน development |
| `npx prisma migrate deploy` | Apply migration ที่ commit แล้วใน environment เป้าหมาย |

ใช้ `migrate dev` เฉพาะฐานข้อมูล development สำหรับสร้าง migration ใหม่ ตรวจไฟล์ SQL ใน migration และทดสอบก่อน commit ทั้ง `schema.prisma` และ migration ที่สร้างขึ้น การ deploy ใช้ `migrate deploy`; ไม่แก้ migration ที่นำขึ้น production ไปแล้ว ให้เพิ่ม migration ใหม่แทน

## ตัวแปรแวดล้อม

ไฟล์ `.env.example` เป็นรายการตัวแปรที่โครงการใช้ ห้ามใส่ค่าจริงลงใน README, source code, issue หรือ commit:

| ตัวแปร | จำเป็นเมื่อ | รายละเอียด |
| --- | --- | --- |
| `DATABASE_URL` | ทุก environment | PostgreSQL connection string ที่ Prisma CLI และ runtime ใช้ |
| `CLOUDINARY_CLOUD_NAME` | อัปโหลด/ลบภาพ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | อัปโหลด/ลบภาพ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | อัปโหลด/ลบภาพ | Cloudinary API secret |
| `CRON_SECRET` | เปิดใช้งาน image-retention cron | Secret สำหรับตรวจ `Authorization: Bearer ...` ของงานลบภาพ |
| `NODE_ENV` | กำหนดโดย Next.js/hosting | เมื่อเป็น `production` session cookie จะมี `Secure` |

ตัวอย่างด้านล่างเป็น **placeholder เท่านั้น** ให้แทนด้วยค่าจากผู้ให้บริการ:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CRON_SECRET="replace-with-a-long-random-secret"
```

`prisma7.config.ts` โหลด `dotenv/config` เพื่อให้ Prisma CLI อ่าน `.env`; Next.js ก็อ่าน `.env` จาก root ได้เช่นกัน ใน production ให้ตั้งค่าผ่าน environment/secret manager ของ hosting แทนการอัปโหลดไฟล์ `.env`. หากรหัสผ่านฐานข้อมูลมีอักขระพิเศษ ให้ URL-encode ใน connection string ตรวจสอบ SSL, network allowlist และชนิด connection/pooler ของ PostgreSQL provider ให้เหมาะกับแอปและ migration runner

`CRON_SECRET` แนะนำให้เป็น secret แบบสุ่มที่มี entropy สูง (อย่างน้อย 32 bytes) อย่าเปิด endpoint cron โดยไม่มี secret และอย่าใช้ค่าเดียวกับรหัสผ่านผู้ใช้หรือ `DATABASE_URL`

## ฐานข้อมูลและ Prisma

- Schema: [prisma/schema.prisma](./prisma/schema.prisma)
- Prisma config: [prisma7.config.ts](./prisma7.config.ts)
- Migrations: [prisma/migrations](./prisma/migrations)
- Client output: `app/generated/prisma` (generated output ไม่ควรแก้ด้วยมือ)
- Prisma runtime setup/adapter: [lib/db.ts](./lib/db.ts)

Prisma ORM 7 ใช้ PostgreSQL driver adapter (`PrismaPg`) และอ่าน connection string จาก `DATABASE_URL`. Schema ประกอบด้วยข้อมูลหลักดังนี้:

| Model | หน้าที่ |
| --- | --- |
| `User` | บัญชี นักศึกษา/เจ้าหน้าที่ ข้อมูลรหัส ร้าน และสถานะ |
| `Session` | hash ของ session token และเวลาหมดอายุ |
| `LoginAttempt` | ตัวนับการพยายามเข้าสู่ระบบเพื่อ rate limit |
| `Attendance` | วันทำงาน เวลาเข้า/ออก ภาพ หมายเหตุ และจำนวนนาที |
| `MoneyEntry` | รายการเงิน แยกทิศทาง `IN`/`OUT` และประเภท `CASH`/`TRUEMONEY` |
| `Leave` | ประเภทและช่วงวันที่ลา/วันหยุด |

`Attendance` มี unique constraint ที่ `(userId, workDate)` เพื่อป้องกันเช็กอินซ้ำในวันทำงานเดียวกัน ส่วน `MoneyEntry` จำกัดหนึ่งแถวต่อ attendance, direction และ money type ตาม schema ปัจจุบัน ความสัมพันธ์และ index ฉบับเต็มให้อ้างอิง schema โดยตรง

> ห้ามแก้ schema หรือเปลี่ยน API contract โดยไม่ตรวจความเข้ากันได้และขออนุมัติตามกระบวนการของโครงการ การเปลี่ยนฐานข้อมูลต้องมี migration พร้อมทดสอบข้อมูลเดิมและแผน rollback

## โครงสร้างโครงการและแนวทางพัฒนา

```text
app/
  page.tsx                       หน้าแรก
  login/                         หน้าเข้าสู่ระบบ
  student/                       หน้าและ dashboard ของนักศึกษา
  admin/                         หน้าและ dashboard ของเจ้าหน้าที่
  api/                           Next.js Route Handlers
  components/                    UI และ client components ที่ใช้ร่วมกัน
  generated/prisma/              Prisma Client ที่ generate
documents/                       เอกสาร API และการเก็บภาพ
lib/
  api.ts                         JSON response, error handling, origin guard
  auth.ts                        session cookie และ authentication
  db.ts                          Prisma Client/driver adapter
  page-auth.ts                   page guards ตาม role
  time.ts, format.ts             helper วันเวลา/รูปแบบข้อมูล
prisma/
  schema.prisma                  database schema
  migrations/                    migration history
repositories/                    Prisma queries และ persistence operations แยกตามโดเมน
services/                        business rules, calculations และ orchestration
validators/                      Zod schemas และ query validators
tests/                           unit tests
```

### รูปแบบการเปลี่ยนแปลงโค้ด

- **Route Handler (`app/api/**/route.ts`):** อ่าน request, ตรวจ origin สำหรับ mutation, ตรวจ session/role, parse input ด้วย Zod แล้วเรียก service; อย่าวาง business rule ไว้ใน route
- **Page (`app/**/page.tsx`):** ตรวจ role ผ่าน `requireAdminPage()`/`requireStudentPage()` ก่อนแสดงข้อมูล เรียก service ฝั่ง server สำหรับหน้าที่ต้องอ่านฐานข้อมูล
- **Service (`services/`):** วางกฎธุรกิจ การคำนวณ และ orchestration ของ use case; กำหนดเงื่อนไขและลำดับของ transaction โดยเรียก persistence operations ผ่าน repository
- **Repository (`repositories/`):** เป็นจุดเดียวสำหรับ Prisma queries และ transaction persistence; รับ/คืนข้อมูล ไม่รู้จัก HTTP หรือ `ApiError`
- **Validation (`validators/api.ts`):** ใช้ Zod ตรวจ request และ query; อย่าพึ่ง client-side validation อย่างเดียว
- **Shared code:** ใช้ `lib/auth.ts`, `lib/api.ts`, `lib/time.ts` และ logic/service เดิมก่อนสร้าง helper ซ้ำ
- **UI:** รักษา responsive layout, semantic `<button>`/`<a>`, label ที่ผูกกับ input, focus ring และมาตรฐานสี/spacing ของระบบ
- **Database:** service และ route ห้าม query Prisma โดยตรง; repository ใช้ Prisma Client ที่ `lib/db.ts` เตรียมไว้ และห้ามสร้าง client แยกต่อ request
- **ข้อกำหนด API:** รักษา path, access control, request/response format และกฎธุรกิจเดิมไว้เมื่อเพิ่มฟีเจอร์ หากเอกสารกับ implementation ไม่ตรง ให้ตรวจ route และถามผู้ดูแลก่อนเปลี่ยน contract

## เส้นทางหน้าเว็บ

### ทั่วไป

| Path | การใช้งาน |
| --- | --- |
| `/` | หน้าแนะนำระบบ; ปุ่มนำทางเปลี่ยนตาม session ที่เข้าสู่ระบบ |
| `/login?role=student` | เข้าสู่ระบบในบทบาทนักศึกษา |
| `/login?role=admin` | เข้าสู่ระบบในบทบาทเจ้าหน้าที่ |

### นักศึกษา

| Path | การใช้งาน |
| --- | --- |
| `/student` | แดชบอร์ด สถานะวันนี้ สรุปเวลา/เงิน และข้อมูลล่าสุด |
| `/student/check-in` | เช็กอินหรือเช็กเอาท์ พร้อมภาพและข้อมูลเงิน |
| `/student/attendance` | ประวัติการลงเวลาและสรุปรายเดือน |
| `/student/money` | รายการเงินส่วนตัวและยอดแยกตามเดือน |
| `/student/leaves?tab=holiday` | เลือกและดูวันหยุด |
| `/student/leaves?tab=leave` | แจ้งและดูประวัติลาป่วย/ลากิจ |

### เจ้าหน้าที่

| Path | การใช้งาน |
| --- | --- |
| `/admin` | ภาพรวมรายวันและตัวกรองร้าน/สถานะ |
| `/admin/attendance` | รายการลงเวลา ค้นหา ดูรายละเอียด และ export CSV |
| `/admin/reports` | รายงานชั่วโมงรายวัน/รายเดือนและ export Excel |
| `/admin/reports/{userId}` | รายละเอียดรายงานของบุคคล |
| `/admin/finance` | รายงานเงินรายวัน/รายเดือน |
| `/admin/finance/{userId}` | รายละเอียดรายงานเงินรายบุคคล |
| `/admin/users` | ค้นหาและจัดการบัญชี |
| `/admin/import` | ตรวจและนำเข้ารายชื่อจาก CSV |
| `/admin/leaves` | ดูรายการ/ไทม์ไลน์การลาและวันหยุด |

## API

API อยู่ใน `app/api/`; ตารางนี้สรุปเส้นทางหลักจาก route handlers ใน repository:

### Authentication และโปรไฟล์

| Method | Endpoint | Access | รายละเอียด |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | ตรวจ username/password และสร้าง session |
| `POST` | `/api/auth/logout` | Public (session optional) | ลบ session และ cookie |
| `POST` | `/api/auth/register` | Public | ปิดการสมัครเอง ตอบ `410 REGISTRATION_DISABLED` |
| `GET` | `/api/users/me` | Authenticated | ดูข้อมูลบัญชีของตนเอง |
| `PATCH` | `/api/users/me` | Authenticated | แก้ข้อมูลโปรไฟล์ที่อนุญาต |

### นักศึกษา

| Method | Endpoint | Access | รายละเอียด |
| --- | --- | --- | --- |
| `POST` | `/api/attendance/check-in` | `STUDENT` | เช็กอินพร้อมภาพและเงินเข้า |
| `POST` | `/api/attendance/check-out` | `STUDENT` | เช็กเอาท์พร้อมภาพและเงินออก |
| `GET` | `/api/attendance/me` | `STUDENT` | ประวัติการลงเวลาแบบแบ่งหน้า |
| `GET` | `/api/attendance/me/today` | `STUDENT` | สถานะวันนี้ |
| `GET` | `/api/attendance/me/{id}` | `STUDENT` | รายละเอียดรายการของตนเอง |
| `GET` | `/api/attendance/me/monthly-summary` | `STUDENT` | สรุปการลงเวลารายเดือน |
| `GET` | `/api/money-tracker/me` | `STUDENT` | รายการและยอดเงินของตนเอง |
| `POST` | `/api/leaves` | `STUDENT` | สร้างรายการลา/วันหยุด |
| `GET` | `/api/leaves/me` | `STUDENT` | ดูรายการของตนเอง |
| `GET`, `PATCH`, `DELETE` | `/api/leaves/me/{id}` | `STUDENT` | อ่าน แก้ไข หรือลบรายการของตนเอง |

### เจ้าหน้าที่

| Method | Endpoint | Access | รายละเอียด |
| --- | --- | --- | --- |
| `GET` | `/api/admin/attendance` | `ADMIN` | ค้นหา/กรองรายการลงเวลา |
| `GET` | `/api/admin/attendance/{id}` | `ADMIN` | รายละเอียดรายการลงเวลา |
| `GET` | `/api/admin/attendance/user/{userId}` | `ADMIN` | ประวัติลงเวลารายบุคคล |
| `GET` | `/api/admin/reports/monthly-attendance` | `ADMIN` | สรุปชั่วโมงรายเดือน |
| `GET` | `/api/admin/reports/money-tracker` | `ADMIN` | รายงานรายการเงิน |
| `GET` | `/api/admin/leaves` | `ADMIN` | รายการลาและวันหยุด |
| `GET`, `POST` | `/api/admin/users` | `ADMIN` | ค้นหาและสร้างบัญชี |
| `GET`, `PATCH`, `DELETE` | `/api/admin/users/{id}` | `ADMIN` | อ่าน แก้ไข หรือลบบัญชีตามเงื่อนไข |
| `PATCH` | `/api/admin/users/{id}/role` | `ADMIN` | เปลี่ยนบทบาท |
| `POST` | `/api/admin/users/{id}/reset-password` | `ADMIN` | รีเซ็ตรหัสผ่านกลับเป็นรหัสเริ่มต้น |
| `POST` | `/api/admin/users/import` | `ADMIN` | นำเข้ารายชื่อนักศึกษาเป็น batch |

### Query, pagination และ response

- หน้าที่รองรับการแบ่งหน้ามักใช้ `page` (เริ่มที่ 1) และ `pageSize` (ค่าเริ่มต้น 20, จำกัดสูงสุด 100); ตรวจ schema ของ endpoint สำหรับข้อยกเว้น
- ตัวกรองเดือนใช้ `month=1..12&year=2000..2200` และตีความวันทำงานตามเวลาไทย
- รายการ ADMIN รองรับตัวกรองตาม endpoint เช่น `q`, `shopCode`, `date`, `type`, `status`, `userId`
- success payload ปัจจุบันเป็น JSON ตาม endpoint (เช่น `{ user }`, `{ items, pagination }` หรือ `{ importedCount }`) ไม่ควรสมมติว่าทุกเส้นมี wrapper เดียวกัน
- error จาก helper กลางอยู่ในรูป `{ "error": { "code": "...", "message": "...", "details": ... } }`; response ที่เป็นข้อมูลส่วนตัวตั้ง `Cache-Control: no-store`
- งาน cron ลบภาพเป็นข้อยกเว้นที่ตอบ `{ ok, data }` เมื่อสำเร็จ และ `{ ok: false, error }` เมื่อผิดพลาด
- POST/PATCH/DELETE ที่แก้ข้อมูลต้องส่ง `Origin` ให้ host ตรงกับ request เพื่อป้องกัน CSRF; browser ส่งให้โดยปกติ
- API ที่ต้อง login ใช้ cookie session; ถ้าเรียกผ่าน Postman ให้ login ก่อน เก็บ cookie jar และส่ง `Origin: http://localhost:3000` สำหรับ mutation

ดูตัวอย่างและรายละเอียดเพิ่มเติมใน [documents/API_DOCUMENTATION.md](./documents/API_DOCUMENTATION.md) และ [documents/API.md](./documents/API.md) ทั้งนี้ให้ยึด route/validator/service ปัจจุบันเมื่อพบความแตกต่างกับเอกสาร

## การทดสอบและตรวจสอบ

รันคำสั่งหลักก่อนส่งการเปลี่ยนแปลง:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Unit tests อยู่ที่ [tests/api-logic.test.mjs](./tests/api-logic.test.mjs) และครอบคลุม logic เช่น วันทำงาน Bangkok, ช่วงเดือน, สรุปชั่วโมง/เงิน, กฎเช็กเอาท์, validation การลา, CSV และการนำเข้ารายชื่อ การผ่าน unit tests ไม่ได้ยืนยันการเชื่อมต่อ PostgreSQL, Cloudinary หรือ browser flow จริง

ก่อน release ควรตรวจอย่างน้อย:

1. login/logout, cookie, การป้องกันหน้าและ API แยก role
2. import CSV ทั้งกรณีถูกต้อง ข้อมูลซ้ำ และไฟล์ผิดรูปแบบ
3. เช็กอิน/เช็กเอาท์ซ้ำและลำดับผิด พร้อม upload ภาพจริงใน environment ทดสอบ
4. จำนวนเงิน, สรุปรายวัน/เดือน และ exports
5. การลา/วันหยุดและการแบ่งหน้ารายการ
6. เมื่อ PostgreSQL, Cloudinary หรือ cron ใช้งานไม่ได้

## Deploy และงานตามกำหนดเวลา

### Deploy แอป

1. สร้าง PostgreSQL แยกสำหรับ production; เปิด backup/PITR ตามนโยบายข้อมูล
2. ตั้ง environment variables ผ่าน secret manager ของ hosting
3. ใช้ Node.js runtime (ไม่ใช่ Edge runtime สำหรับ Prisma/`pg`/`argon2`)
4. ติดตั้ง dependency แบบ reproducible ด้วย `npm ci`
5. ใน pipeline ให้ generate และ build:

   ```bash
   npx prisma generate
   npm run build
   ```

6. ให้ release/migration runner เพียงหนึ่งตัว apply migration ที่ review แล้ว:

   ```bash
   npx prisma migrate deploy
   ```

7. เริ่มแอปด้วย `npm run start` หรือคำสั่งที่ hosting platform กำหนด
8. หลัง deploy ตรวจ health/log, เชื่อมต่อ DB, login, ลงเวลา และ upload ภาพ

การเริ่มต้น production ต้องมีบัญชี ADMIN ที่ provision อย่างปลอดภัยก่อน ไม่มี seed/bootstrap script ใน repository ปัจจุบัน และ route นำเข้ารายชื่อจำกัดไว้ให้ ADMIN เท่านั้น

### ลบภาพเช็กอิน/เช็กเอาท์ตามอายุ

- กำหนด cron ใน [vercel.json](./vercel.json): `GET /api/cron/expire-attendance-images` เวลา 17:00 UTC ทุกวัน (เที่ยงคืนเวลาไทย)
- ตั้ง `CRON_SECRET` ใน Vercel Environment Variables; Vercel ส่งเป็น `Authorization: Bearer <CRON_SECRET>`
- endpoint ตรวจ secret ด้วย constant-time comparison; หากไม่ได้กำหนดหรือไม่ตรงจะตอบ `401`
- ระบบซ่อน URL ภาพจากการอ่านข้อมูลเมื่ออายุเกิน 7 วัน และ cron ลบ asset ใน Cloudinary ก่อนล้าง URL/public ID ในฐานข้อมูล
- งานประมวลผลเป็น batch; หากมีภาพมากกว่าขนาด batch จะทำต่อในรอบถัดไป รูปที่ลบไม่สำเร็จยังคงข้อมูลไว้ให้ retry
- บันทึก/ตรวจสถานะ `deleted`, `failed`, `skippedWithoutPublicId`, `hasMore` จากผลลัพธ์ cron
- รายละเอียดและข้อจำกัดของ schedule อยู่ใน [documents/image-retention.md](./documents/image-retention.md)

## ความปลอดภัยและการดูแลข้อมูล

- session cookie ชื่อ `attendance_session`, HttpOnly, SameSite=Strict, อายุ 12 ชั่วโมง; เปิด `Secure` ใน production
- token ดิบไม่เก็บในฐานข้อมูล; เก็บเฉพาะ SHA-256 hash และ session ผูกกับผู้ใช้/เวลาหมดอายุ
- หน้าเว็บเรียกใช้ server-side page guards; API ตรวจ authentication และ role แยกทุก request
- login จำกัดการลองผิดตาม identifier (10 ครั้งในหน้าต่าง 15 นาที)
- password hash ด้วย Argon2id; ห้ามส่ง hash หรือ credential ใน response/log
- mutation ตรวจ Origin; ห้ามปิด guard เพื่อแก้ปัญหา client ให้แก้ request ให้เป็น same-origin
- ภาพยอมรับ JPEG/PNG/WebP เท่านั้น ขนาดไม่เกิน 5 MB และตรวจ file signature ก่อนอัปโหลด
- ใช้ `Cache-Control: no-store` กับ response ที่คืนข้อมูลส่วนตัว
- เก็บ secret ใน environment/secret manager เท่านั้น; จำกัดผู้เข้าถึงและหมุน secret เมื่อสงสัยว่ารั่ว
- ทดสอบ migration กับฐานข้อมูลสำรอง/ทดสอบก่อน production และมีแผน restore จาก backup
- ข้อมูลบัญชี การลงเวลา การเงิน และการลาต้องได้รับการเข้าถึงตามหน้าที่และนโยบายองค์กร

## แก้ปัญหาเบื้องต้น

| อาการ | จุดตรวจ |
| --- | --- |
| Prisma แจ้ง `DATABASE_URL is required` | ตรวจว่ามี `.env` ที่ root และชื่อตัวแปรสะกดถูกต้อง; Prisma config โหลด `.env` |
| ต่อ PostgreSQL/Supabase ไม่ได้ | ตรวจ host/port/password ที่ URL-encode แล้ว, SSL, network allowlist และ connection/pooler ที่เลือก |
| Prisma Client ไม่พบ module/ชนิดข้อมูล | รัน `npx prisma generate`; ตรวจ `app/generated/prisma` ถูกสร้างจาก schema ปัจจุบัน |
| หน้า/API แจ้ง migration หรือ column ไม่ตรง | รัน `npx prisma migrate status`; ใช้ migration ที่ commit แล้วกับ environment ที่ถูกต้อง ห้าม reset production |
| เช็กอิน/เช็กเอาท์ upload ไม่ได้ | ตรวจ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, ประเภทไฟล์ และขนาดไม่เกิน 5 MB |
| login สำเร็จแต่เข้าหน้าไม่ได้ | ตรวจว่าบัญชี active, role ตรงกับหน้า และ cookie ถูกส่งกลับ; ใน production ต้องใช้ HTTPS เพราะ cookie มี `Secure` |
| mutation API ตอบ `403 CSRF_REJECTED` | ส่ง request จาก origin เดียวกับแอป; สำหรับ Postman กำหนด `Origin` ให้ตรงกับ host |
| login ตอบ `429 RATE_LIMITED` | รอให้หน้าต่าง 15 นาทีหมดและตรวจ identifier/credential; หลีกเลี่ยงการลองซ้ำอัตโนมัติ |
| cron ลบภาพตอบ `401` | ตรวจ `CRON_SECRET` ใน hosting และ Authorization header; ห้ามเปิดเผย secret ใน log |

## เอกสารประกอบ

- [documents/API_DOCUMENTATION.md](./documents/API_DOCUMENTATION.md) — รายละเอียด endpoint และตัวอย่าง API
- [documents/API.md](./documents/API.md) — สรุปเส้นทางและการเรียกใช้งาน API
- [documents/image-retention.md](./documents/image-retention.md) — นโยบายและรายละเอียดการหมดอายุภาพ
- [prisma/schema.prisma](./prisma/schema.prisma) — data model
- [prisma/migrations](./prisma/migrations) — ประวัติ schema migration
- [tests/api-logic.test.mjs](./tests/api-logic.test.mjs) — unit tests
