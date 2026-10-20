# API Documentation — Panyapiwat Time Attendance

> เอกสารฉบับนี้สร้างจากการอ่านโค้ดจริงทุก route (29 route handler) และรวบรวมผลการยิง API จริงบนเซิร์ฟเวอร์ `next dev`
> วันที่ยิงทดสอบ: 13 ต.ค. 2026 — ผล: **ผ่านทั้งหมด** (student flow 33 เคส + admin flow 20 เคส + unit test 7 เคส)
> ปรับปรุงล่าสุด: 20 ต.ค. 2026 — ตรวจโค้ดซ้ำ เพิ่ม endpoint ที่เพิ่มมาทีหลัง และแก้รายละเอียดให้ตรง implementation (endpoint ที่เพิ่มใหม่ยังไม่ได้ยิงทดสอบ)
>
> `documents/openapi.yaml` คือสเปกที่ตรงกับ implementation มากที่สุด (ให้บริการที่ `GET /api/openapi`) หากเอกสารนี้ขัดกับสเปก ให้ยึดสเปกและโค้ดจริง

Base URL (local): `http://localhost:3000` (ตอนตรวจใช้ `:3100`)

---

## 1. กติกากลาง (ใช้กับทุกเส้น)

### 1.1 Auth — cookie session
- Login สำเร็จ เซิร์ฟเวอร์จะตั้ง cookie `attendance_session` (HttpOnly, SameSite=Strict, อายุ 8 ชม., Secure เฉพาะ production)
- เส้นที่ต้องมี cookie: ทุกเส้นที่ระบุว่า Authenticated/STUDENT/ADMIN — ไม่แนบ → `401 UNAUTHENTICATED`
- ข้อยกเว้นที่ไม่ใช้ cookie: `POST /api/auth/register` (ปิด), `POST /api/auth/login`, `POST /api/auth/logout` (สำเร็จแม้ไม่มี session), `GET /api/openapi` (public) และ `GET /api/cron/expire-attendance-images` (ใช้ `Authorization: Bearer <CRON_SECRET>`)
- Role มี 2 ค่า: `STUDENT` / `ADMIN` โดย `requireUser(role)` เช็กแบบเท่ากันเป๊ะ ไม่มีลำดับชั้น
  - STUDENT เรียกเส้น ADMIN → `403 FORBIDDEN`
  - ADMIN เรียกเส้น STUDENT (เช่น `/api/attendance/*`, `/api/leaves/me/*`) → `403` เช่นกัน

### 1.2 Origin header (กัน CSRF)
- ทุก endpoint ที่เปลี่ยนข้อมูล (รวม `logout`, `change-password`, `reset-password`) ต้องส่ง header `Origin` ที่ host ตรงกับ URL; register ถูกปิดและไม่เปลี่ยนข้อมูล จึงคืน `410 REGISTRATION_DISABLED`
- ไม่มี/ไม่ตรง → `403 { code: CSRF_REJECTED }` (ยิงจริงยืนยันแล้ว)
- ใน Postman: ใส่ `Origin: http://localhost:3000` ทุกครั้งที่ยิง mutation + เปิด cookie jar

### 1.3 รูปแบบ response
- สำเร็จ: JSON ตามแต่ละเส้น (ไม่มี wrapper `{ ok, data }`) และทุก response ตั้ง `Cache-Control: no-store` — ยกเว้น `GET /api/openapi` ที่ตอบ YAML และ cache ได้ 1 ชม.
- ล้มเหลว: `{ "error": { "code": "...", "message": "...", "details?": {...} } }`

