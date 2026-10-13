# API Documentation — Panyapiwat Time Attendance

> เอกสารฉบับนี้สร้างจากการอ่านโค้ดจริงทุก route (23 ไฟล์) + ยิง API จริงทุกตัวบนเซิร์ฟเวอร์ `next dev`
> วันที่ตรวจ: 13 ต.ค. 2026 — ผล: **ผ่านทั้งหมด** (student flow 33 เคส + admin flow 20 เคส + unit test 7 เคส)

Base URL (local): `http://localhost:3000` (ตอนตรวจใช้ `:3100`)

---

## 1. กติกากลาง (ใช้กับทุกเส้น)

### 1.1 Auth — cookie session
- Login สำเร็จ เซิร์ฟเวอร์จะตั้ง cookie `attendance_session` (HttpOnly, SameSite=Strict, อายุ 12 ชม., Secure เฉพาะ production)
- ทุกเส้นยกเว้น register/login ต้องแนบ cookie นี้ ไม่แนบ → `401 UNAUTHENTICATED`
- Role มี 2 ค่า: `STUDENT` / `ADMIN` โดย `requireUser(role)` เช็กแบบเท่ากันเป๊ะ ไม่มีลำดับชั้น
  - STUDENT เรียกเส้น ADMIN → `403 FORBIDDEN`
  - ADMIN เรียกเส้น STUDENT (เช่น `/api/attendance/*`, `/api/leaves/me/*`) → `403` เช่นกัน (ยิงจริงยืนยันแล้ว)

### 1.2 Origin header (กัน CSRF)
- ทุก **POST / PATCH / DELETE** (ยกเว้น `POST /api/auth/register`) ต้องส่ง header `Origin` ที่ host ตรงกับ URL
- ไม่มี/ไม่ตรง → `403 { code: CSRF_REJECTED }` (ยิงจริงยืนยันแล้ว)
- ใน Postman: ใส่ `Origin: http://localhost:3000` ทุกครั้งที่ยิง mutation + เปิด cookie jar

### 1.3 รูปแบบ response
- สำเร็จ: JSON ตามแต่ละเส้น, ทุก response มี header `Cache-Control: no-store`
- ล้มเหลว: `{ "error": { "code": "...", "message": "...", "details?": {...} } }`

| HTTP | code | หมายถึง |
|---|---|---|
| 400 | `VALIDATION_ERROR` | zod ตรวจไม่ผ่าน (ดู `details` ระบุ field) |
| 401 | `UNAUTHENTICATED` / `INVALID_CREDENTIALS` | ยังไม่ login / username หรือ password ผิด |
| 403 | `CSRF_REJECTED` / `FORBIDDEN` | Origin ผิด / role ไม่ถึง |
| 404 | `NOT_FOUND` | ไม่พบ record (รวมของคนอื่น — ไม่บอกว่ามีอยู่) |
| 409 | `CONFLICT` / `ALREADY_CHECKED_OUT` / `CHECK_IN_REQUIRED` / `LAST_ADMIN_PROTECTION` | ข้อมูลชน / ลำดับ check-in/out ผิด |
| 429 | `RATE_LIMITED` | login ผิดเกิน 10 ครั้งใน 15 นาที (ต่อ username, case-insensitive) |
| 500 | `INTERNAL_ERROR` | ผิดพลาดฝั่งเซิร์ฟเวอร์ |

### 1.4 Pagination
`?page=` (เริ่ม 1, default 1) + `?pageSize=` (1–100, default 20) → response `{ items, pagination: { page, pageSize, total, totalPages } }`

### 1.5 เดือน/ปี (เขต Asia/Bangkok)
`?month=1..12&year=2000..2200` — ถ้าส่งมาข้างเดียว อีกข้างจะ default เป็นเดือน/ปีปัจจุบันของกรุงเทพฯ
`workDate` ตัดวันตามเที่ยงคืนกรุงเทพฯ (ยิงข้ามวันจริงไม่ได้ แต่มี unit test ยืนยัน rollover)

---

## 2. Auth (public)

### `POST /api/auth/register` — สมัครบัญชี STUDENT
- **Auth:** public, **ไม่ต้องใช้ Origin** (เส้นเดียวที่ยกเว้น)
- **Body (JSON):**

```json
{
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "studentId": "68012345",
  "employeeCode": "EMP001",
  "shopCode": "BKK01",
  "gradeLevel": 3,
  "password": "รหัสผ่านอย่างน้อย12ตัวอักษร"
}
```

