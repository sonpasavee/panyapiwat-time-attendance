# ระบบบันทึกการฝึกอาชีพ (Panyapiwat Time Attendance)

ระบบเว็บสำหรับบันทึกเวลาเข้า–ออกงาน (เช็กอิน/เช็กเอาท์) พร้อมรูปถ่าย บันทึกเงินส่วนตัว และแจ้งการลา/วันหยุดของผู้ฝึกอาชีพ พร้อมเครื่องมือสำหรับเจ้าหน้าที่ในการจัดการบัญชี ตรวจสอบการลงเวลา และออกรายงาน

- **วัตถุประสงค์:** แทนการจดบันทึกเวลาลงกระดาษ ให้ศูนย์การเรียนปัญญาภิวัฒน์ขอนแก่นตรวจสอบการลงเวลาประมาณ 250 คนได้จากที่เดียว และส่งออกรายงานได้ทันที
- **ผู้ใช้งาน:** ผู้ฝึกอาชีพ (บทบาท `STUDENT`) และเจ้าหน้าที่ผู้ดูแลระบบ (บทบาท `ADMIN`)
- **Repository:** <https://github.com/sonpasavee/panyapiwat-time-attendance>
- **เอกสาร API:** [documents/openapi.yaml](./documents/openapi.yaml) และ Swagger UI ที่ `/api-docs`