| HTTP | code | หมายถึง |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `INVALID_ENCODING`, `INVALID_IMAGE` | zod ตรวจไม่ผ่าน (ดู `details` ระบุ field) / JSON หรือ UTF-8 ผิดรูป / รูปไม่ใช่ JPEG-PNG-WebP หรือเกิน 5 MB |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `INVALID_CURRENT_PASSWORD`, `UNAUTHORIZED` | ยังไม่ login / username หรือ password ผิด / รหัสผ่านปัจจุบันผิด / cron token ผิด |
| 403 | `CSRF_REJECTED` / `FORBIDDEN` | Origin ผิด / role ไม่ถึง |
| 404 | `NOT_FOUND` | ไม่พบ record (รวมของคนอื่น — ไม่บอกว่ามีอยู่) |
| 409 | `CONFLICT`, `IMPORT_CONFLICT`, `USER_CONFLICT`, `ALREADY_CHECKED_OUT`, `CHECK_IN_REQUIRED`, `INVALID_TIME_ORDER`, `LAST_ADMIN_PROTECTION`, `SELF_DELETE_PROTECTION`, `USER_HAS_RECORDS` | ข้อมูลชน / ลำดับ check-in/out ผิด / ละเมิดกฎป้องกันบัญชี |
| 410 | `REGISTRATION_DISABLED` | ปิดการสมัคร STUDENT เอง |
| 413 | `PAYLOAD_TOO_LARGE` | request import มีขนาดเกิน 1 MB |
| 429 | `RATE_LIMITED` | login ผิดเกิน 10 ครั้งใน 15 นาที (ต่อ username, case-insensitive) |
| 500 | `INTERNAL_ERROR` | ผิดพลาดฝั่งเซิร์ฟเวอร์ |

### 1.4 Pagination
`?page=` (เริ่ม 1, default 1) + `?pageSize=` (1–100, default 20) → response `{ items, pagination: { page, pageSize, total, totalPages } }`

### 1.5 เดือน/ปี (เขต Asia/Bangkok)
`?month=1..12&year=2000..2200` — ถ้าส่งมาข้างเดียว อีกข้างจะ default เป็นเดือน/ปีปัจจุบันของกรุงเทพฯ
ถ้าไม่ส่งเลย: `monthly-summary`, `money-tracker/me` และ report ของ ADMIN ใช้เดือน/ปีปัจจุบัน ส่วน `attendance/me`, `admin/attendance`, `admin/leaves` จะไม่กรองเดือน
`workDate` ตัดวันตามเที่ยงคืนกรุงเทพฯ (ยิงข้ามวันจริงไม่ได้ แต่มี unit test ยืนยัน rollover)

---

## 2. Auth and student onboarding

### `POST /api/auth/register` — ปิดการสมัครเอง
- **Auth:** public; ไม่อ่าน body และไม่สร้างบัญชี
- **Response:** `410 { "error": { "code": "REGISTRATION_DISABLED", "message": "Student self-registration is disabled" } }`
- บัญชีนักศึกษาต้องสร้างผ่าน `POST /api/admin/users/import` โดย ADMIN เท่านั้น

### `POST /api/auth/login` — เข้าสู่ระบบ
- **Auth:** public + ต้องมี `Origin`
- **Body:** `{ "username": "<studentId | username | admin employeeCode>", "password": "..." }` (username trim 1–80, password 1–128); นักศึกษาใช้ studentId เป็น username
- **สำเร็จ `200`:** `{ user: { id, firstName, lastName, username, role } }` + ตั้ง cookie
- **ยิงจริง:** ถูก → `200` + ได้ cookie / ผิด → `401 INVALID_CREDENTIALS` / ไม่มี Origin → `403`
- **Rate limit:** ผิดครบ 10 ครั้งใน 15 นาที → `429` (ไม่ได้ยิงทดสอบจนล็อก เพื่อไม่ให้บัญชีทดสอบโดนบล็อก — อ่านจาก `lib/auth.ts:75-96`)
- **Note:** ไม่เจอ user ก็ยัง verify password ด้วย dummy hash เพื่อกัน timing attack; login สำเร็จล้างตัวนับ; บัญชี `isActive=false` login ไม่ได้