| field | กติกา |
|---|---|
| firstName/lastName | string 1–80 ตัวอักษร (trim) |
| studentId | string 1–40 (trim) → ใช้เป็น `username` ด้วย |
| employeeCode/shopCode | optional, string ≤40 หรือ `""` |
| gradeLevel | optional, int 1–20 (coerce รับ `"3"` ได้) → เขียนลง `gradeLevel` และ `yearLevel` พร้อมกัน |
| password | string 12–128 ตัวอักษร, เก็บแบบ argon2id |

- **สำเร็จ `201`:** `{ user: { id, username, studentId, employeeCode, shopCode, gradeLevel, firstName, lastName, role: "STUDENT", createdAt } }` (role ล็อกโดย server)
- **ยิงจริง:** `201` สร้างได้ / สมัคร `studentId` ซ้ำ → `409 CONFLICT` / password สั้น → `400`
- **Note:** ซ้ำเช็ก `username OR studentId OR employeeCode` (ถ้าส่งมา)

### `POST /api/auth/login` — เข้าสู่ระบบ
- **Auth:** public + ต้องมี `Origin`
- **Body:** `{ "username": "<studentId | username | employeeCode>", "password": "..." }` (username trim 1–80, password 1–128)
- **สำเร็จ `200`:** `{ user: { id, firstName, lastName, username, role } }` + ตั้ง cookie
- **ยิงจริง:** ถูก → `200` + ได้ cookie / ผิด → `401 INVALID_CREDENTIALS` / ไม่มี Origin → `403`
- **Rate limit:** ผิดครบ 10 ครั้งใน 15 นาที → `429` (ไม่ได้ยิงทดสอบจนล็อก เพื่อไม่ให้บัญชีทดสอบโดนบล็อก — อ่านจาก `lib/auth.ts:75-96`)
- **Note:** ไม่เจอ user ก็ยัง verify password ด้วย dummy hash เพื่อกัน timing attack; login สำเร็จล้างตัวนับ; บัญชี `isActive=false` login ไม่ได้

### `POST /api/auth/logout` — ออกจากระบบ
- **Auth:** ไม่บังคับ login (ล้าง cookie ถ้ามี) + ต้องมี `Origin`
- **สำเร็จ `200`:** `{ success: true }` (ยิงจริง: หลัง logout เรียก `/api/users/me` ได้ `401` ทันที)

---

## 3. Profile (ต้อง login)

### `GET /api/users/me` — ดูโปรไฟล์ตัวเอง
- **สำเร็จ `200`:** `{ user: { id, username, role, firstName, lastName, studentId, employeeCode, shopCode, gradeLevel, yearLevel, isActive, createdAt, updatedAt } }`
- ไม่แนบ cookie → `401` (ยิงจริงยืนยัน)

### `PATCH /api/users/me` — แก้โปรไฟล์ตัวเอง
- ต้องมี `Origin`; แก้ได้แค่ 4 field: `firstName, lastName` (1–80), `gradeLevel` (int 1–20 หรือ `null`), `shopCode` (≤40 หรือ `null`)
- schema เป็น `.strict()` → ส่ง field แปลกปลอม (เช่น `role`, `unknownField`) → `400` (ยิงจริงยืนยัน)
- **Note:** ส่ง `gradeLevel` จะเขียนทับ `yearLevel` ด้วยค่าเดียวกันเสมอ (`services/user.service.ts:52-55`)
- **ยิงจริง:** `200` ได้ user ที่อัปเดตแล้ว

---

## 4. ลงเวลา (STUDENT)

### `POST /api/attendance/check-in` — เช็กเข้า
- **Auth:** STUDENT + `Origin` | **Body:** `multipart/form-data`

| field | กติกา |
|---|---|
| image | **บังคับ** — jpeg/png/webp, ≤5MB, ตรวจ magic bytes ด้วย (JPEG `FF D8 FF`, PNG signature, `RIFF....WEBP`) |
| moneyAmount | **บังคับ** — string ทศนิยม `/^\d{1,8}(\.\d{1,2})?$/` และ ≤ 99,999,999.99 (ห้ามติดลบ) |
| moneyType | **บังคับ** — `CASH` หรือ `TRUEMONEY` |
| note | optional — ≤1000 ตัวอักษร (ส่ง `""` ถือว่าไม่ส่ง) |

