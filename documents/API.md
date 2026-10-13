# Attendance API

All responses are JSON and use `{ error: { code, message, details? } }` for errors. Private responses set `Cache-Control: no-store`. JSON mutations and multipart mutations require an `Origin` header matching the request host. Auth uses an HttpOnly, SameSite=Strict cookie; production sets Secure. Send the same-origin `Origin` header in Postman for POST/PATCH/DELETE requests.

Pagination: `page` defaults to 1; `pageSize` defaults to 20 and is capped at 100. Month filters use Bangkok work dates and accept `month=1..12&year=2000..2200`.

| Method and endpoint | Access | Purpose |
|---|---|---|
| `POST /api/auth/register` | Disabled | Always returns `410 REGISTRATION_DISABLED`; student self-registration is closed. |
| `POST /api/auth/login` | Public | JSON `{ "username": "student id", "password": "â€¦" }`; students sign in with student ID, and ADMIN may also use employeeCode. |
| `POST /api/admin/users/import` | ADMIN | Same-origin JSON `{ "rows": [...] }`, max 500 rows / 1 MB. Each row requires `line,studentId,firstName,lastName,employeeCode`; `shopCode,gradeLevel` are optional. `employeeCode` is the initial password and is stored only as an Argon2id hash. Duplicate identifiers within the file or database reject the entire import. Success: `{ "importedCount": n }`. |
| `POST /api/auth/logout` | Authenticated | Clear session cookie. |
| `POST /api/attendance/check-in` | STUDENT | Multipart fields: `image`, `moneyAmount` (nonnegative decimal, 2 places), `moneyType` (`CASH`/`TRUEMONEY`), optional `note`. |
| `POST /api/attendance/check-out` | STUDENT | Same multipart fields; requires today's check-in. |
| `GET /api/attendance/me` | STUDENT | Own attendance, paginated; optional month/year. |
| `GET /api/attendance/me/today` | STUDENT | Today's check-in/out state and money entries. |
| `GET /api/attendance/me/{id}` | STUDENT | Own attendance detail only. |
| `GET /api/attendance/me/monthly-summary?month=&year=` | STUDENT | Totals for complete shifts; excludes incomplete days and does not deduct breaks. |
| `GET /api/money-tracker/me?month=&year=` | STUDENT | Personal money records and CASH/TRUEMONEY in/out/net totals. |
| `POST /api/leaves` | STUDENT | JSON `{ "leaveType":"SICK", "startDate":"2026-10-13", "endDate":"2026-10-13", "reason":"â€¦" }`. Types: `HOLIDAY`, `SICK`, `PERSONAL`. |
| `GET /api/leaves/me` | STUDENT | Own leave records, paginated. |
| `GET/PATCH/DELETE /api/leaves/me/{id}` | STUDENT | Read/update/delete own leave only. PATCH uses the create fields. |
| `GET /api/users/me` | Authenticated | Own profile. |
| `PATCH /api/users/me` | Authenticated | Update only firstName, lastName, gradeLevel, shopCode. |
| `GET /api/admin/attendance` | ADMIN | Filter attendance using `q,shopCode,date,month,year,status`; paginated. |
| `GET /api/admin/attendance/{id}` | ADMIN | Attendance detail. |
| `GET /api/admin/attendance/user/{userId}` | ADMIN | A user's attendance, paginated. |
| `GET /api/admin/reports/monthly-attendance?month=&year=` | ADMIN | Monthly totals, optionally filtered by `shopCode,userId`. |
| `GET /api/admin/reports/money-tracker?month=&year=` | ADMIN | Money entries, paginated, optionally filtered by `shopCode,userId`. |
| `GET /api/admin/leaves` | ADMIN | Paginated leave list with optional `type,month,year,userId,shopCode`. |
| `GET /api/admin/users` | ADMIN | Search via `q`; filters `role,shopCode,gradeLevel`; paginated. |
| `GET/PATCH /api/admin/users/{id}` | ADMIN | Read/update profile and account status. |
| `PATCH /api/admin/users/{id}/role` | ADMIN | JSON `{ "role":"ADMIN"|"STUDENT" }`. |

Common errors: `400` validation, `401` missing/invalid session, `403` insufficient permission/origin, `404` not found, `409` duplicate or invalid attendance state, `410 REGISTRATION_DISABLED` self-registration closed, `413 PAYLOAD_TOO_LARGE` import body over 1 MB, `429` login identifier temporarily blocked after 10 failed attempts in a 15 minute window, `500` generic server failure. The API does not expose password hashes.

## Setup

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL, and Cloudinary credentials.
2. Generate Prisma Client: `npx prisma generate`.
3. Review the additive migration, then apply in a controlled environment with `npx prisma migrate deploy`.
4. Run `npm run dev`.

For Postman, select `multipart/form-data` for attendance writes and JSON for account and leave requests. Keep the cookie jar enabled and send `Origin: http://localhost:3000` when calling mutation endpoints locally. Login first, then call protected APIs.