### `POST /api/admin/users/import` — นำเข้าบัญชีนักศึกษา
- **Auth:** ADMIN + ต้องมี `Origin` ตรงกับ host ของ URL
- **Body:** `{ "rows": [{ "line": 2, "studentId": "68012345", "firstName": "สมชาย", "lastName": "ใจดี", "employeeCode": "EMP001", "shopCode": "BKK01", "gradeLevel": 3 }] }`
- สูงสุด 500 รายชื่อและ body ไม่เกิน 1 MB; `studentId`, `firstName`, `lastName`, `employeeCode` เป็นข้อมูลบังคับ; `shopCode` และ `gradeLevel` เป็น optional
- studentId และ employeeCode ต้องไม่ซ้ำกันข้ามทั้งสองฟิลด์ภายในไฟล์ และต้องไม่ชน username/studentId/employeeCode ที่มีอยู่ในฐานข้อมูล; หากพบข้อมูลซ้ำจะไม่สร้างรายการใดใน batch
- สำเร็จ `201`: `{ "importedCount": 1 }`; password เริ่มต้นคือ employeeCode, เก็บด้วย Argon2id hash และไม่ส่ง hash หรือ password กลับใน response
- กรณี unique conflict ที่เกิดพร้อมกันจากคำขออื่น ฐานข้อมูลปฏิเสธ `createMany` ทั้ง batch เช่นกัน (`409 CONFLICT`)

### `POST /api/auth/logout` — ออกจากระบบ
- **Auth:** ไม่บังคับ login (ล้าง cookie ถ้ามี) + ต้องมี `Origin`
- **สำเร็จ `200`:** `{ success: true }` (ยิงจริง: หลัง logout เรียก `/api/users/me` ได้ `401` ทันที)

### `POST /api/auth/change-password` — เปลี่ยนรหัสผ่านของตัวเอง
- **Auth:** ทุก role ที่ login แล้ว + ต้องมี `Origin`
- **Body:** `{ "currentPassword": "...", "newPassword": "...", "sessionAction": "KEEP_CURRENT" | "REVOKE_ALL" }`
- `newPassword` 15–128 ตัวอักษร และต้องต่างจากรหัสเดิม; `sessionAction` ไม่ส่ง = `KEEP_CURRENT`
- **สำเร็จ `200`:** `{ success: true, sessionAction, revokedSessions: [{ createdAt }] }`
- **Error:** รหัสปัจจุบันผิด → `401 INVALID_CURRENT_PASSWORD`; ไม่ได้ login → `401`; body ผิด → `400`
- **Note:** `KEEP_CURRENT` (ค่าเริ่มต้น) ลบ session อื่นทั้งหมดแต่คง session ที่ใช้เรียกไว้; `REVOKE_ALL` ลบทุก session รวม session ปัจจุบันแล้วล้าง cookie (ต้อง login ใหม่); ไม่ส่ง password hash กลับ

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
| cashAmount | optional — เงินสด, string ทศนิยม `/^\d{1,8}(\.\d{1,2})?$/` และ ≤ 99,999,999.99 (ห้ามติดลบ) |
| truemoneyAmount | optional — TrueMoney, กติกาเดียวกับ cashAmount |
| note | optional — ≤1000 ตัวอักษร (ส่ง `""` ถือว่าไม่ส่ง) |

- ต้องส่ง `cashAmount` หรือ `truemoneyAmount` อย่างน้อยหนึ่งช่อง (เว้นว่าง = ไม่บันทึกแถวประเภทนั้น)

- **สำเร็จ `201`:** `{ attendance: {..., workDate, checkInAt, checkInPhotoUrl (Cloudinary), checkInNote, ...}, moneySummary: { CASH: {in,out,spent,complete}, TRUEMONEY: {...}, totalSpent, complete } }`
- **ยิงจริง:** `201` รูปขึ้น Cloudinary จริง / เช็กเข้าวันเดิมซ้ำ → `409` / `cashAmount: "-5"` → `400`
- **Note:** กันเช็กเข้าซ้ำด้วย unique `(userId, workDate)`; สร้าง `MoneyEntry(direction=IN)` แยกตามประเภทที่กรอก (สูงสุด 2 รายการ) ผูกกับ attendance