- **สำเร็จ `201`:** `{ attendance: {..., workDate, checkInAt, checkInPhotoUrl (Cloudinary), checkInNote, ...} }`
- **ยิงจริง:** `201` รูปขึ้น Cloudinary จริง / เช็กเข้าวันเดิมซ้ำ → `409` / `moneyAmount: "-5"` → `400`
- **Note:** กันเช็กเข้าซ้ำด้วย unique `(userId, workDate)`; สร้าง `MoneyEntry(direction=IN)` 1 รายการผูกกับ attendance

### `POST /api/attendance/check-out` — เช็กออก
- รับ multipart เหมือน check-in ทุกประการ (ต่างแค่สร้าง `MoneyEntry(direction=OUT)`)
- **สำเร็จ `200`:** `{ attendance: {..., checkOutAt, checkOutPhotoUrl, workMinutes} }`
- **ยิงจริง:** `200` / เช็กออกซ้ำ → `409 ALREADY_CHECKED_OUT` / เช็กออกโดยยังไม่เช็กเข้า (อีก user ที่ทดสอบ) → `409 CHECK_IN_REQUIRED`
- **Note:** `workMinutes = checkOutAt - checkInAt` (ปัดเป็นนาที); เวลา checkout ต้องหลัง check-in ไม่งั้น `INVALID_TIME_ORDER`

### `GET /api/attendance/me` — ประวัติของตัวเอง
- Query: `page, pageSize` + กรองเดือนด้วย `month/year` (ถ้าส่งมาข้างเดียวจะเติมอีกข้างให้)
- **สำเร็จ `200`:** `{ items: [...], pagination }` — ยิงจริง: ก่อนเช็กเข้าได้ `[]`, หลัง checkout ได้ 1 รายการ

### `GET /api/attendance/me/today` — สถานะวันนี้
- **สำเร็จ `200`:** `{ checkedIn, checkedOut, attendance | null }`
- ยิงจริง: ก่อนเช็กเข้า `{false,false,null}` → หลังเช็กเข้า `{true,false,{...}}`

### `GET /api/attendance/me/{id}` — รายละเอียด 1 รายการ (ของตัวเองเท่านั้น)
- `id` ต้องเป็น UUID ไม่ใช่ → `400` / เป็นของคนอื่นหรือไม่มี → `404` (ยิงจริงยืนยันทั้งสองเคส)

### `GET /api/attendance/me/monthly-summary?month=&year=` — สรุปชั่วโมงรายเดือน
- month/year ถ้าไม่ส่งจะใช้เดือนปัจจุบันกรุงเทพฯ
- **สำเร็จ `200` (ไม่มี wrapper):** `{ month, year, attendanceDays, checkInDays, checkOutDays, completeDays, incompleteDays, totalSeconds, totalMinutes, hours, minutes, averageMinutesPerCompleteDay, durationPolicy }`
- ยิงจริงเดือนที่ทดสอบ: ก่อน checkout ได้ `completeDays: 0` / หลัง checkout ได้ `completeDays: 1`
- **นโยบาย:** นับเฉพาะกะที่ checkout แล้ว (`checkOutAt` ไม่ null), เวลาคือ checkOut−checkIn ตรง ๆ **ไม่หักพัก**

### `GET /api/money-tracker/me?month=&year=` — เงินส่วนตัวรายเดือน
- **สำเร็จ `200` (ไม่มี wrapper):** `{ month, year, entries: [{ id, attendanceId, direction: IN|OUT, amount, moneyType, createdAt, attendance: { workDate } }], totals: { CASH: {in,out,net}, TRUEMONEY: {in,out,net}, net, note } }`
- ยอดเป็น string ทศนิยม (`"150"`, `"120.5"`) คำนวณแบบ exact ไม่ใช้ float (มี unit test ยืนยัน)
- ยิงจริง: เช็กเข้า `150.00/CASH` + เช็กออก `120.50/TRUEMONEY` ได้ entries 2 รายการตรงตามนั้น

---

## 5. การลา (STUDENT)

### `POST /api/leaves` — สร้างใบลา (ไม่ต้องอนุมัติ)
- ต้องมี `Origin`
- **Body:**

```json
{ "leaveType": "SICK", "startDate": "2026-10-13", "endDate": "2026-10-14", "reason": "เป็นไข้" }
```

- `leaveType` หรือ `type` อย่างใดอย่างหนึ่ง (ค่า `HOLIDAY | SICK | PERSONAL`) — ไม่ส่งเลย → `400`
- `startDate/endDate` รูป `YYYY-MM-DD`, ต้อง `startDate <= endDate` ไม่งั้น `400`
- `reason` optional ≤1000 (หรือ `null`)
- **สำเร็จ `201`:** `{ leave: { id, userId, type, startDate, endDate, reason, createdAt, updatedAt } }` (ยิงจริงยืนยัน)