> **สถานะโปรเจกต์:** อยู่ในระหว่างการพัฒนาและทยอยเพิ่มความสามารถ (ดู `git log` ประกอบ) — ยังไม่มีการยืนยันความพร้อมระดับ Production เอกสารนี้เขียนจากการตรวจ Source Code, Configuration, Migration และการรันคำสั่งจริง ณ วันที่ 20 ตุลาคม 2026
>
> ยังไม่มีไฟล์ `LICENSE`, ไม่มี CI Workflow และไม่มีสคริปต์ Seed/Bootstrap ผู้ดูแลระบบคนแรก รวมถึงยังไม่มีไฟล์ Screenshot หรือ Live Demo URL ที่ยืนยันได้ใน repository โปรดอ่าน [License และ Credit](#license-และ-credit) และ [ข้อจำกัดที่ทราบ](#ข้อจำกัดที่ทราบ)

## สารบัญ

- [ภาพรวมโปรเจกต์](#ภาพรวมโปรเจกต์)
- [ฟีเจอร์](#ฟีเจอร์)
- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [สิ่งที่ต้องเตรียมก่อนเริ่มพัฒนา](#สิ่งที่ต้องเตรียมก่อนเริ่มพัฒนา)
- [ติดตั้งและรันในเครื่อง](#ติดตั้งและรันในเครื่อง)
- [ตัวแปรแวดล้อม](#ตัวแปรแวดล้อม)
- [สถาปัตยกรรมและการไหลของ Request](#สถาปัตยกรรมและการไหลของ-request)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [ฐานข้อมูลและ Prisma](#ฐานข้อมูลและ-prisma)
- [คู่มือการใช้งานตามบทบาท](#คู่มือการใช้งานตามบทบาท)
- [เอกสาร API](#เอกสาร-api)
- [ความปลอดภัย](#ความปลอดภัย)
- [Scripts และคำสั่งสำหรับนักพัฒนา](#scripts-และคำสั่งสำหรับนักพัฒนา)
- [การทดสอบและตรวจสอบคุณภาพ](#การทดสอบและตรวจสอบคุณภาพ)
- [การ Deploy](#การ-deploy)
- [แก้ปัญหาเบื้องต้น](#แก้ปัญหาเบื้องต้น)
- [แนวทางการพัฒนา](#แนวทางการพัฒนา)
- [การมีส่วนร่วม](#การมีส่วนร่วม)
- [License และ Credit](#license-และ-credit)
- [ดัชนีเอกสาร](#ดัชนีเอกสาร)

---

## ภาพรวมโปรเจกต์

### ปัญหาที่แก้

ผู้ฝึกอาชีพต้องบันทึกเวลาเข้า–ออกงาน เงินที่นำเข้าออก และการลาให้ศูนย์การเรียนตรวจสอบได้ การจดบันทึกลงกระดาษหรือไฟล์แยกกันทำให้ตรวจย้อนหลังและสรุปรายเดือนยาก ระบบนี้รวมทั้งหมดไว้ที่เดียว โดยยึด **วันทำงานตามเขตเวลา `Asia/Bangkok`** และบังคับรูปถ่ายยืนยันตอนเช็กอิน/เช็กเอาท์

### บทบาทผู้ใช้และขอบเขตสิทธิ์

| บทบาท | กลุ่มผู้ใช้ | ขอบเขตสิทธิ์โดยสรุป |
| --- | --- | --- |
| `STUDENT` | บัญชีนักศึกษา/ผู้ฝึกอาชีพ (นำเข้าเป็นชุดโดย ADMIN) | เช็กอิน/เช็กเอาท์ของตัวเอง ดูประวัติและเงินของตัวเอง แจ้งลา/วันหยุดของตัวเองเท่านั้น |
| `ADMIN` | เจ้าหน้าที่ศูนย์การเรียน | ดูข้อมูลทุกคน จัดการบัญชี นำเข้ารายชื่อ ออกรายงานและ export |

ระบบตรวจสิทธิ์สองชั้น: **หน้าเว็บ** ใช้ `requireStudentPage()` / `requireAdminPage()` (`lib/page-auth.ts`) และ **API** ใช้ `requireUser(role)` (`lib/auth.ts`) โดยเทียบ role แบบตรงตัว ไม่มีลำดับชั้น (ADMIN เรียกเส้นของ STUDENT ไม่ได้)

### กฎธุรกิจหลัก (ยึดจาก Implementation)

- นักศึกษาหนึ่งคน **เช็กอินได้ 1 ครั้งต่อวันทำงาน** (unique `Attendance(userId, workDate)`) และ **เช็กเอาท์ได้ 1 ครั้ง** หลังเช็กอินของวันนั้น
- **เงินเข้า 1 ชุดตอนเช็กอิน** และ **เงินออก 1 ชุดตอนเช็กเอาท์** แยกเป็น `CASH` และ `TRUEMONEY` (กรอกได้ทั้งสองประเภท; ต้องกรอกอย่างน้อยหนึ่งช่องต่อครั้ง)
- **การลา/วันหยุดไม่ต้องอนุมัติ** (`HOLIDAY`, `SICK`, `PERSONAL`) ใช้เป็นประวัติเพื่อการตรวจสอบ
- **ไม่มี self-register** — บัญชีทั้งหมดสร้างโดย ADMIN (นำเข้าจาก CSV หรือสร้างทีละบัญชี)
- วินาที/นาทีทำงาน = `checkOutAt − checkInAt` **ไม่หักเวลาพัก**
- รูปเช็กอิน/เช็กเอาท์ถูก **ซ่อนเมื่ออายุเกิน 7 วัน** และงาน cron จะลบไฟล์จริงบน Cloudinary ทุกวัน

### ข้อจำกัดที่ทราบ

- ไม่มี workflow อนุมัติการลา, ไม่มีระบบแจ้งเตือน (อีเมล/LINE), ไม่มี audit log และไม่มีโหมดออฟไลน์
- ปัจจุบันไม่มีสคริปต์ seed/bootstrap สำหรับสร้าง **ADMIN คนแรก** (ดู [ฐานข้อมูลและ Prisma](#ฐานข้อมูลและ-prisma))
- `documents/image-retention.md` ระบุว่า Vercel Hobby เรียก cron ได้วันละ 1 ครั้ง (และอาจเรียกภายในชั่วโมงที่ตั้งไว้) รูปที่หมดอายุแล้วจึงอาจค้างบน Cloudinary ได้อีกไม่เกิน 1 วัน แม้แอปจะซ่อนไปแล้ว
- ยังไม่มี end-to-end test; การทดสอบอัตโนมัติมีเฉพาะ unit test ของ logic
- การลาตรวจช่วงวันที่ทับซ้อนกันไม่ได้ (ไม่มี validation เรื่อง overlap) — ระบบบันทึกตามที่ผู้ใช้กรอก
- สเปก OpenAPI และ Swagger UI ต้องอัปเดตด้วยมือเมื่อแก้ endpoint — โปรเจกต์ยังไม่มี CI ตรวจความสอดคล้องระหว่างสเปกกับโค้ด

---

## ฟีเจอร์

### ผู้ฝึกอาชีพ (STUDENT)

| ฟีเจอร์ | วัตถุประสงค์ | ความสามารถหลัก | ข้อจำกัด |
| --- | --- | --- | --- |
| เข้าสู่ระบบ | ยืนยันตัวตนก่อนบันทึกเวลา | เข้าที่ `/login?role=student` ด้วยรหัสนักศึกษา (หรือ username) และรหัสผ่านที่เจ้าหน้าที่ให้ | ไม่มี self-register และไม่มีหน้าลืมรหัสผ่าน ต้องให้ ADMIN reset |
| แดชบอร์ด | สรุปสถานะวันนี้แบบเห็นทันที | การ์ดสถานะวันนี้, นาฬิกาจับเวลาทำงาน (`work-timer`), ไทม์ไลน์เข้า–ออก, ฟอร์มเช็กอิน/เช็กเอาท์แบบ inline, สรุปเงิน และ 10 รายการล่าสุด | แสดงเฉพาะข้อมูลของตัวเอง |
| เช็กอิน / เช็กเอาท์ | บันทึกเวลาเข้า–ออกพร้อมหลักฐาน | อัปโหลดรูป (JPEG/PNG/WebP ≤ 5 MB) + กรอกเงินสด/TrueMoney + หมายเหตุ, ไทม์ไลน์วันนี้, รูปยืนยัน, ตารางสรุปเงินวันนี้ | เช็กอินวันละ 1 ครั้ง; เช็กเอาท์ก่อนเช็กอินไม่ได้; รูปถูกซ่อนหลัง 7 วัน |
| ประวัติลงเวลา | ตรวจย้อนหลังและสรุปชั่วโมง | เลือกเดือน/ปี (ค่าเริ่มต้นเดือนปัจจุบัน), การ์ดสรุปชั่วโมง/จำนวนวัน, รายการต่อวันพร้อมเงินของวันนั้น, แบ่งหน้า | ชั่วโมงรวมนับเฉพาะกะที่เช็กเอาท์แล้วและคิดจากรายการสูงสุด 500 รายการแรกของเดือน; ไม่หักพัก |
| เงินส่วนตัว | ติดตามเงินที่นำเข้าและใช้ไป | เลือกเดือน/ปี, สรุปยอดเอาเข้า–ใช้ไปของเดือน, จำนวนวันที่ข้อมูลครบ, รายการรายวัน (เอาเข้า/คงเหลือ/ใช้ไป) และไฮไลต์ "เงินเพิ่ม" เมื่อใช้ไปติดลบ | ยอดใช้ไปรวมเฉพาะวันที่ข้อมูลครบ; ไม่มีการแก้ไขรายการย้อนหลังผ่าน UI |
| การลาและวันหยุด | บันทึกการลา/วันหยุดของตัวเอง | แท็บ "วันหยุด" และ "การลา", เลือกช่วงวันที่, ใส่เหตุผล, แก้ไข/ลบรายการของตัวเอง, สถิติรายปี | ไม่มีการอนุมัติ; `HOLIDAY` และ `SICK`/`PERSONAL` อยู่ในตารางเดียวกันแต่แยกแท็บ |
| เปลี่ยนรหัสผ่าน | เปลี่ยนรหัสผ่านของตัวเอง | หน้า `/account/password` ใส่รหัสเดิม + รหัสใหม่ (≥ 15 ตัวอักษร ต้องต่างจากเดิม) และเลือกได้ว่าจะ revoke session อื่นหรือทั้งหมด | ถ้าไม่รู้รหัสเดิมต้องให้ ADMIN reset ให้ |

### เจ้าหน้าที่ (ADMIN)

| ฟีเจอร์ | วัตถุประสงค์ | ความสามารถหลัก | ข้อจำกัด |
| --- | --- | --- | --- |
| ภาพรวมรายวัน | เห็นสถานะทั้งศูนย์ในหน้าเดียว | สรุปจำนวนคน, สถานะวันนี้ (ครบ/กำลังทำงาน/ลาป่วย/ลากิจ/วันหยุด/ยังไม่เช็กอิน), กรองรหัสร้านและสถานะ, ส่งออก CSV | ตัวเลขบางส่วนดึงจากชุดข้อมูลจำกัด (เช่น 1,000 รายการต่อรอบ) |
| การลงเวลา | ตรวจและค้นรายการลงเวลา | ค้นหาชื่อ/รหัส, กรองรหัสร้าน วันที่ สถานะ, เรียงลำดับ, ดูรายละเอียด, ส่งออก CSV, แบ่งหน้า | รูปที่เกิน 7 วันแสดงเป็น "รูปหมดอายุแล้ว" |
| รายงานชั่วโมง | สรุปชั่วโมงทำงานเพื่อตรวจสอบ | มุมมองรายวัน/รายเดือน, กรองรหัสร้าน/ค้นหา, หน้ารายบุคคล, ส่งออก Excel (`.xlsx`) ผ่าน modal | ค่าเริ่มต้นเป็นเดือน/วันปัจจุบัน; ไม่หักพัก |
| การเงิน | ตรวจเงินเข้า–ออกของนักศึกษา | มุมมองรายวัน/รายเดือน, กรองรหัสร้าน/ค้นหา, หน้ารายบุคคล, ส่งออก Excel | ยอดคำนวณจากรายการเงินที่ผูกกับ attendance ในเดือนที่เลือก |
| นักศึกษา (จัดการบัญชี) | จัดการบัญชีทั้งหมด | ค้นหา, กรองบทบาท/รหัสร้าน, เพิ่มบัญชี, แก้ไขโปรไฟล์, เปิด/ปิดใช้งาน, เปลี่ยนบทบาท, รีเซ็ตรหัสผ่าน (แสดงรหัสชั่วคราวให้แจ้งผู้ใช้), ลบ | ลบบัญชีที่มีประวัติลงเวลาหรือใบลาไม่ได้; ลบบัญชีตัวเองไม่ได้; ลดบทบาท ADMIN คนสุดท้ายหรือปิดใช้งานตัวเองไม่ได้ |
| นำเข้ารายชื่อ | สร้างบัญชีนักศึกษาเป็นชุด | อัปโหลด CSV (อ่านฝั่งเบราว์เซอร์), ตรวจข้อมูลทีละแถวก่อนยืนยัน, ส่ง JSON เป็น batch ให้ API | ไม่เกิน 500 แถวต่อครั้ง และไฟล์ไม่เกิน 1 MB; ถ้าพบรหัสซ้ำจะไม่สร้างทั้ง batch |
| การลา/วันหยุด | ตรวจการลาของนักศึกษา | ดูรายการและไทม์ไลน์, กรองประเภท/เดือน/ร้าน/บุคคล, ส่งออก CSV | เป็นข้อมูลเพื่อตรวจสอบ ไม่มีปุ่มอนุมัติ |

ไฟล์ที่เกี่ยวข้องกับ UI สำคัญ: `app/components/attendance-form.tsx`, `app/components/import-form.tsx`, `app/components/export-excel-modal.tsx`, `app/admin/users/users-manager.tsx`, `app/components/dashboard-shell.tsx`

---

## เทคโนโลยีที่ใช้

ตรวจจาก `package.json`, `package-lock.json` และไฟล์ Configuration จริง (เวอร์ชันที่ติดตั้งในเครื่องพัฒนา ณ วันที่จัดทำ)

| หมวด | เทคโนโลยี | เวอร์ชัน | ใช้ทำอะไร | อยู่ที่ไหน |
| --- | --- | --- | --- | --- |
| Frontend Framework | Next.js (App Router) | 16.4.0 | Server Components, Route Handlers, Build | `app/`, `next.config.ts` |
| ภาษา | TypeScript | 5.9.3 (devDependency `^5`) | Type safety ทั้งโปรเจกต์ | `tsconfig.json`, `**/*.ts(x)` |
| UI Runtime | React / React DOM | 19.3.0 | Rendering และ Client Components | `app/**` |
| Styling | Tailwind CSS + `@tailwindcss/turbopack` | `^4` | Utility CSS และ loader สำหรับ Turbopack | `app/globals.css`, `next.config.ts` |
| ฟอนต์ | `next/font/google` (Prompt) | — | ฟอนต์ไทย/ละตินของทั้งระบบ | `app/layout.tsx` |
| Backend / API | Next.js Route Handlers | 16.4.0 | REST API ภายใต้ `app/api/**` | `app/api/**/route.ts` |
| Validation | Zod | `^4.6.7` | ตรวจ body/query/path และแปลงชนิดข้อมูล | `validators/api.ts` |
| ORM | Prisma ORM | 7.10.0 | Schema, Migration, Query | `prisma/`, `repositories/` |
| Prisma Driver Adapter | `@prisma/adapter-pg` + `pg` | `^7.10.0`, `^8.23.1` | เชื่อม PostgreSQL ผ่าน `PrismaPg` | `lib/db.ts` |
| ฐานข้อมูล | PostgreSQL | ไม่ระบุในโค้ด — ตรวจเวอร์ชันจาก provider ที่ใช้งาน | เก็บข้อมูลผู้ใช้ เวลา เงิน และการลา | `prisma/schema.prisma` |
| Authentication | Session cookie + Argon2id + SHA-256 | `argon2 ^0.45.1` | Login, session, password hashing | `lib/auth.ts`, `services/auth.service.ts` |
| File Storage | Cloudinary | `^2.11.0` | เก็บรูปเช็กอิน/เช็กเอาท์ | `lib/cloudinary.ts` |
| Export | SheetJS `xlsx` | `^0.18.5` | สร้างไฟล์ Excel ฝั่ง client | `app/components/export-excel-modal.tsx` |
| Testing | Node.js built-in test runner | Node 24 | Unit test ของ logic/validator | `tests/api-logic.test.mjs` |
| Lint | ESLint + `eslint-config-next` | `^9`, 16.4.0 | ตรวจคุณภาพโค้ด | `eslint.config.mjs` |
| Env loading (CLI) | `dotenv` | `^17.4.2` | ให้ Prisma CLI อ่าน `.env` | `prisma7.config.ts` |
| Deployment | Vercel (Cron + Hosting) | — | Host แอปและตั้งเวลา cron | `vercel.json` |

> ตัวเลขเวอร์ชันด้านบนอ่านจาก `package.json` และผลของ `npx prisma -v` บนเครื่องพัฒนา ไม่ได้มาจากเอกสารภายนอก

---

## สิ่งที่ต้องเตรียมก่อนเริ่มพัฒนา

| สิ่งที่ต้องมี | รายละเอียด | ตรวจสอบด้วย |
| --- | --- | --- |
| Node.js | โปรเจกต์ไม่มีฟิลด์ `engines` ใน `package.json`; เครื่องที่ใช้พัฒนาและรันทดสอบคือ **Node v24.14.1** แนะนำใช้ Node 24.x ให้ตรงกัน | `node --version` |
| npm | ใช้ `npm ci` ตาม `package-lock.json` (เครื่องที่ตรวจใช้ npm 11.11.0) | `npm --version` |
| Git | โคลนและจัดการเวอร์ชัน | `git --version` |
| PostgreSQL | ฐานข้อมูลที่เชื่อมได้จากเครื่องพัฒนา (ใช้ Supabase PostgreSQL ได้) ต้องมีสิทธิ์สร้างตารางสำหรับ migration | connection string จากผู้ให้บริการ |
| บัญชี Cloudinary | ใช้ทดสอบอัปโหลด/ลบรูปจริง | Cloudinary Dashboard |
| เครื่องมืออื่น | ไม่จำเป็นต้องมี Prisma CLI แยก เพราะเรียกผ่าน `npx prisma` ได้จาก devDependency | — |

> **หมายเหตุ Windows:** หาก PowerShell บล็อกสคริปต์ (`npm.ps1 cannot be loaded because running scripts is disabled`) ให้เรียก `npm.cmd` และ `npx.cmd` แทน หรือเปิด Execution Policy ที่เหมาะสมกับเครื่อง (ไม่ควรปิดความปลอดภัยของระบบโดยรวม)

---

## ติดตั้งและรันในเครื่อง

ขั้นตอนด้านล่างเรียงตาม Dependency จริงของโปรเจกต์ (`postinstall` → `prisma generate`, การอ่าน `.env` ของ Prisma CLI, และลำดับการ apply migration)

### ขั้นตอนที่ 1: โคลน Repository

```bash
git clone https://github.com/sonpasavee/panyapiwat-time-attendance.git
```

### ขั้นตอนที่ 2: เข้าโฟลเดอร์โปรเจกต์

```bash
cd panyapiwat-time-attendance
```

### ขั้นตอนที่ 3: ติดตั้ง Dependencies

```bash
npm ci
```

สคริปต์ `postinstall` (`prisma generate`) จะสร้าง Prisma Client ให้อัตโนมัติ — ถ้าต้องการสั่งเองภายหลัง:

```bash
npx prisma generate
```

### ขั้นตอนที่ 4: ตั้งค่า Environment Variables

คัดลอกไฟล์ตัวอย่างแล้วเติมค่าจริง (ดูรายละเอียดทุกตัวแปรที่ [ตัวแปรแวดล้อม](#ตัวแปรแวดล้อม)):

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

> `prisma7.config.ts` ใช้ `dotenv/config` ซึ่งอ่านไฟล์ **`.env`** เท่านั้น (ไม่ใช่ `.env.local`) จึงควรตั้งค่า `DATABASE_URL` ไว้ใน `.env` เพื่อให้ทั้ง Prisma CLI และ Next.js ใช้งานได้ตรงกัน

### ขั้นตอนที่ 5: เตรียมฐานข้อมูล

1. สร้างฐานข้อมูล PostgreSQL (หรือโปรเจกต์ Supabase)
2. คัดลอก connection string มาใส่ `DATABASE_URL`
3. ตรวจว่าเครื่องที่รัน migration เชื่อมต่อฐานข้อมูลได้ (network allowlist, SSL, และชนิด connection ที่รองรับการใช้ Prisma Migration)

> **ยังไม่มี Prisma Seed ในโปรเจกต์นี้** (`prisma/seed.ts` ไม่มี และ `package.json` ไม่มีสคริปต์ seed) ดูวิธีสร้าง ADMIN คนแรกที่ [ฐานข้อมูลและ Prisma](#ฐานข้อมูลและ-prisma)

### ขั้นตอนที่ 6: สร้าง Artifact ที่จำเป็น

```bash
npx prisma generate
```

ผลลัพธ์ถูกสร้างไว้ที่ `app/generated/prisma` (โฟลเดอร์นี้ถูก ignore ใน `.gitignore` จึงต้อง generate ใหม่ทุกครั้งหลังโคลน)

### ขั้นตอนที่ 7: Apply Database Migration

```bash
npx prisma migrate deploy
```

คำสั่งนี้ apply migration ที่มีอยู่ใน `prisma/migrations` ตามลำดับ ใช้ได้กับ **ฐานข้อมูลว่างหรือฐานข้อมูลที่ migration history ตรงกับ repository** เท่านั้น

### ขั้นตอนที่ 8: Seed ข้อมูลเริ่มต้น

**ไม่พบ Workflow Seed ที่รองรับในโปรเจกต์** — ระบบตั้งใจปิด self-register และไม่มี bootstrap ADMIN ต้องเตรียมผู้ดูแลระบบคนแรกตามกระบวนการของทีม (ดู [ฐานข้อมูลและ Prisma](#ฐานข้อมูลและ-prisma))

### ขั้นตอนที่ 9: เริ่ม Development Server

```bash
npm run dev
```

ค่าเริ่มต้นจะเปิดที่ <http://localhost:3000> (ถ้า port ถูกใช้ Next.js จะแจ้ง port ใหม่ใน terminal)

### ขั้นตอนที่ 10: ตรวจสอบว่าติดตั้งสำเร็จ

| ตรวจสอบ | วิธี |
| --- | --- |
| Server เริ่มทำงาน | terminal แสดง URL และไม่มี error ตอน compile |
| หน้าแรกเปิดได้ | เปิด `/` เห็นหน้าแนะนำระบบและปุ่ม "เข้าสู่ระบบ" |
| Prisma Client พร้อมใช้ | `npx prisma generate` ไม่ error และมีโฟลเดอร์ `app/generated/prisma` |
| ฐานข้อมูลตรงกับ repo | `npx prisma migrate status` ต้องไม่แจ้ง pending migration |
| Schema valid | `npx prisma validate` ตอบ `The schema at prisma\schema.prisma is valid` |
| Login ได้ | ต้องมีบัญชีที่สร้างไว้แล้วเท่านั้น (ไม่มี self-register) |
| เช็กอิน/เช็กเอาท์ได้ | ต้องตั้งค่า Cloudinary ครบทั้ง 3 ตัวแปรก่อน จึงจะอัปโหลดรูปได้ |

**สิ่งที่ผู้จัดทำเอกสารตรวจแล้ว:** รัน `npm test` (14/14 ผ่าน), `npx tsc --noEmit` (ผ่าน), `npm run lint` (0 error, 3 warning ที่มีอยู่เดิม), `npx prisma validate` (schema valid), `npx prisma -v` (โหลด config จาก `prisma7.config.ts`)

**สิ่งที่ยังไม่ได้ตรวจ:** `npm run build`, การเชื่อมต่อฐานข้อมูลจริง, การอัปโหลด Cloudinary จริง และการรัน cron (จะแตะข้อมูล/บริการภายนอก จึงไม่รันในงานเอกสารนี้)

---

## ตัวแปรแวดล้อม

รายการนี้ตรวจจาก `.env.example` และการอ้างอิง `process.env` ในโค้ด

| Variable | Required | Purpose | Example / Format | Where to Obtain |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | ใช่ (ทุก environment) | Connection string ที่ Prisma CLI และ runtime (`lib/db.ts`) ใช้เชื่อม PostgreSQL | `postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public` | PostgreSQL provider ของทีม (เช่น Supabase → Project Settings → Database) |
| `CLOUDINARY_CLOUD_NAME` | ใช่เมื่อใช้ฟีเจอร์รูป | Cloud name ของ Cloudinary | สตริงชื่อ cloud (ไม่ใช่ความลับระดับสูง แต่ไม่ควรเปิดเผยเกินจำเป็น) | Cloudinary Dashboard → Product Environment |
| `CLOUDINARY_API_KEY` | ใช่เมื่อใช้ฟีเจอร์รูป | API key สำหรับอัปโหลด/ลบรูป | ตัวเลข/สตริงจาก dashboard | Cloudinary Dashboard → API Keys |
| `CLOUDINARY_API_SECRET` | ใช่เมื่อใช้ฟีเจอร์รูป | API secret สำหรับอัปโหลด/ลบรูป | สตริงลับ | Cloudinary Dashboard → API Keys |
| `CRON_SECRET` | ใช่เมื่อเปิดใช้ cron ลบรูป | Secret สำหรับตรวจ `Authorization: Bearer <CRON_SECRET>` ของ `GET /api/cron/expire-attendance-images` | สุ่มอย่างน้อย 32 bytes | สร้างเอง (ดูด้านล่าง) หรือ secret manager ของ hosting |
| `NODE_ENV` | ไม่ต้องตั้งเองในเครื่อง | กำหนดโดย Next.js/hosting; เมื่อเป็น `production` cookie session จะมี `Secure` | `development` / `production` | ระบบกำหนด |

ตัวอย่างไฟล์ `.env` (ค่าด้านล่างเป็น **placeholder เท่านั้น** ห้ามใช้กับ Production):

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CRON_SECRET="replace-with-a-long-random-secret"
```

สร้าง `CRON_SECRET` แบบสุ่ม (ตรวจแล้วว่าใช้ได้กับ Node เวอร์ชันที่โปรเจกต์ใช้):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

```bash
# ทางเลือกด้วย OpenSSL
openssl rand -base64 48
```

ข้อควรระวัง:

- `.gitignore` ignore `.env*` ทั้งหมด ยกเว้น `.env.example` — ห้าม commit ค่าจริง
- Production ให้ตั้งค่าผ่าน secret manager ของ hosting ไม่ใช่การอัปโหลดไฟล์ `.env`
- หากรหัสผ่านฐานข้อมูลมีอักขระพิเศษ ต้อง URL-encode ใน `DATABASE_URL`
- ห้ามใช้ค่า `CRON_SECRET` ซ้ำกับรหัสผ่านผู้ใช้หรือ `DATABASE_URL`
- **ข้อสังเกต:** ไฟล์ `.env` บนเครื่องพัฒนามีตัวแปร `DIRECT_URL` ซึ่ง **ไม่ถูกอ้างอิงในโค้ดใด ๆ** และไม่มีใน `.env.example` จึงยังยืนยันไม่ได้ว่าจำเป็น — ถ้าใช้สำหรับเครื่องมือภายนอกควรมาระบุให้ชัด มิฉะนั้นควรพิจารณาลบเพื่อลดความสับสน

---

## สถาปัตยกรรมและการไหลของ Request

### ภาพรวม Layers

สถาปัตยกรรมยึดรูปแบบ route → service → repository โดยกำหนดไว้ใน `AGENTS.md` และสะท้อนในโค้ดจริง

```mermaid
flowchart TB
  subgraph Browser["เบราว์เซอร์"]
    UI["React 19 + Tailwind<br/>(Client Components)"]
  end

  subgraph Next["Next.js 16 App Router"]
    Page["Server Components<br/>app/**/page.tsx"]
    Guard["page-auth.ts<br/>requireStudentPage / requireAdminPage"]
    Route["Route Handlers<br/>app/api/**/route.ts"]
    Auth["lib/auth.ts<br/>session cookie + requireUser"]
    Api["lib/api.ts<br/>json / handleError / requireSameOrigin"]
    Val["validators/api.ts<br/>Zod schemas"]
    Svc["services/<br/>business rules + calculations"]
    Repo["repositories/<br/>Prisma queries"]
  end

  DB[("PostgreSQL")]
  CL["Cloudinary"]

  UI -->|"GET (navigation)"| Page
  Page --> Guard
  Guard --> Svc
  UI -->|"fetch JSON / multipart"| Route
  Route --> Api
  Route --> Auth
  Route --> Val
  Route --> Svc
  Svc --> Repo
  Svc -->|"upload / delete image"| CL
  Repo --> DB
```

### Request Lifecycle: การเขียนข้อมูล (ตัวอย่าง เช็กอิน)

1. ผู้ใช้กดปุ่มใน `app/components/attendance-form.tsx` แล้วส่ง `multipart/form-data` ไป `POST /api/attendance/check-in`
2. Route Handler เรียก `requireSameOrigin(request)` — ถ้าไม่มีหรือ `Origin` ไม่ตรงกับ host จะได้ `403 CSRF_REJECTED`
3. เรียก `requireUser("STUDENT")` — ถ้าไม่มี session ที่ยังไม่หมดอายุ / บทบาทไม่ตรง จะได้ `401` หรือ `403`
4. อ่าน `formData()` ตรวจว่ามีไฟล์ `image` แล้วให้ `attendanceFieldsSchema` (Zod) ตรวจ `cashAmount`, `truemoneyAmount`, `note`
5. `services/attendance.service.ts` อัปโหลดรูปขึ้น Cloudinary (`attendance/<userId>/check-in`) ตรวจ magic bytes และขนาดก่อนอัปโหลด
6. Repository สร้าง `Attendance` + `MoneyEntry` (ทิศทาง `IN`) ในคำสั่งเดียว
7. Route ตอบ `201` พร้อม `{ attendance, moneySummary }` ผ่าน `json()` ซึ่งติด header `Cache-Control: no-store`
8. ถ้าเกิด error ใด ๆ `handleError()` (`lib/api.ts`) แปลงเป็น `{ error: { code, message, details? } }` ให้รูปแบบเดียวกันทุกเส้น

### Request Lifecycle: การเปิดหน้าเว็บ

1. ผู้ใช้เปิด `/student` → `app/student/page.tsx` เรียก `requireStudentPage()` (`lib/page-auth.ts`)
2. ถ้าไม่มี session → redirect `/login?role=student`; ถ้าเป็น ADMIN → redirect `/admin`
3. หน้าที่ผ่าน guard จะเรียก service โดยตรงฝั่ง server (ไม่ผ่าน HTTP) เพื่ออ่านข้อมูล
4. หน้าเพจที่ต้องอ่านข้อมูลสดตั้ง `export const instant = false` (ค่า segment ของ Next.js 16) เพื่อไม่ให้ถูกมองเป็น instant navigation ที่ cache ได้

**Frontend:** Server Components เกือบทั้งหมดเรียก service ตรง; Client Components ใช้เฉพาะส่วนที่ต้องมีการโต้ตอบ (ฟอร์มเช็กอิน, นำเข้า CSV, export ไฟล์, เมนูมือถือ)
**ไม่มีการใช้ ORM ในหน้าเพจโดยตรง** — ทุกการเข้าถึงฐานข้อมูลอยู่ที่ `repositories/`

---

## โครงสร้างโปรเจกต์

```text
panyapiwat-time-attendance/
├── app/
│   ├── page.tsx                     หน้าแนะนำระบบ (landing)
│   ├── layout.tsx                   Root layout + ฟอนต์ Prompt + metadata
│   ├── globals.css                  Tailwind v4 + ตัวแปรสี/คอมโพเนนต์พื้นฐาน
│   ├── icon.svg                     favicon
│   ├── login/                       หน้าเข้าสู่ระบบ (แยก role ผ่าน query)
│   ├── account/password/            หน้าเปลี่ยนรหัสผ่าน
│   ├── student/                     หน้าผู้ฝึกอาชีพ (แดชบอร์ด, เช็กอิน, ประวัติ, เงิน, การลา)
│   ├── admin/                       หน้าผู้ดูแลระบบ (ภาพรวม, การลงเวลา, รายงาน, การเงิน, นักศึกษา, นำเข้า, การลา)
│   ├── components/                  UI และ client components ที่ใช้ร่วมกัน
│   ├── api-docs/                    หน้า Swagger UI (`/api-docs`) — โหลด asset จาก unpkg CDN
│   ├── api/                         Route Handlers ทั้งหมด
│   │   ├── auth/                    register, login, logout, change-password
│   │   ├── users/me/                โปรไฟล์ผู้ใช้ปัจจุบัน
│   │   ├── attendance/              check-in, check-out, me, me/today, me/{id}, me/monthly-summary
│   │   ├── money-tracker/me/        รายงานเงินส่วนตัวรายเดือน
│   │   ├── leaves/                  leaves, leaves/me, leaves/me/{id}
│   │   ├── admin/                   users, users/import, users/{id}, users/{id}/role, users/{id}/reset-password,
│   │   │                            attendance, attendance/{id}, attendance/user/{userId},
│   │   │                            leaves, reports/monthly-attendance, reports/money-tracker
│   │   ├── cron/expire-attendance-images/  งานลบรูปตามอายุ (ต้องมี CRON_SECRET)
│   │   └── openapi/                 เสิร์ฟ documents/openapi.yaml เป็น application/yaml
│   └── generated/prisma/            Prisma Client ที่ generate (gitignored — ห้ามแก้ด้วยมือ)
├── documents/
│   ├── openapi.yaml                 OpenAPI 3.1 specification (source of truth ของ API contract)
│   ├── API.md                       สรุปเส้นทาง API
│   ├── API_DOCUMENTATION.md         รายละเอียด endpoint + ผลการยิงทดสอบ
│   └── image-retention.md           นโยบายการหมดอายุ/ลบรูป
├── lib/
│   ├── api.ts                       json(), handleError(), ApiError, requireSameOrigin()
│   ├── auth.ts                      session cookie, requireUser(), hashing/verify password, rate limit
│   ├── db.ts                        Prisma Client + PrismaPg adapter (singleton)
│   ├── page-auth.ts                 page guards ตาม role
│   ├── cloudinary.ts                อัปโหลด/ลบรูป + ตรวจชนิดไฟล์และ magic bytes
│   ├── attendance-image-retention.ts ซ่อนรูปที่อายุเกิน 7 วัน
│   ├── csv-encoding.ts              ถอดรหัส CSV (UTF-8/BOM, UTF-16, Windows-874)
│   ├── time.ts                      Bangkok work date และ month range
│   └── format.ts                    จัดรูปแบบวันที่/เวลา/จำนวนเงินสำหรับ UI
├── prisma/
│   ├── schema.prisma                Data model (6 models + 4 enums)
│   └── migrations/                  Migration history (5 รายการ)
├── repositories/                    Prisma queries แยกตามโดเมน (auth, user, attendance, leave, money, reports, images)
├── services/                        กฎธุรกิจ การคำนวณ และ orchestration
├── validators/api.ts                Zod schemas ของ body/query ทั้งระบบ
├── tests/api-logic.test.mjs         Unit tests (14 tests)
├── public/                          Asset สาธารณะ (ไอคอน/โลโก้สำเร็จรูป)
├── prisma7.config.ts                Prisma CLI config (schema, migrations path, datasource url)
├── next.config.ts                   Turbopack + cacheComponents + partialPrefetching
├── eslint.config.mjs                ESLint (next core-web-vitals + typescript)
├── tsconfig.json                    TypeScript + path alias `@/*` → repository root
└── vercel.json                      ตั้งเวลา cron ลบรูป (17:00 UTC ทุกวัน)
```

**จุดที่ควรรู้ก่อนแก้โค้ด**

| ถ้าจะแก้เรื่อง | เริ่มที่ |
| --- | --- |
| Response/error form หรือ CSRF guard | `lib/api.ts` |
| Login, session, rate limit, hashing | `lib/auth.ts`, `services/auth.service.ts` |
| กฎเช็กอิน/เช็กเอาท์และเงิน | `services/attendance.service.ts`, `services/attendance.logic.ts` |
| การนำเข้ารายชื่อและรูปแบบ CSV | `app/components/import-form.tsx`, `services/student-import.service.ts`, `validators/api.ts` |
| การเก็บ/ลบรูป | `lib/cloudinary.ts`, `services/attendance-image-retention.service.ts`, `documents/image-retention.md` |
| Schema/ฐานข้อมูล | `prisma/schema.prisma`, `prisma/migrations/` |
| เอกสาร API | `documents/openapi.yaml` |

> โฟลเดอร์ `.agents/`, `.claude/`, `.windsurf/` และ `skills-lock.json` เป็นไฟล์ตั้งค่า/สกิลของเครื่องมือ AI ผู้ช่วย ไม่ได้ถูกใช้ตอน runtime ของแอป

---

## ฐานข้อมูลและ Prisma

### ภาพรวม

- **Engine:** PostgreSQL (schema กำหนด `provider = "postgresql"`) โปรเจกต์ไม่ pin เวอร์ชันเซิร์ฟเวอร์ในโค้ด
- **ORM:** Prisma ORM 7.10.0 ใช้ **driver adapter** (`@prisma/adapter-pg`) สร้าง client ที่ `lib/db.ts` และใช้ singleton ร่วมกันทั้งแอป
- **Client output:** `app/generated/prisma` (generator `prisma-client`) — ถูก ignore ใน git, ต้อง `prisma generate` ทุกครั้งหลังโคลน/เปลี่ยน schema
- **ไฟล์ที่เกี่ยวข้อง:** [`prisma/schema.prisma`](./prisma/schema.prisma), [`prisma7.config.ts`](./prisma7.config.ts), [`prisma/migrations/`](./prisma/migrations), [`lib/db.ts`](./lib/db.ts)
- **Config:** `prisma7.config.ts` ระบุ `schema`, `migrations.path` และ `datasource.url = process.env.DATABASE_URL` (Prisma CLI 7.10.0 โหลดไฟล์นี้จริง — ยืนยันจากผลของ `npx prisma -v`)

### Models และความสัมพันธ์

| Model | หน้าที่ | จุดสำคัญ |
| --- | --- | --- |
| `User` | บัญชีทุกบทบาท | `username` unique, `studentId`/`employeeCode` unique แบบ nullable, `role` default `STUDENT`, `isActive` default `true`, มีทั้ง `gradeLevel` และ `yearLevel` (ตั้งค่าเดียวกันตอนสร้าง/นำเข้า), index บน `role` |
| `Session` | Session ของผู้ใช้ | เก็บเฉพาะ `tokenHash` (SHA-256) unique, `expiresAt` เป็น `Timestamptz`, ลบตามผู้ใช้เมื่อลบ User (`onDelete: Cascade`) |
| `LoginAttempt` | ตัวนับการ login ผิด | ใช้ `key` (SHA-256 ของ identifier แบบ lowercase) เป็น primary key, เก็บ `count` และ `windowStartedAt` |
| `Attendance` | กะการทำงานต่อวัน | `workDate` เป็น `Date` ตามวันไทย, unique `(userId, workDate)`, index `workDate`, อ้าง `User` ด้วย `onDelete: Restrict` |
| `MoneyEntry` | รายการเงินของแต่ละกะ | `amount` เป็น `Decimal(10,2)`, แยก `direction` (`IN`/`OUT`) และ `moneyType` (`CASH`/`TRUEMONEY`), unique `(attendanceId, direction, moneyType)`, ลบตาม Attendance (`Cascade`) |
| `Leave` | ประวัติลา/วันหยุด | `type` (`HOLIDAY`/`SICK`/`PERSONAL`), `startDate`/`endDate` เป็น `Date`, `reason` nullable, index `(userId, startDate)`, อ้าง `User` ด้วย `Restrict` |
| Enum | `Role`, `MoneyType`, `MoneyDirection`, `LeaveType` | ค่าตายตัวตาม schema |

**Primary Key, Nullable และ Index**

- **Primary key:** ทุก model ใช้ `id String @id @default(uuid())` ยกเว้น `LoginAttempt` ที่ใช้ `key` เป็น primary key
- **ฟิลด์ nullable ที่สำคัญ:** `User.studentId`, `User.employeeCode`, `User.shopCode`, `User.gradeLevel`, `User.yearLevel`; `Attendance.checkOutAt`, `Attendance.workMinutes`, `Attendance.*PhotoUrl`, `Attendance.*ImagePublicId`, `Attendance.*Note`; `Leave.reason`
- **Unique:** `User.username`, `User.studentId`, `User.employeeCode`, `Session.tokenHash`, `Attendance(userId, workDate)`, `MoneyEntry(attendanceId, direction, moneyType)`
- **Index:** `User(role)`, `Session(userId, expiresAt)`, `Session(expiresAt)`, `Attendance(workDate)`, `Leave(userId, startDate)`

```mermaid
erDiagram
  User ||--o{ Attendance : "userId (onDelete: Restrict)"
  User ||--o{ Leave : "userId (onDelete: Restrict)"
  User ||--o{ Session : "userId (onDelete: Cascade)"
  Attendance ||--o{ MoneyEntry : "attendanceId (onDelete: Cascade)"

  User {
    string id PK
    string username UK
    string passwordHash
    string studentId UK
    string employeeCode UK
    Role role
    boolean isActive
  }
  Attendance {
    string id PK
    string userId FK
    date workDate
    timestamptz checkInAt
    timestamptz checkOutAt
    string checkInImagePublicId
    string checkOutImagePublicId
    int workMinutes
  }
  MoneyEntry {
    string id PK
    string attendanceId FK
    MoneyDirection direction
    decimal amount
    MoneyType moneyType
  }
  Leave {
    string id PK
    string userId FK
    LeaveType type
    date startDate
    date endDate
    string reason
  }
  Session {
    string id PK
    string tokenHash UK
    string userId FK
    timestamptz expiresAt
  }
  LoginAttempt {
    string key PK
    int count
    timestamptz windowStartedAt
  }
```

> ดูลำดับคอลัมน์/ชนิดข้อมูลเต็มได้ใน `prisma/schema.prisma` และ SQL จริงใน `prisma/migrations/*/migration.sql` (เอกสารนี้ไม่คัดลอก schema ทั้งไฟล์)

### Referential Actions และข้อควรระวัง

- `Attendance` และ `Leave` อ้าง `User` แบบ **`Restrict`** → ลบบัญชีที่มีประวัติไม่ได้ (และ service ตรวจซ้ำก่อนลบเพื่อตอบ `409 USER_HAS_RECORDS`)
- `MoneyEntry` และ `Session` เป็น **`Cascade`** → ลบ Attendance แล้วรายการเงินหายตาม; ลบ User แล้ว session หายตาม
- Migration `20261020120000_remove_unused_branch` ลบตาราง `Branch` และคอลัมน์ `User.branchId` ที่ไม่ใช้แล้ว (มี `IF EXISTS` จึงปลอดภัยกับฐานข้อมูลที่อัปเดตแล้ว)
- Migration `20261016090000_split_money_by_type` เปลี่ยน unique key ของ `MoneyEntry` ให้รองรับ cash + TrueMoney ในวันเดียว (ปลอดภัยกับข้อมูลเดิมตามที่ระบุในคอมเมนต์ของไฟล์)

### Migration Workflow

**Development (สร้าง migration ใหม่)**

```bash
# 1) แก้ prisma/schema.prisma
# 2) สร้าง + apply migration และ generate client
npx prisma migrate dev --name <ชื่ออธิบายการเปลี่ยนแปลง>
# 3) ตรวจ SQL ที่สร้างใน prisma/migrations/<timestamp>_<name>/migration.sql
# 4) ตรวจสถานะ
npx prisma migrate status
```

- `migrate dev` อาจ prompt ให้ reset ฐานข้อมูลเมื่อตรวจพบ drift — **ให้อ่านข้อความเตือนทุกครั้ง** และใช้เฉพาะกับฐานข้อมูล Development
- ถ้า migration ล้มเหลวกลางทาง ให้แก้สาเหตุแล้วใช้ `npx prisma migrate resolve --applied <migration>` เฉพาะกรณีที่ฐานข้อมูลถูกแก้ด้วยมือแล้วเท่านั้น (ควรปรึกษาผู้ดูแลก่อน)
- commit ทั้ง `schema.prisma` และโฟลเดอร์ migration ไปพร้อมกัน

**Production**

```bash
# ตรวจว่ามี migration ค้างและ schema ตรงกันก่อน deploy
npx prisma migrate status
# apply migration ที่ review แล้ว
npx prisma migrate deploy
```

1. สำรองฐานข้อมูล (หรือยืนยัน PITR ของ provider) ก่อน migration ที่แตะข้อมูล
2. Review ไฟล์ SQL ของ migration ทุกครั้ง — migration หลายรายการเป็น additive (`ADD COLUMN`, `CREATE TABLE`) แต่บางรายการเปลี่ยน constraint
3. รัน `migrate deploy` ด้วย runner เพียงตัวเดียว (ไม่รันพร้อมกันหลาย instance)
4. หลัง migration ตรวจ `migrate status`, ทดสอบ login/ลงเวลา/รายงาน แล้วเฝ้าดู log

### Prisma Client Generation

- รันอัตโนมัติจาก `postinstall` เมื่อ `npm ci`/`npm install`
- รัน `npm run build` จะทำ `prisma generate && next build` ให้เอง
- ต้องรันใหม่ทุกครั้งหลังเปลี่ยน `schema.prisma` หรือหลังโคลน/สลับ branch ที่มี schema ต่างกัน
- ห้ามแก้ไฟล์ใน `app/generated/prisma` ด้วยมือ — จะถูกเขียนทับ

### Database Seeding

**ไม่พบ Workflow Seed หรือ Bootstrap ที่รองรับในโปรเจกต์นี้**

- ไม่มี `prisma/seed.ts`, ไม่มีคีย์ `prisma.seed` และไม่มีสคริปต์ใน `package.json`
- ระบบปิด self-register (`POST /api/auth/register` ตอบ `410 REGISTRATION_DISABLED` เสมอ) จึงต้องมี **ADMIN คนแรก** จากกระบวนการของทีม เช่น เพิ่มผ่าน Prisma Studio (`npx prisma studio`) หรือ SQL ที่ review แล้ว โดย `passwordHash` ต้องเป็น Argon2id hash ของรหัสผ่านที่คาดเดายาก (ใช้รูปแบบเดียวกับ `hashPassword()` ใน `lib/auth.ts`) และ **ห้ามใช้รหัสผ่านค่าเริ่มต้นที่เดาง่าย**
- หลังมี ADMIN แล้ว การสร้างนักศึกษาจำนวนมากควรใช้หน้าจอ "นำเข้ารายชื่อ" หรือ `POST /api/admin/users/import` ซึ่งตั้งรหัสผ่านเริ่มต้นจาก `employeeCode`

### Reset และความปลอดภัยของข้อมูล

| คำสั่ง | ผลกระทบ | ใช้ได้กับ |
| --- | --- | --- |
| `npx prisma migrate deploy` | Apply migration ที่มีอยู่ ไม่ลบข้อมูล | Development และ Production |
| `npx prisma migrate dev` | อาจ reset ฐานข้อมูลถ้ามี drift | Development เท่านั้น |
| `npx prisma migrate reset` | **ลบข้อมูลทั้งฐานข้อมูล** แล้ว apply migration ใหม่ | Development เท่านั้น — **ห้ามใช้กับ Production/ฐานข้อมูลที่ต้องเก็บข้อมูล** |
| `npx prisma db push` | ดัน schema โดยไม่สร้าง migration history (ทำให้ประวัติไม่ตรง) | ไม่แนะนำในโปรเจกต์นี้ เพราะมีการใช้ migration history จริง |

**Recovery:** โปรเจกต์ไม่มีสคริปต์ backup ของตัวเอง ให้ใช้ backup/PITR ของ PostgreSQL provider (เช่น Supabase Automated Backups) และทดสอบ restore ในฐานข้อมูลแยกก่อนเสมอ

### Production Database Best Practices (สำหรับโปรเจกต์นี้)

- ใช้ฐานข้อมูล Production แยกจาก Development และไม่ใช้ credential เดียวกัน
- ตั้ง `DATABASE_URL` ผ่าน secret manager; อย่า commit `.env`
- สำรองข้อมูลก่อน migration ที่เปลี่ยน/ลบข้อมูล หรือเปลี่ยนชนิดคอลัมน์
- หลีกเลี่ยงการเปลี่ยน schema ที่ทำให้แอปเวอร์ชันเก่าที่กำลังรันอยู่พังทันที (เช่น ลบคอลัมน์ที่ยังถูกอ่าน) — ให้ deploy แบบเพิ่มก่อน แล้วค่อยลบในรอบถัดไป
- ตรวจ `npx prisma migrate status` และสุขภาพของแอปหลัง deploy ทุกครั้ง
- ระวังการใช้ connection pooler: migration ต้องเชื่อมแบบที่รองรับ transaction/session ตามที่ provider กำหนด

---

## คู่มือการใช้งานตามบทบาท

> เอกสารนี้สรุปขั้นตอนการใช้งานจาก UI จริง; รายละเอียดสัญญา API อยู่ที่ [เอกสาร API](#เอกสาร-api) เพื่อไม่ให้ซ้ำซ้อน

### บทบาท STUDENT (ผู้ฝึกอาชีพ)

**เริ่มต้นใช้งาน**

1. เปิด `/login?role=student`
2. กรอกรหัสนักศึกษา (หรือ username) และรหัสผ่านที่ได้รับจากเจ้าหน้าที่ (ค่าเริ่มต้นคือรหัสพนักงานที่ใช้ตอนนำเข้า)
3. หลังเข้าสู่ระบบจะอยู่ที่ `/student` (แดชบอร์ด) และมีเมนู 5 รายการ: แดชบอร์ด, เช็กอิน/เช็กเอาท์, ประวัติลงเวลา, เงินส่วนตัว, การลา

**ขั้นตอนทำงานประจำวัน**

1. **เช็กอิน:** ไปที่ `/student/check-in` → อัปโหลดรูป (JPEG/PNG/WebP ≤ 5 MB) → กรอกเงินเข้า (`CASH` และ/หรือ `TRUEMONEY`) → หมายเหตุ (ถ้ามี) → ส่ง
2. **ระหว่างวัน:** แดชบอร์ดแสดงนาฬิกาจับเวลา; หน้าเช็กอินแสดงไทม์ไลน์และสรุปเงินของวัน
3. **เช็กเอาท์:** กลับไปที่ `/student/check-in` (ปุ่มจะเปลี่ยนเป็น "เช็กเอาท์ออกงาน") → อัปโหลดรูป → กรอกเงินออก → ส่ง จากนั้นระบบจะคำนวณเวลาทำงานและ "ใช้ไป" ให้
4. **ตรวจย้อนหลัง:** `/student/attendance` เลือกเดือนที่ต้องการดูสรุปและรายการ; `/student/money` ดูรายการเงินและยอดสุทธิ
5. **การลา/วันหยุด:** `/student/leaves` เลือกแท็บ "วันหยุด" หรือ "การลา" → เพิ่ม/แก้ไข/ลบรายการของตัวเอง

**ข้อจำกัดที่ผู้ใช้ควรทราบ**

- เช็กอินได้วันละ 1 ครั้ง และเช็กเอาท์ได้วันละ 1 ครั้ง; ถ้าลืมเช็กเอาท์จะแก้ย้อนหลังเองไม่ได้ (ต้องแจ้งเจ้าหน้าที่)
- ต้องกรอกเงินอย่างน้อยหนึ่งช่องทุกครั้งที่เช็กอิน/เช็กเอาท์
- รูปยืนยันถูกซ่อนหลัง 7 วัน (ข้อมูลเวลา/เงิน/หมายเหตุยังอยู่ครบ)
- ลืมรหัสผ่าน: ติดต่อ ADMIN เพื่อรีเซ็ต; ถ้าต้องการเปลี่ยนเองใช้ `/account/password` (ต้องรู้รหัสเดิม)

### บทบาท ADMIN (เจ้าหน้าที่)

**เริ่มต้นใช้งาน:** เปิด `/login?role=admin` เข้าด้วย username หรือรหัสพนักงานของบัญชี ADMIN (บัญชีนี้ต้องถูกสร้างนอกระบบมาก่อน)

**งานที่ทำบ่อย**

| งาน | หน้า | ขั้นตอนสรุป |
| --- | --- | --- |
| ดูภาพรวมวันนี้ | `/admin` | เลือกกรองรหัสร้าน/สถานะ → ดูจำนวนและสถานะรายคน → ส่งออก CSV ถ้าต้องการ |
| นำเข้านักศึกษาใหม่ | `/admin/import` | เตรียมไฟล์ CSV → อัปโหลด → ตรวจผลรายแถว → ยืนยันนำเข้า (สูงสุด 500 แถว/ครั้ง, ≤ 1 MB) |
| จัดการบัญชี | `/admin/users` | ค้นหา/กรอง → เพิ่มบัญชี → แก้ไขโปรไฟล์ → เปิด/ปิดใช้งาน → เปลี่ยนบทบาท → รีเซ็ตรหัสผ่าน (คัดลอกรหัสชั่วคราวไปแจ้งผู้ใช้) → ลบบัญชีที่ไม่มีประวัติ |
| ตรวจการลงเวลา | `/admin/attendance` | ค้นหา/กรองวันที่ ร้าน สถานะ → ดูรายละเอียด → ส่งออก CSV |
| ออกรายงานชั่วโมง | `/admin/reports` | เลือกมุมมองรายวัน/รายเดือน → กรองร้าน/ค้นหา → เปิดรายบุคคลที่ `/admin/reports/{userId}` → ส่งออก Excel |
| ออกรายงานการเงิน | `/admin/finance` | เลือกช่วงเวลา → ดูยอดรวม/รายคน → เปิดรายบุคคลที่ `/admin/finance/{userId}` → ส่งออก Excel |
| ตรวจการลา | `/admin/leaves` | กรองประเภท/เดือน/ร้าน/บุคคล → ดูไทม์ไลน์ → ส่งออก CSV ถ้าต้องการ |

> รหัสผ่านเริ่มต้นของบัญชีที่สร้างใหม่ = `employeeCode` หรือ `studentId` (ถ้าไม่มีรหัสพนักงาน) และเมื่อ ADMIN รีเซ็ตรหัสผ่านจะกลับไปใช้ค่าเดียวกันนี้ พร้อม revoke session เดิมทั้งหมด

**รูปแบบ CSV สำหรับนำเข้ารายชื่อ**

หัวคอลัมน์บังคับ: `studentId`, `firstName`, `lastName`, `employeeCode`
หัวคอลัมน์เสริม: `shopCode`, `gradeLevel`

```csv
studentId,firstName,lastName,employeeCode,shopCode,gradeLevel
68000001,สมชาย,ใจดี,EMP0001,SHOP01,3
```

- รองรับการอ่านไฟล์ UTF-8 (รวม BOM), UTF-16LE/BE และ Windows-874 (ตาม `lib/csv-encoding.ts`)
- รหัสนักศึกษา/รหัสพนักงานต้องไม่ซ้ำกันทั้งในไฟล์และกับบัญชีในฐานข้อมูล; ชื่อ–นามสกุล ≤ 80 ตัวอักษร; รหัสและรหัสร้าน ≤ 40 ตัวอักษร; `gradeLevel` เป็นจำนวนเต็ม 1–20
- username ของนักศึกษาที่นำเข้าคือ `studentId`; รหัสผ่านเริ่มต้นคือ `employeeCode` (เก็บเป็น Argon2id hash) — **แจ้งรหัสผ่านเป็นการส่วนตัวเสมอ**

**ข้อจำกัดของ ADMIN**

- ลบบัญชีที่มีประวัติลงเวลา/ใบลาไม่ได้ และลบบัญชีตัวเองไม่ได้
- ลดบทบาท ADMIN คนสุดท้ายที่ยังใช้งานได้ไม่ได้ (ระบบป้องกันการล็อกตัวเองออกจากระบบ)
- รูปที่เกิน 7 วันจะแสดงเป็น "รูปหมดอายุแล้ว" ในหน้า Admin

---

## เอกสาร API

โปรเจกต์มี API Reference แยกต่างหากแล้ว README นี้จึงไม่ทำซ้ำทั้งหมด

| รายการ | ตำแหน่ง | หมายเหตุ |
| --- | --- | --- |
| OpenAPI Specification | [`documents/openapi.yaml`](./documents/openapi.yaml) | OpenAPI **3.1.0** (`info.version` 1.0.0) เป็นแหล่งอ้างอิงหลักของ contract |
| เสิร์ฟสเปกให้เครื่องอ่าน | `GET /api/openapi` | ตอบ `application/yaml; charset=utf-8` โดยอ่านไฟล์จาก `documents/openapi.yaml` และตั้ง `Cache-Control: public, max-age=3600` |
| Swagger UI (สำหรับคนอ่าน) | `/api-docs` | หน้าเว็บที่โหลด `swagger-ui-dist@5` จาก `unpkg.com` และตั้ง `url: "/api/openapi"`, `withCredentials: true`, `persistAuthorization: true` |
| สรุปเส้นทาง | [`documents/API.md`](./documents/API.md) | ตารางสรุป endpoint, สิทธิ์, error code และวิธีตั้ง Postman |
| รายละเอียด + ผลทดสอบ | [`documents/API_DOCUMENTATION.md`](./documents/API_DOCUMENTATION.md) | อธิบายทีละ endpoint พร้อมข้อสังเกตจากโค้ด |

**วิธีใช้ Swagger UI**

1. รัน `npm run dev` แล้วเปิด <http://localhost:3000/api-docs>
2. เอกสารโหลดจาก `/api/openapi` — ถ้าเปิดหน้าแล้วว่าง ให้ตรวจว่าเรียก `/api/openapi` ได้ (ต้องมีไฟล์ `documents/openapi.yaml`)
3. Swagger UI ตั้ง `withCredentials: true` จึงใช้ cookie session ของเบราว์เซอร์ได้: เข้าสู่ระบบที่ `/login` ก่อน แล้วกลับมาเรียก endpoint ที่ต้องยืนยันตัวตน
4. การยืนยันตัวตนของ API คือ **cookie `attendance_session`** (ไม่ใช่ Bearer token) ส่วน endpoint cron ใช้ `Authorization: Bearer <CRON_SECRET>`
5. Mutation (POST/PATCH/DELETE) ต้องมี header `Origin` ตรงกับ origin ของแอป — Swagger UI ที่เปิดจาก origin เดียวกันจะส่งให้อัตโนมัติ
6. หน้า `/api-docs` พึ่งพา CDN ภายนอก (`unpkg.com`) ถ้าใช้งานในเครือข่ายที่บล็อก CDN หน้า UI จะไม่แสดงผล (ยังดึงสเปกจาก `/api/openapi` ได้ด้วยเครื่องมืออื่น)
7. ดาวน์โหลดสเปกไปใช้กับเครื่องมืออื่นได้ เช่น `curl http://localhost:3000/api/openapi -o openapi.yaml`

**สถานะความสอดคล้องของ contract**

- ปรับ `documents/openapi.yaml` ให้ตรงกับ Implementation แล้ว: response ของ `POST /api/admin/users/import` เหลือ `{ importedCount }`; พารามิเตอร์ `month`/`year` ของ `GET /api/attendance/me/monthly-summary`, `GET /api/money-tracker/me` และ `GET /api/admin/reports/money-tracker` เป็น optional พร้อมอธิบายค่าเริ่มต้นราย endpoint
- ปรับ `AGENTS.md` แล้ว: response ที่สำเร็จส่ง JSON payload โดยตรง (ไม่มี `{ ok, data }`) และ response ที่ผิดพลาดส่ง `{ error: { code, message, details? } }`
- **ยังต้องดำเนินการ:** ณ วันที่จัดทำ ไฟล์ `app/api-docs/`, `app/api/openapi/` และ `documents/openapi.yaml` ยัง untracked (`git status` ขึ้น `??`) — ต้อง commit ก่อน มิฉะนั้น clone ใหม่จะไม่มีหน้า `/api-docs` และ `/api/openapi` ตามที่เอกสารนี้อ้างอิง

---

## ความปลอดภัย

คุณสมบัติที่มีใน Implementation จริง

| ด้าน | รายละเอียด | ที่มา |
| --- | --- | --- |
| Authentication | Login ด้วย `username` หรือ `studentId` (ทุกบทบาท) หรือ `employeeCode` เฉพาะ ADMIN; บัญชีที่ `isActive = false` เข้าไม่ได้ | `repositories/user.repository.ts`, `services/auth.service.ts` |
| Session | Cookie `attendance_session` เป็น **HttpOnly, SameSite=Strict, path `/`, อายุ 8 ชั่วโมง, `Secure` เมื่อ production**; เก็บเฉพาะ **SHA-256 hash** ของ token ในฐานข้อมูล | `lib/auth.ts` |
| Password hashing | **Argon2id** (`argon2.hash`) และรองรับการตรวจรหัสแบบเดิม `scrypt$...` เพื่อการย้ายข้อมูล | `lib/auth.ts` |
| Brute-force protection | นับเฉพาะกรณี "ไม่พบผู้ใช้หรือรหัสผ่านผิด" เพื่อลดความเสี่ยง timing attack | `services/auth.service.ts` |
| Rate limiting | ผิดครบ 10 ครั้งในหน้าต่าง 15 นาทีต่อ identifier (case-insensitive) → `429 RATE_LIMITED` | `lib/auth.ts` |
| Authorization | `requireUser(role)` เทียบ role ตรงตัว + page guards ฝั่ง server | `lib/auth.ts`, `lib/page-auth.ts` |
| CSRF / Origin | Mutation ทุกเส้นเรียก `requireSameOrigin()` เทียบ `Origin` กับ origin ของ request ไม่ตรง → `403 CSRF_REJECTED` | `lib/api.ts` |
| Input validation | Zod ตรวจ body/query/path; schema โปรไฟล์และแอดมินเป็น `.strict()` (ส่ง field เกิน = `400`) | `validators/api.ts` |
| File upload | รับเฉพาะ `image/jpeg`, `image/png`, `image/webp`, ขนาด ≤ 5 MB, ตรวจ **magic bytes** (JPEG/PNG/WebP) ก่อนอัปโหลด | `lib/cloudinary.ts` |
| Data exposure | Response ที่เป็นข้อมูลส่วนตัวติด `Cache-Control: no-store`; API ไม่ส่ง `passwordHash`; ไฟล์ `.env` ถูก ignore | `lib/api.ts`, `.gitignore` |
| Admin safety | ป้องกันลบตัวเอง (`SELF_DELETE_PROTECTION`), ปิดใช้งานตัวเอง (`SELF_DEACTIVATION_PROTECTION`), ลบบัญชีที่มีประวัติ (`USER_HAS_RECORDS`) และลด/ปิด ADMIN คนสุดท้าย (`LAST_ADMIN_PROTECTION`) | `services/user.service.ts` |
| Password reset | ADMIN reset แล้วได้รหัสชั่วคราว **แสดงครั้งเดียวใน response** และ revoke session เดิมทั้งหมดของผู้ใช้นั้น | `services/user.service.ts` |
| Cron protection | ตรวจ `Authorization: Bearer <CRON_SECRET>` ด้วย `timingSafeEqual`; ไม่ตั้ง secret = ปฏิเสธทุกคำขอ | `app/api/cron/expire-attendance-images/route.ts` |

**ข้อจำกัดด้านความปลอดภัยที่ควรทราบ**

- ไม่มีการบันทึก audit log ของการกระทำของ ADMIN (ใครแก้/ลบอะไร เมื่อไร)
- หน้า `/api-docs` และ `/api/openapi` เป็น public; ตัวสเปกไม่มีความลับ แต่ควรพิจารณาว่าจะเปิดใน Production หรือไม่
- Swagger UI โหลด JavaScript/CSS จาก CDN ภายนอก (`unpkg.com`) ซึ่งเป็นความเสี่ยงด้าน supply chain หากใช้งานใน Production
- ไม่มีระบบล็อกบัญชีถาวรหรือแจ้งเตือนเมื่อพบความพยายาม login ผิดจำนวนมาก
- ไม่มี Content Security Policy หรือ security headers ที่กำหนดเองใน `next.config.ts`

---

## Scripts และคำสั่งสำหรับนักพัฒนา

Scripts ที่มีจริงใน `package.json`

| คำสั่ง | จุดประสงค์ | Environment / หมายเหตุ |
| --- | --- | --- |
| `npm run dev` | เริ่ม Development Server (Turbopack) | Development |
| `npm run build` | `prisma generate && next build` | สร้าง production build |
| `npm run start` | เริ่ม Production Server จาก build ที่มีอยู่ | ต้อง build ก่อน |
| `npm run lint` | รัน ESLint (`eslint`) | ตรวจคุณภาพโค้ด |
| `npm test` | `node --test tests/*.test.mjs` | Unit tests |
| `npm run postinstall` | `prisma generate` | รันอัตโนมัติหลังติดตั้ง dependencies |

คำสั่ง CLI ที่โปรเจกต์ใช้จริง (ไม่มี script เฉพาะ)

| คำสั่ง | จุดประสงค์ | หมายเหตุ |
| --- | --- | --- |
| `npx tsc --noEmit` | ตรวจชนิดข้อมูล TypeScript ทั้งโปรเจกต์ | ไม่มี script `typecheck` — เป็นข้อเสนอแนะให้เพิ่ม |
| `npx prisma generate` | สร้าง Prisma Client ไปที่ `app/generated/prisma` | ต้องรันหลังเปลี่ยน schema |
| `npx prisma validate` | ตรวจความถูกต้องของ schema | ตรวจแล้วผ่าน |
| `npx prisma migrate status` | ดูสถานะ migration เทียบฐานข้อมูล | ต้องเข้าถึงฐานข้อมูลได้ |
| `npx prisma migrate dev --name <name>` | สร้าง + apply migration ใน Development | Development เท่านั้น |
| `npx prisma migrate deploy` | Apply migration ที่ commit แล้ว | Development/Production (runner ตัวเดียว) |
| `npx prisma studio` | เปิด UI ดู/แก้ข้อมูล | ใช้ระวังใน Production |
| `npx prisma migrate reset` | **ลบข้อมูลทั้งฐานข้อมูล** แล้ว migrate ใหม่ | **ห้ามใช้กับ Production** |

---

## การทดสอบและตรวจสอบคุณภาพ

### Unit tests

```bash
npm test
```

- ไฟล์เดียว: [`tests/api-logic.test.mjs`](./tests/api-logic.test.mjs) รันด้วย Node.js built-in test runner (ไม่ใช้ framework ภายนอก)
- **ผลการรันจริง ณ วันที่จัดทำ:** `tests 14 / pass 14 / fail 0`
- ครอบคลุม logic ที่คำนวณผิดแล้วกระทบข้อมูลโดยตรง ได้แก่: วันทำงาน Bangkok ข้ามเที่ยงคืน, ช่วงเดือน (รวมกุมภาพันธ์ปีอธิกสุรทิน), สรุปชั่วโมงรายเดือน (นับเฉพาะกะที่ปิดแล้วและใช้ elapsed time), กฎเช็กเอาท์ (`CHECK_IN_REQUIRED`, `INVALID_TIME_ORDER`, `ALREADY_CHECKED_OUT`), ผลรวมเงินแยกประเภทแบบทศนิยมแม่นยำ, การแสดงผล "ใช้ไป" ที่ไม่โชว์ค่าติดลบ, validation ของจำนวนเงิน/การลา/การนำเข้า และการถอดรหัส CSV (UTF-8 BOM และ Windows-874)
- ข้อสังเกต: Node แสดง warning `MODULE_TYPELESS_PACKAGE_JSON` เพราะ import ไฟล์ `.ts` โดยที่ `package.json` ไม่ได้ตั้ง `"type": "module"` — ไม่กระทบผลการทดสอบ แต่เป็นสิ่งที่เพิ่ม `"type": "module"` แล้วต้องตรวจผลกระทบทั้งโปรเจกต์ก่อน

### Lint และ Type check

```bash
npm run lint
npx tsc --noEmit
```

- **ผลการรันจริง:** `tsc` ผ่านโดยไม่มี error; `lint` มี **0 error, 3 warning** ที่มีอยู่เดิมใน `app/components/login-form.tsx` และ `app/components/logout-button.tsx` (คำเตือนเรื่อง `window.location.assign()` กับ internal page ของ Next.js)

### Build

```bash
npm run build
```

ยังไม่ได้รันในงานเอกสารนี้ (อาจต้องเชื่อมต่อฐานข้อมูล/บริการภายนอกระหว่าง prerender) แนะนำให้รันใน CI หรือ environment ทดสอบก่อน release

### Integration / E2E / Database tests

**ไม่พบการตั้งค่าที่รองรับในโปรเจกต์ปัจจุบัน** (ไม่มี Playwright/Cypress/Jest/Vitest และไม่มี test database setup)

**รายการที่แนะนำให้เพิ่ม (ยังไม่ได้ Implement):**

1. CI workflow ที่รัน `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
2. Integration test ของ Route Handlers กับฐานข้อมูลทดสอบ (โดยเฉพาะ check-in/check-out และ import)
3. E2E test ของ flow login → เช็กอิน → เช็กเอาท์ → ดูรายงาน
4. Script `typecheck` ใน `package.json` เพื่อให้คำสั่งสั้นลง

### Checklist ก่อน Release (ที่ทีมควรตรวจด้วยมือ)

1. login/logout ทั้งสองบทบาท, การกันหน้าและ API ตาม role, การหมดอายุ session
2. นำเข้า CSV: ไฟล์ถูกต้อง, รหัสซ้ำในไฟล์, รหัสซ้ำในฐานข้อมูล, ไฟล์เกิน 500 แถว/เกิน 1 MB, encoding ภาษาไทย
3. เช็กอิน/เช็กเอาท์ซ้ำ, เช็กเอาท์ก่อนเช็กอิน, อัปโหลดรูปผิดชนิด/เกินขนาด, อัปโหลดจริงบน environment ทดสอบ
4. ตัวเลขเงินและรายงานรายวัน/รายเดือน, การส่งออก CSV/Excel, การแบ่งหน้า
5. การลา/วันหยุด: สร้าง–แก้ไข–ลบ, ช่วงวันที่กลับด้าน, การแสดงในหน้า Admin
6. กรณีบริการภายนอกล่ม (PostgreSQL, Cloudinary) และกรณี cron ล้มเหลว
7. พฤติกรรม P2021/P2022 (ตาราง/คอลัมน์ไม่ตรง) และการกู้คืนด้วย migration

---

## การ Deploy

โปรเจกต์มี `vercel.json` ซึ่งเป็นการตั้งค่าเฉพาะของ Vercel และใช้ Vercel Cron สำหรับงานลบรูป จึงอธิบายเส้นทาง Vercel เป็นหลัก (ยังไม่พบ Dockerfile หรือ CI workflow ใน repository)

### ข้อกำหนดเบื้องต้น

1. บัญชี Vercel ที่ผูกกับ repository `sonpasavee/panyapiwat-time-attendance`
2. PostgreSQL สำหรับ Production แยกจาก Development พร้อมนโยบาย backup/PITR
3. บัญชี Cloudinary สำหรับ Production
4. ADMIN คนแรกที่เตรียมไว้แล้ว (ไม่มี seed)

### Production Environment Variables

ตั้งใน Vercel Project Settings → Environment Variables (Production และ Preview ถ้าต้องการทดสอบ): `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CRON_SECRET` (ดู [ตัวแปรแวดล้อม](#ตัวแปรแวดล้อม)) — **ห้าม commit ค่าจริง**

### ขั้นตอน Deploy

1. ตรวจ migration ค้างและ review SQL: `npx prisma migrate status` (ชี้ไปที่ Production database)
2. Apply migration ด้วย runner ตัวเดียว — ทำก่อนหรือระหว่าง deploy ตามลำดับที่ทีมกำหนด:
   ```bash
   npx prisma migrate deploy
   ```
3. Vercel จะรัน build command ของโปรเจกต์ (`npm run build` = `prisma generate && next build`) หลังติดตั้ง dependencies
4. ต้องใช้ **Node.js runtime** (ไม่ใช่ Edge) เพราะ Prisma, `pg` และ `argon2` ต้องการ runtime ของ Node
5. หลัง deploy ตรวจ URL ที่ Vercel แสดง

### Cron และงานตามกำหนดเวลา

- `vercel.json` ตั้ง cron ไว้ที่ path `/api/cron/expire-attendance-images` โดย `schedule: "0 17 * * *"` = **17:00 UTC (เที่ยงคืนเวลาไทย) ทุกวัน**
- Vercel จะส่ง `Authorization: Bearer <CRON_SECRET>` ให้อัตโนมัติเมื่อเรียก cron route
- ถ้าไม่ได้ตั้ง `CRON_SECRET` หรือค่าไม่ตรง endpoint จะตอบ `401 UNAUTHORIZED` และไม่ลบข้อมูลใด ๆ
- งานนี้ประมวลผลเป็น batch (สูงสุด 300 รูปต่อชนิด, concurrency 10); ถ้ามีมากกว่าขนาด batch จะทำต่อในรอบถัดไป และรายงาน `hasMore`
- รายละเอียดเพิ่มเติม: [`documents/image-retention.md`](./documents/image-retention.md)

### Logs, Monitoring และ Custom Domain

- **Logs:** ดู Build Logs และ Runtime/Function Logs ในหน้า Project ของ Vercel — error ที่ route ไม่ได้จัดการจะถูกบันทึกผ่าน `console.error("API request failed", error)` ใน `lib/api.ts` และงาน cron มี log ของตัวเอง (`Attendance image expiration job failed`)
- **Monitoring:** ยังไม่พบ APM/Error tracking (เช่น Sentry) ในโค้ด — แนะนำให้เพิ่มก่อนใช้งานจริงระยะยาว
- **Custom Domain:** ตั้งใน Vercel Project Settings → Domains; Vercel ออก HTTPS ให้ ซึ่งจำเป็นเพราะ cookie session ตั้ง `Secure` เมื่อ `NODE_ENV=production` (ไม่ต้องแก้ `Origin` ในโค้ด เพราะ CSRF ตรวจเทียบกับ origin ของ request เอง)
- **Health check:** ไม่มี endpoint เฉพาะ (ดูหมายเหตุด้านล่าง)

### Post-Deployment Verification

| ตรวจสอบ | วิธี |
| --- | --- |
| แอปทำงาน | เปิดหน้าแรกและหน้า `/login` |
| ฐานข้อมูลเชื่อมได้ | login ด้วยบัญชีที่มีอยู่; ถ้า error ให้ดู log ฝั่ง Vercel และรัน `npx prisma migrate status` |
| บทบาททำงานถูกต้อง | login ทั้ง STUDENT และ ADMIN แล้วตรวจว่าเข้าได้เฉพาะหน้าที่ควรเข้า |
| ฟีเจอร์รูปทำงาน | ทดสอบเช็กอิน/เช็กเอาท์ด้วยบัญชีทดสอบและตรวจว่ารูปขึ้น Cloudinary |
| Cron ทำงาน | เรียก `/api/cron/expire-attendance-images` ด้วย Bearer secret ที่ถูกต้อง (หรือดูผลใน Cron logs ของ Vercel) และตรวจค่าที่ตอบกลับ `deleted`/`failed`/`hasMore` |
| รายงานถูกต้อง | เปิด `/admin/reports` และ `/admin/finance` เทียบกับข้อมูลที่ลงเวลาไว้ |

> โปรเจกต์ไม่มี health-check endpoint เฉพาะ (`/api/health` ไม่มีในโค้ด) การตรวจสุขภาพระบบจึงต้องใช้หน้าแรก/การ login หรือเพิ่ม endpoint ใหม่ในอนาคต

---

## แก้ปัญหาเบื้องต้น

| อาการ / Error | สาเหตุที่เป็นไปได้ | วิธีตรวจสอบ | แนวทางแก้ไข |
| --- | --- | --- | --- |
| `DATABASE_URL is required` ตอนรันแอป | ไม่มี `.env` หรือชื่อตัวแปรผิด | ตรวจว่ามี `.env` ที่ root และมี `DATABASE_URL` | สร้างจาก `.env.example` แล้วใส่ค่าให้ถูกต้อง |
| Prisma CLI ไม่เห็นค่าฐานข้อมูล | ค่าอยู่ใน `.env.local` แต่ Prisma อ่านเฉพาะ `.env` (`dotenv/config`) | ดูข้อความ `Loaded Prisma config from prisma7.config.ts` | ย้าย `DATABASE_URL` ไปไว้ใน `.env` |
| เชื่อม PostgreSQL/Supabase ไม่ได้ | host/port/password ผิด, รหัสผ่านมีอักขระพิเศษ, SSL, allowlist หรือ pooler ไม่รองรับ migration | ทดลองเชื่อมด้วย client อื่น, ดู error code จาก `pg` | URL-encode รหัสผ่าน, เปิด SSL/allowlist, เลือก connection ที่รองรับ migration |
| `P2021 table ... does not exist` หรือ `P2022 column ... does not exist` | Migration ยังไม่ถูก apply หรือโค้ดใหม่กว่า schema | `npx prisma migrate status` | รัน `npx prisma migrate deploy` กับฐานข้อมูลที่ถูกต้อง (ห้าม reset Production) |
| `Cannot find module '@/app/generated/prisma...'` | ยังไม่ generate client หลังโคลน/เปลี่ยน schema | ดูว่ามีโฟลเดอร์ `app/generated/prisma` | `npx prisma generate` (หรือ `npm ci` เพื่อให้ `postinstall` ทำงาน) |
| `Prisma schema loaded ... is valid` แต่คำสั่งยัง error | เป็นข้อความปกติที่เขียนไป stderr — PowerShell อาจตีเป็น error | ดู exit ของคำสั่งจริง/บรรทัดสุดท้าย | ไม่ต้องแก้ ถ้าผลลัพธ์ยืนยันว่า valid |
| `npm`/`npx` รันไม่ได้บน Windows (`running scripts is disabled`) | Execution Policy ของ PowerShell บล็อก `.ps1` | ข้อความ error ระบุ `npm.ps1` | ใช้ `npm.cmd` และ `npx.cmd` แทน หรือตั้ง Execution Policy ที่เหมาะสมกับเครื่อง |
| อัปโหลดรูปไม่ผ่าน (`INVALID_IMAGE`) | ไฟล์ไม่ใช่ JPEG/PNG/WebP, ขนาด > 5 MB หรือเนื้อไฟล์ไม่ตรงกับ magic bytes | ตรวจชนิด/ขนาดไฟล์ และค่าตัวแปร Cloudinary | แปลงไฟล์เป็น JPEG/PNG/WebP และลดขนาด; ตรวจว่าตั้งตัวแปรครบ 3 ตัว |
| `Cloudinary is not configured` | ตั้งตัวแปรไม่ครบ | ตรวจ `CLOUDINARY_CLOUD_NAME`/`API_KEY`/`API_SECRET` | เติมให้ครบทั้งสามค่า |
| Mutation ตอบ `403 CSRF_REJECTED` | ไม่มี/ไม่ตรง header `Origin` | ดู header ที่ส่งไป | ส่ง request จาก origin เดียวกัน; ใน Postman ตั้ง `Origin` ให้ตรง host |
| login ตอบ `429 RATE_LIMITED` | พยายามผิดครบ 10 ครั้งใน 15 นาที | ดู log/เวลาที่เริ่มพยายาม | รอให้หน้าต่าง 15 นาทีหมด แล้วตรวจข้อมูลบัญชีก่อนลองใหม่ (อย่า retry อัตโนมัติ) |
| login สำเร็จแต่เข้าหน้าไม่ได้ | บัญชีถูกปิดใช้งาน, role ไม่ตรงกับหน้า, หรือ cookie ไม่ถูกส่ง | ตรวจ `isActive`, role และ cookie ในเบราว์เซอร์ | ให้ ADMIN เปิดใช้งาน/แก้ role; Production ต้องใช้ HTTPS เพราะ cookie ตั้ง `Secure` |
| cron ตอบ `401 UNAUTHORIZED` | ไม่ได้ตั้ง `CRON_SECRET` หรือค่าไม่ตรง | ดูค่าใน secret manager และ header ที่ส่ง | ตั้ง/หมุน secret ให้ตรง (Vercel ส่งให้อัตโนมัติเมื่อตั้งค่าไว้) |
| รูปไม่ถูกลบบน Cloudinary | cron ยังไม่รัน, `hasMore` เป็น `true` จากรอบก่อน, หรือ record เก่าไม่มี public ID | ดู response ของ cron (`deleted`, `failed`, `skippedWithoutPublicId`, `hasMore`) | รอรอบถัดไป; ถ้า `skippedWithoutPublicId` มีค่าให้ตรวจข้อมูลเดิมแยก |
| Node เตือน `MODULE_TYPELESS_PACKAGE_JSON` ตอน `npm test` | import ไฟล์ `.ts` โดยไม่มี `"type": "module"` | ข้อความ warning ตอนรัน test | เป็นคำเตือนเท่านั้น; ถ้าจะแก้ให้เพิ่ม `"type": "module"` แล้วทดสอบผลกระทบทั้งโปรเจกต์ |
| หน้า `/api-docs` ว่างเปล่า | CDN `unpkg.com` ถูกบล็อก หรือ `/api/openapi` อ่านไฟล์ไม่ได้ | เปิด `/api/openapi` ตรง ๆ | ตรวจเครือข่าย/ไฟล์ `documents/openapi.yaml` หรือใช้เครื่องมืออื่นอ่านสเปก |

---

## แนวทางการพัฒนา

แนวทางนี้สอดคล้องกับโค้ดปัจจุบันและไฟล์ [`AGENTS.md`](./AGENTS.md)

### Responsibilities ของแต่ละ Layer

| Layer | หน้าที่ | ห้ามทำ |
| --- | --- | --- |
| `app/api/**/route.ts` | อ่าน request, ตรวจ Origin, ตรวจ session/role, validate ด้วย Zod, เรียก service, ตอบผ่าน `json()` | ใส่ business rule หรือเรียก Prisma ตรง |
| `app/**/page.tsx` | ตรวจ role ด้วย page guard แล้วเรียก service ฝั่ง server | เรียก Prisma ตรง หรือเรียกบริการภายนอกผ่าน HTTP |
| `services/` | กฎธุรกิจ การคำนวณ ลำดับ transaction และ orchestration | รู้จัก HTTP/`Request`/`Response` |
| `repositories/` | Prisma queries และ persistence ทั้งหมด | รู้จัก HTTP, `ApiError` หรือ business rule |
| `validators/api.ts` | Zod schema ของ input ทุกเส้น | พึ่ง client-side validation เพียงอย่างเดียว |
| `lib/` | Utility ที่ใช้ร่วม (api, auth, db, time, format, cloudinary, csv) | สร้าง helper ซ้ำกับของเดิม |

### Conventions ที่โค้ดใช้อยู่

- **ภาษาและชื่อ:** ชื่อไฟล์/ตัวแปร/ชนิดข้อมูลเป็นภาษาอังกฤษ; ข้อความที่ผู้ใช้เห็นเป็นภาษาไทย; ใช้ path alias `@/*` ชี้ไป root ของ repository
- **Error handling:** โยน `ApiError(status, message, code)` แล้วให้ `handleError()` แปลงเป็นรูปแบบกลาง; `ZodError` กลายเป็น `400 VALIDATION_ERROR` พร้อม `details`; `P2002` → `409 CONFLICT`, `P2025` → `404 NOT_FOUND`
- **วันและเวลา:** ใช้ `BUSINESS_TZ = "Asia/Bangkok"` และ helper ใน `lib/time.ts`/`lib/format.ts` เท่านั้น ห้ามคำนวณวันที่แบบ local timezone ของเซิร์ฟเวอร์
- **จำนวนเงิน:** เก็บเป็น `Decimal(10,2)` และแปลงเป็นจำนวนเต็ม satang ก่อนบวก/ลบผ่าน `services/money-tracker.logic.ts` — หลีกเลี่ยงการบวกทศนิยมแบบ floating point โดยตรง
- **Database access:** ใช้ singleton จาก `lib/db.ts`; ห้ามสร้าง `PrismaClient` ใหม่ต่อ request
- **UI:** คง responsive layout, ใช้ `<button>`/`<a>` จริง, ทุก input ต้องมี label, มี focus ring, ปุ่มสูงอย่างน้อย 44px, มือถือใช้เมนูล่าง (ดู `dashboard-nav.tsx`), และคงชุดสี/ระยะห่างตาม `app/globals.css`
- **Schema/API contract:** ถ้าจำเป็นต้องแก้ ต้องขออนุมัติและอัปเดต migration + `documents/openapi.yaml` ให้ตรงกันก่อน merge
- **Environment variables:** ใช้ `process.env` ผ่านโค้ดเดิม; ตัวแปรใหม่ต้องเพิ่มใน `.env.example` พร้อมคำอธิบาย

### การเพิ่มฟีเจอร์ใหม่ (ลำดับที่แนะนำ)

1. ตรวจว่ามี model/field รองรับหรือไม่ ถ้าไม่มีให้เพิ่มใน `prisma/schema.prisma` และสร้าง migration
2. เพิ่ม Zod schema ใน `validators/api.ts`
3. เพิ่ม query ใน `repositories/` ที่ตรงกับโดเมน
4. เขียน business rule ใน `services/`
5. เพิ่ม Route Handler ใน `app/api/**/route.ts` (ตรวจ Origin → auth → validate → service)
6. เพิ่ม UI (Server Component เรียก service; Client Component เรียก API)
7. อัปเดต `documents/openapi.yaml` และเอกสารที่เกี่ยวข้อง
8. รัน `npm test`, `npx tsc --noEmit`, `npm run lint`

### Git Workflow

- ยังไม่พบ **Branch Protection, Code Review Policy หรือ Commit Convention ที่บังคับใช้** ใน repository (ไม่มี `.github/`) — ที่มีคือชื่อ branch ที่บรรยายงาน เช่น `refactor_leave_request_ui`, `fixed_responsive`, `completed_change_password`
- แนวปฏิบัติที่แนะนำ: แตก branch ต่อฟีเจอร์, commit ให้เล็กและอธิบายเหตุผล, รันชุดตรวจคุณภาพก่อนเปิด Pull Request, และ reviewer ตรวจ migration/สัญญา API เป็นพิเศษ

---

## การมีส่วนร่วม

Repository นี้ยังไม่มีไฟล์ `CONTRIBUTING.md` และไม่มี CI — ขั้นตอนด้านล่างเป็นแนวทางที่สอดคล้องกับเครื่องมือที่มีอยู่จริง

1. **เตรียม environment:** ทำตาม [ติดตั้งและรันในเครื่อง](#ติดตั้งและรันในเครื่อง) จนรัน `npm run dev` ได้
2. **สร้าง branch:** `git checkout -b <type>/<short-description>` เช่น `feature/checkout-note` หรือ `fix/import-duplicate`
3. **พัฒนาและทดสอบ:** รัน `npm test`, `npx tsc --noEmit`, `npm run lint` (และ `npm run build` ถ้าทำได้ใน environment ของคุณ)
4. **ตรวจเอกสาร:** ถ้าเปลี่ยน API contract ให้แก้ `documents/openapi.yaml` และเอกสารใน `documents/` ให้ตรงกัน
5. **เปิด Pull Request:** อธิบายสิ่งที่เปลี่ยน เหตุผล วิธีทดสอบ และผลการรันคำสั่งตรวจสอบ — ห้ามใส่ secret หรือข้อมูลส่วนบุคคลจริงใน PR
6. **Review:** ผู้ดูแลระบบโครงการพิจารณา โดยเน้น migration, ความปลอดภัย (auth/Origin), และความถูกต้องของตัวเลขเงิน/เวลา

**สิ่งที่ไม่ควรทำ:** แก้ migration ที่ deploy ไปแล้ว, เปลี่ยน API path/response format โดยไม่ตกลง, ปิด guard (Origin/role) เพื่อให้ผ่านการทดสอบ, หรือใส่ credential ลงในโค้ด/เอกสาร

---

## License และ Credit

- **License:** **ไม่พบไฟล์ `LICENSE` ใน repository** และ `package.json` กำหนด `"private": true` โดย `documents/openapi.yaml` ระบุ license เป็น `Proprietary` — จึงยังยืนยันไม่ได้ว่าโปรเจกต์เผยแพร่ภายใต้สัญญาอนุญาตใด หากต้องการเผยแพร่ควรกำหนด License ให้ชัดเจน (ห้ามถือว่าเป็น MIT โดยปริยาย)
- **เจ้าของโครงการ:** ศูนย์การเรียนปัญญาภิวัฒน์ขอนแก่น (ตาม metadata และหน้าแรกของแอป)
- **Third-party services:** PostgreSQL (ฐานข้อมูล), Cloudinary (จัดเก็บรูป), Vercel (hosting และ cron), และ CDN `unpkg.com` สำหรับ Swagger UI
- **Dependencies หลัก:** Next.js, React, Prisma ORM, Zod, Argon2, SheetJS (`xlsx`), Tailwind CSS — สิทธิ์การใช้งานเป็นไปตาม license ของแต่ละแพ็กเกจใน `package-lock.json`

---

## ดัชนีเอกสาร

| เอกสาร | เนื้อหา |
| --- | --- |
| [`documents/openapi.yaml`](./documents/openapi.yaml) | OpenAPI 3.1 specification (source of truth ของ API contract) — เสิร์ฟที่ `/api/openapi` และแสดงผลที่ `/api-docs` |
| [`documents/API.md`](./documents/API.md) | สรุป endpoint, สิทธิ์การเข้าถึง, error code, วิธีตั้งค่า Postman |
| [`documents/API_DOCUMENTATION.md`](./documents/API_DOCUMENTATION.md) | รายละเอียดราย endpoint พร้อมผลการยิงทดสอบและข้อสังเกตจากโค้ด |
| [`documents/image-retention.md`](./documents/image-retention.md) | นโยบายเก็บ/ลบรูป 7 วัน, ข้อจำกัดของ Vercel Cron, และค่า `skippedWithoutPublicId` |
| [`prisma/schema.prisma`](./prisma/schema.prisma) | Data model ทั้งหมด |
| [`prisma/migrations/`](./prisma/migrations) | ประวัติ migration (SQL จริง) |
| [`tests/api-logic.test.mjs`](./tests/api-logic.test.mjs) | Unit tests ของ logic และ validation |
| [`AGENTS.md`](./AGENTS.md) | คำแนะนำสำหรับผู้ช่วย AI ในโปรเจกต์ (สถาปัตยกรรม, สิ่งที่ห้ามเปลี่ยน, design tokens, วิธีทำงาน) |