### `POST /api/attendance/check-out` — เช็กออก
- รับ multipart เหมือน check-in ทุกประการ (ต่างแค่สร้าง `MoneyEntry(direction=OUT)` แยกตามประเภทที่กรอก)
- **สำเร็จ `200`:** `{ attendance: {..., checkOutAt, checkOutPhotoUrl, workMinutes}, moneySummary: { CASH: {in,out,spent,complete}, TRUEMONEY: {...}, totalSpent, complete } }` — `spent = IN − OUT` ต่อประเภท, `totalSpent` คือยอดรวม
- **ยิงจริง:** `200` / เช็กออกซ้ำ → `409 ALREADY_CHECKED_OUT` / เช็กออกโดยยังไม่เช็กเข้า (อีก user ที่ทดสอบ) → `409 CHECK_IN_REQUIRED`
- **Note:** `workMinutes = checkOutAt - checkInAt` (ปัดเป็นนาที); เวลา checkout ต้องหลัง check-in ไม่งั้น `INVALID_TIME_ORDER`

### `GET /api/attendance/me` — ประวัติของตัวเอง
- Query: `page, pageSize` + กรองเดือนด้วย `month/year` (ถ้าส่งมาข้างเดียวจะเติมอีกข้างให้)
- **สำเร็จ `200`:** `{ items: [...], pagination }` — ยิงจริง: ก่อนเช็กเข้าได้ `[]`, หลัง checkout ได้ 1 รายการ

### `GET /api/attendance/me/today` — สถานะวันนี้
- **สำเร็จ `200`:** `{ checkedIn, checkedOut, attendance | null, moneySummary | null }`
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

### `POST /api/admin/users` — สร้างบัญชีทีละคน
- **Auth:** ADMIN + `Origin`
- **Body (strict):** `firstName` และ `lastName` บังคับ; `studentId`, `employeeCode`, `shopCode` (≤40), `gradeLevel` (1–20), `role` (default `STUDENT`), `isActive` (default `true`) เป็น optional
- ถ้า `role=STUDENT` ต้องมีทั้ง `studentId` และ `employeeCode`; `username` ที่สร้างคือ `studentId ?? employeeCode` และ password เริ่มต้นคือ `employeeCode ?? studentId`
- **สำเร็จ `201`:** `{ user }`; ข้อมูลชน unique → `409 USER_CONFLICT`
- **หมายเหตุ:** ใช้สำหรับสร้างบัญชีเดียว/บัญชี ADMIN; การนำเข้านักศึกษาจำนวนมากใช้ `/api/admin/users/import`

### `GET /api/admin/users/{id}` — ดูผู้ใช้ 1 คน (`200`, ไม่มี → `404` ทาง P2025)
### `PATCH /api/admin/users/{id}` — แก้โปรไฟล์/สถานะ (ต้องมี `Origin`)
Body (strict, optional ทั้งหมด): `firstName, lastName, gradeLevel|null, shopCode|null, employeeCode|null, studentId|null, isActive: boolean, role: ADMIN|STUDENT` — ยิงจริงแก้ `shopCode` ได้ `200`; ชน unique → `409`
### `DELETE /api/admin/users/{id}` — ลบบัญชี (ต้องมี `Origin`)
- **สำเร็จ `200`:** `{ id, deleted: true }`
- ลบบัญชีตัวเอง → `409 SELF_DELETE_PROTECTION`; บัญชีที่มีประวัติลงเวลาหรือใบลา → `409 USER_HAS_RECORDS`
### `PATCH /api/admin/users/{id}/role` — เปลี่ยน role (ต้องมี `Origin`)
Body: `{ "role": "ADMIN" | "STUDENT" }` — ยิงจริงเปลี่ยน STUDENT→ADMIN→STUDENT กลับได้ `200` ทั้งสองรอบ
**Note:** มีกันตัวเองลด role ตัวเอง (`409 LAST_ADMIN_PROTECTION`) — อ่านจาก `services/user.service.ts:151-157`, ไม่ได้ยิงเคสนี้เพื่อกันล็อกตัวเอง
### `POST /api/admin/users/{id}/reset-password` — รีเซ็ตรหัสผ่าน (ต้องมี `Origin`)
- **Auth:** ADMIN
- รีเซ็ตเป็น `employeeCode` (ถ้าไม่มีใช้ `studentId`, ถ้าไม่มีทั้งคู่สุ่ม hex 12 ตัว) และ revoke session ทั้งหมดของผู้ใช้คนนั้น
- **สำเร็จ `200`:** `{ user, temporaryPassword }` — `temporaryPassword` ส่งกลับครั้งเดียว ควรถือเป็นข้อมูลอ่อนไหว
- ไม่พบผู้ใช้ → `404`; id ผิดรูป → `400`