### `GET /api/leaves` และ `GET /api/leaves/me` — ลิสต์ใบลาตัวเอง
- สองเส้นนี้**ทำงานเหมือนกันทุกประการ** (code คนละไฟล์แต่เรียก `listMyLeaves` เหมือนกัน มี pagination เหมือนกัน) — เห็นควรเหลือเส้นเดียวในอนาคต
- **สำเร็จ `200`:** `{ items, pagination }`

### `GET /api/leaves/me/{id}` — ดูใบลา 1 ใบ (ของตัวเอง)
### `PATCH /api/leaves/me/{id}` — แก้ใบลา
- ต้องมี `Origin`; **body ใช้ schema เดียวกับตอนสร้าง (ต้องส่งครบ ไม่ใช่ partial)** — ยิงจริงส่งครบแล้ว `200`
- ของคนอื่น → `404`
### `DELETE /api/leaves/me/{id}` — ลบใบลา
- ต้องมี `Origin` | **สำเร็จ `200`:** `{ success: true }`
- ยิงจริง: ลบของตัวเอง `200` → เปิดดูซ้ำได้ `404 NOT_FOUND` → ลบซ้ำได้ `404`

---

## 6. Admin (role ADMIN เท่านั้น)

ทุกเส้น: ไม่ใช่ ADMIN → `403` (ยิงจริงเอา STUDENT เรียก `/api/admin/users` ได้ `403`)

### `GET /api/admin/users` — ค้นหาผู้ใช้
Query: `q` (ค้น firstName/lastName/studentId/employeeCode, case-insensitive เฉพาะชื่อ), `role=STUDENT|ADMIN`, `shopCode`, `gradeLevel=1..20`, + pagination — ยิงจริงผ่านทุกตัวกรอง, `gradeLevel=99` → `400`

### `GET /api/admin/users/{id}` — ดูผู้ใช้ 1 คน (`200`, ไม่มี → `404` ทาง P2025)
### `PATCH /api/admin/users/{id}` — แก้โปรไฟล์/สถานะ (ต้องมี `Origin`)
Body (strict, optional ทั้งหมด): `firstName, lastName, gradeLevel|null, shopCode|null, employeeCode|null, studentId|null, isActive: boolean, role: ADMIN|STUDENT` — ยิงจริงแก้ `shopCode` ได้ `200`; ชน unique → `409`
### `PATCH /api/admin/users/{id}/role` — เปลี่ยน role (ต้องมี `Origin`)
Body: `{ "role": "ADMIN" | "STUDENT" }` — ยิงจริงเปลี่ยน STUDENT→ADMIN→STUDENT กลับได้ `200` ทั้งสองรอบ
**Note:** มีกันตัวเองลด role ตัวเอง (`409 LAST_ADMIN_PROTECTION`) — อ่านจาก `services/user.service.ts:151-157`, ไม่ได้ยิงเคสนี้เพื่อกันล็อกตัวเอง

### `GET /api/admin/attendance` — ดูการลงเวลาทั้งหมด
Query: `q, shopCode, date=YYYY-MM-DD, month/year, status=checked-in|checked-out, sort=asc|desc (default desc)` + pagination — ยิงจริงผ่านทุกตัวกรอง (`status/date/month` ได้รายการที่สร้างไว้ตรงกัน)

### `GET /api/admin/attendance/{id}` — รายละเอียด (`200` / ไม่มี → `404`, id ผิดรูป → `400`)
### `GET /api/admin/attendance/user/{userId}` — ประวัติรายคน + pagination (`200`)

### `GET /api/admin/leaves` — ดูใบลาทั้งหมด
Query: `type, month/year, userId(uuid), shopCode` + pagination — ยิงจริง `?type=PERSONAL` และ `?month&year` ได้ใบลาที่สร้างไว้
**Quirk ในโค้ด:** `adminLeavesQuerySchema` มี `month/year` แต่ route ไม่ใช้ค่าจากตรงนั้น ไปใช้ผล `monthYear()` แทน (`app/api/admin/leaves/route.ts:19-27`) — ผลลัพธ์เท่ากัน แต่ควรลบ field ซ้ำใน schema

### `GET /api/admin/reports/monthly-attendance?month=&year=` — รายงานรายเดือน
Query เสริม: `userId` (ต้อง uuid ถ้าส่ง), `shopCode` (string ธรรมดา ไม่ validate)
Response ตรง (ไม่มี wrapper): `{ month, year, users: [{ user: {...}, attendanceDays, completeDays, incompleteDays, totalSeconds, totalMinutes, hours, minutes }], totals: {..., durationPolicy } }` — ยิงจริงได้ยอดตรงกับที่ check-in/out ไว้