### `GET /api/admin/attendance` — ดูการลงเวลาทั้งหมด
Query: `q, shopCode, date=YYYY-MM-DD, month/year, status=checked-in|checked-out, sort=asc|desc (default desc)` + pagination — ยิงจริงผ่านทุกตัวกรอง (`status/date/month` ได้รายการที่สร้างไว้ตรงกัน)

### `GET /api/admin/attendance/{id}` — รายละเอียด (`200` / ไม่มี → `404`, id ผิดรูป → `400`)
### `GET /api/admin/attendance/user/{userId}` — ประวัติรายคน + pagination (`200`)

### `GET /api/admin/leaves` — ดูใบลาทั้งหมด
Query: `type, month/year, userId(uuid), shopCode` + pagination — ยิงจริง `?type=PERSONAL` และ `?month&year` ได้ใบลาที่สร้างไว้
**Quirk ในโค้ด:** `adminLeavesQuerySchema` มี `month/year` (ใช้แค่ validate) แต่ route เรียก `monthYear()` เฉพาะเมื่อส่ง `month` หรือ `year` อย่างน้อยหนึ่งค่า ถ้าไม่ส่งเลยจะไม่กรองเดือน (`app/api/admin/leaves/route.ts:19-27`) — ควรลบ field ซ้ำใน schema

### `GET /api/admin/reports/monthly-attendance?month=&year=` — รายงานรายเดือน
Query เสริม: `userId` (ต้อง uuid ถ้าส่ง), `shopCode` (string ธรรมดา ไม่ validate)
Response ตรง (ไม่มี wrapper): `{ month, year, users: [{ user: {...}, attendanceDays, completeDays, incompleteDays, totalSeconds, totalMinutes, hours, minutes }], totals: {..., durationPolicy } }` — ยิงจริงได้ยอดตรงกับที่ check-in/out ไว้

### `GET /api/admin/reports/money-tracker?month=&year=` — รายงานเงินรายเดือน
Query: month/year + pagination + `userId/shopCode` (แบบเดียวกับด้านบน)
Response: `{ month, year, items: [{ ..., attendance: { workDate, user: {...} } }], pagination }` — ยิงจริงได้ 2 entries (IN `150/CASH`, OUT `120.5/TRUEMONEY`)

---

## 7. งานเบื้องหลังและสเปก

### `GET /api/cron/expire-attendance-images` — ลบรูปลงเวลาที่หมดอายุ
- **Auth:** `Authorization: Bearer <CRON_SECRET>` (ไม่ใช้ cookie และไม่ต้องส่ง `Origin`)
- ลบรูป check-in/check-out ที่เก่ากว่า 7 วันทีละ batch แล้วล้าง URL/publicId ในฐานข้อมูล
- **สำเร็จ `200`:** `{ cutoff, processed, deleted, failed, skippedWithoutPublicId, hasMore }`
- token ไม่ถูกต้อง/ไม่มี → `401 UNAUTHORIZED`; งานล้มเหลว → `500 INTERNAL_ERROR`

### `GET /api/openapi` — สเปก OpenAPI
- **Auth:** public; ไม่ต้องมี cookie หรือ `Origin`
- ตอบ `application/yaml` (ไม่ใช่ JSON) จากไฟล์ `documents/openapi.yaml`
- ใช้เป็นแหล่งอ้างอิงหลักของ client เมื่อเอกสาร Markdown ขัดกับโค้ด

---

## 8. ผลการตรวจ + ข้อควรแก้ (เรียงตามความสำคัญ)

1. **[แก้แล้วตอนตรวจ] DB ยังไม่ได้ migrate** — ตอนแรก `register/login` ได้ `500` เพราะ migration `20261013120000_backend_api_fields` (เพิ่ม `shopCode, gradeLevel, Session, LoginAttempt`) ยังไม่ถูก apply (`P2021 table LoginAttempt does not exist`, `column shopCode does not exist`) — รัน `npx prisma migrate deploy` แล้วผ่านหมด → **ก่อน deploy ครั้งหน้าต้องรัน migrate เสมอ**
2. **`GET /api/leaves` กับ `GET /api/leaves/me` ซ้ำกัน** — เห็นควร deprecated เส้นใดเส้นหนึ่ง
3. **`PATCH /api/leaves/me/{id}` ต้องส่ง body ครบเหมือนสร้าง** ไม่ใช่ partial update — ถ้าตั้งใจให้เป็นแบบนี้ควรระบุใน doc/UX ฝั่ง client
4. **PATCH profile เป็น strict** — client ส่ง field เกินมาแม้แต่ตัวเดียวจะ `400` (ยิงจริงยืนยัน) ฝั่ง frontend ต้อง whitelist field ก่อนส่ง
5. **`GET /api/admin/leaves` มี month/year ซ้ำซ้อน** (schema กับ `monthYear()`) — ควรลบออกจาก `adminLeavesQuerySchema`
6. **`shopCode` ใน report endpoints ไม่ validate** (ต่างจาก endpoint อื่นที่ `max(40)`) — ควรใช้ schema เดียวกัน
7. **Rate limit (429) ไม่ได้ยิงทดสอบ** — จงใจเลี่ยงเพื่อไม่ให้บัญชีโดนบล็อก 15 นาที โค้ดอ่านแล้วถูกต้อง (`≥10 ครั้ง/15 นาที ต่อ identifier`)
8. **รูปทดสอบอัปโหลดขึ้น Cloudinary จริง** — ข้อมูลทดสอบลบจาก DB แล้ว แต่ไฟล์รูปยังค้างบน Cloudinary (folder `attendance/<userId>/...`) ควรลบ manual ถ้าซีเรียส
9. `API.md` เป็นสรุป endpoint; `documents/openapi.yaml` เป็นสเปกเครื่องอ่านที่ตรงกับ implementation และเสิร์ฟที่ `GET /api/openapi` — ดูรายละเอียด import, auth และ response ในเอกสารนี้ประกอบกับสเปก

---

## 9. วิธีเรียกด้วย Postman (สรุป)

1. `POST /api/auth/register` ถูกปิดและคืน `410 REGISTRATION_DISABLED`
2. Admin login ด้วยบัญชี ADMIN ที่ provision ไว้ แล้ว `POST /api/admin/users/import` ด้วย JSON และ header `Origin: http://localhost:3000` เพื่อสร้างบัญชีนักศึกษา
3. `POST /api/auth/login` (JSON + header `Origin: http://localhost:3000`) → ได้ cookie (เปิด cookie jar); นักศึกษาใช้ studentId และ employeeCode เป็นรหัสผ่านเริ่มต้น
4. ใส่ `Origin` ทุก POST/PATCH/DELETE; multipart (check-in/out) เลือก `form-data`: `image`(file), `cashAmount`(text), `truemoneyAmount`(text), `note`(text, optional) — ต้องกรอก `cashAmount` หรือ `truemoneyAmount` อย่างน้อยหนึ่งช่อง
5. หมดอายุ session (8 ชม.) / logout แล้วจะได้ `401` ต้อง login ใหม่

## 10. คำสั่งที่เกี่ยวข้อง

```bash
npm run dev                       # รัน dev
npx prisma migrate deploy         # apply migration (ต้องรันก่อนรัน/ดีพลอย)
npm test                          # unit test (7 เคส: timezone, month-range, summary, checkout rules, money totals, validators)
npx tsc --noEmit                  # typecheck
npm run lint                      # lint
```