### `GET /api/admin/reports/money-tracker?month=&year=` — รายงานเงินรายเดือน
Query: month/year + pagination + `userId/shopCode` (แบบเดียวกับด้านบน)
Response: `{ month, year, items: [{ ..., attendance: { workDate, user: {...} } }], pagination }` — ยิงจริงได้ 2 entries (IN `150/CASH`, OUT `120.5/TRUEMONEY`)

---

## 7. ผลการตรวจ + ข้อควรแก้ (เรียงตามความสำคัญ)

1. **[แก้แล้วตอนตรวจ] DB ยังไม่ได้ migrate** — ตอนแรก `register/login` ได้ `500` เพราะ migration `20261013120000_backend_api_fields` (เพิ่ม `shopCode, gradeLevel, Session, LoginAttempt`) ยังไม่ถูก apply (`P2021 table LoginAttempt does not exist`, `column shopCode does not exist`) — รัน `npx prisma migrate deploy` แล้วผ่านหมด → **ก่อน deploy ครั้งหน้าต้องรัน migrate เสมอ**
2. **`GET /api/leaves` กับ `GET /api/leaves/me` ซ้ำกัน** — เห็นควร deprecated เส้นใดเส้นหนึ่ง
3. **`PATCH /api/leaves/me/{id}` ต้องส่ง body ครบเหมือนสร้าง** ไม่ใช่ partial update — ถ้าตั้งใจให้เป็นแบบนี้ควรระบุใน doc/UX ฝั่ง client
4. **PATCH profile เป็น strict** — client ส่ง field เกินมาแม้แต่ตัวเดียวจะ `400` (ยิงจริงยืนยัน) ฝั่ง frontend ต้อง whitelist field ก่อนส่ง
5. **`GET /api/admin/leaves` มี month/year ซ้ำซ้อน** (schema กับ `monthYear()`) — ควรลบออกจาก `adminLeavesQuerySchema`
6. **`shopCode` ใน report endpoints ไม่ validate** (ต่างจาก endpoint อื่นที่ `max(40)`) — ควรใช้ schema เดียวกัน
7. **Rate limit (429) ไม่ได้ยิงทดสอบ** — จงใจเลี่ยงเพื่อไม่ให้บัญชีโดนบล็อก 15 นาที โค้ดอ่านแล้วถูกต้อง (`≥10 ครั้ง/15 นาที ต่อ identifier`)
8. **รูปทดสอบอัปโหลดขึ้น Cloudinary จริง** — ข้อมูลทดสอบลบจาก DB แล้ว แต่ไฟล์รูปยังค้างบน Cloudinary (folder `attendance/<userId>/...`) ควรลบ manual ถ้าซีเรียส
9. `API.md` เดิมยังใช้ได้ แต่ไม่ตรงโค้ด 2 จุด: ไม่ได้บอกว่า `register` ไม่ต้องใช้ Origin (เส้นอื่นต้องใช้), และไม่บอกว่า `PATCH leave` ต้องส่งครบ — เอกสารฉบับนี้แก้ให้แล้ว

---

## 8. วิธีเรียกด้วย Postman (สรุป)

1. `POST /api/auth/register` (JSON, ไม่ต้องมี Origin) → สร้าง STUDENT
2. `POST /api/auth/login` (JSON + header `Origin: http://localhost:3000`) → ได้ cookie (เปิด cookie jar)
3. ใส่ `Origin` ทุก POST/PATCH/DELETE; multipart (check-in/out) เลือก `form-data`: `image`(file), `moneyAmount`(text), `moneyType`(text), `note`(text, optional)
4. หมดอายุ session (12 ชม.) / logout แล้วจะได้ `401` ต้อง login ใหม่
5. Admin: ต้องมีบัญชี role ADMIN (สมัครได้อย่างเดียวคือ STUDENT → ให้ ADMIN คนแรกปรับ role ผ่าน `PATCH /api/admin/users/{id}/role` หรืออัปเดต DB ตรง)

## 9. คำสั่งที่เกี่ยวข้อง

```bash
npm run dev                       # รัน dev
npx prisma migrate deploy         # apply migration ( wajib ก่อนรัน/ดีพลอย )
node --test tests/*.test.mjs      # unit test (7 เคส: timezone, month-range, summary, checkout rules, money totals, validators)
```
