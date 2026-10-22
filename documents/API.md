# Attendance API

Success responses return their documented JSON payload directly (no `{ ok, data }` wrapper). Errors use `{ "error": { "code", "message", "details"? } }` and every response sets `Cache-Control: no-store`. The only exception is `GET /api/openapi`, which returns the YAML specification and is cacheable for one hour.

Auth uses an HttpOnly, SameSite=Strict cookie named `attendance_session`; it is valid for 8 hours and is `Secure` in production. Public endpoints are `POST /api/auth/login`, `POST /api/auth/logout` (succeeds without a session), `POST /api/auth/register` (closed) and `GET /api/openapi`. `GET /api/cron/expire-attendance-images` uses `Authorization: Bearer <CRON_SECRET>` instead of a cookie.

`POST`, `PATCH` and `DELETE` requests (including `logout`, `change-password` and `reset-password`) require an `Origin` header matching the request origin; the closed register endpoint does not read the request at all. A missing or mismatched header returns `403 CSRF_REJECTED`. Send the same-origin `Origin` header in Postman for POST/PATCH/DELETE requests.

Pagination: `page` defaults to 1; `pageSize` defaults to 20 and is capped at 100. Paginated responses use `{ items, pagination: { page, pageSize, total, totalPages } }`. Month filters use Bangkok work dates and accept `month=1..12&year=2000..2200`. Supplying only one of them defaults the other to the current Bangkok value; summary/report endpoints default both when omitted, while list endpoints (`/api/attendance/me`, `/api/admin/attendance`, `/api/admin/leaves`) apply no month filter when neither is supplied.

## Authentication and profile

| Method and endpoint | Access | Purpose |
|---|---|---|
| `POST /api/auth/register` | Public | Always returns `410 REGISTRATION_DISABLED`; student self-registration is closed. |
| `POST /api/auth/login` | Public | JSON `{ "username": "student id", "password": "..." }`; students sign in with student ID, and ADMIN may also use employeeCode. Returns `{ user }` and sets the session cookie. |
| `POST /api/auth/logout` | Public (session optional) | Clears the session cookie and returns `{ "success": true }`. |
| `POST /api/auth/change-password` | Authenticated | JSON `{ "currentPassword", "newPassword", "sessionAction"?: "KEEP_CURRENT"\|"REVOKE_ALL" }`. `newPassword` is 15–128 characters and must differ from the current one. Returns `{ success, sessionAction, revokedSessions }`. |
| `GET /api/users/me` | Authenticated | Own profile as `{ user }`. |
| `PATCH /api/users/me` | Authenticated | Update only `firstName`, `lastName`, `gradeLevel`, `shopCode`. Strict schema; unknown fields are rejected. |
| `GET /api/openapi` | Public | OpenAPI 3.1 specification (`application/yaml`). |

## Student attendance, money and leaves

| Method and endpoint | Access | Purpose |
|---|---|---|
| `POST /api/attendance/check-in` | STUDENT | Multipart: required `image` (JPEG/PNG/WebP, ≤5 MB, magic bytes checked), `cashAmount` / `truemoneyAmount` (nonnegative decimal, up to 2 places, optional — at least one required) and optional `note` (≤1000). Returns `{ attendance, moneySummary }` with status `201`. |
| `POST /api/attendance/check-out` | STUDENT | Same multipart fields; requires an open shift from today or the previous day (within 24 hours), so checking out after midnight works. Returns `{ attendance, moneySummary }`. |
| `GET /api/attendance/me` | STUDENT | Own attendance, paginated; optional `month`/`year`. |
| `GET /api/attendance/me/today` | STUDENT | `{ checkedIn, checkedOut, attendance \| null, moneySummary \| null }`. If today has no record, returns the still-open shift from the previous day (within 24 hours) so it can be checked out. |
| `GET /api/attendance/me/{id}` | STUDENT | Own attendance detail only; other users' records return `404`. |
| `GET /api/attendance/me/monthly-summary?month=&year=` | STUDENT | Totals for complete shifts; excludes incomplete days and does not deduct breaks. |
| `GET /api/money-tracker/me?month=&year=` | STUDENT | Personal money records and CASH/TRUEMONEY in/out/net totals. |
| `POST /api/leaves` | STUDENT | JSON `{ "leaveType":"SICK", "startDate":"2026-10-13", "endDate":"2026-10-13", "reason":"..." }`. Types: `HOLIDAY`, `SICK`, `PERSONAL`; `type` is accepted as an alias of `leaveType`. No approval step. Dates in the past are rejected, and the range must not overlap another leave or any attendance day. Returns `{ leave }` with status `201`. |
| `GET /api/leaves` | STUDENT | Alias of `GET /api/leaves/me`; paginated own leave records. |
| `GET /api/leaves/me` | STUDENT | Own leave records, paginated. |
| `GET/PATCH/DELETE /api/leaves/me/{id}` | STUDENT | Read/update/delete own leave only. PATCH replaces the create fields (not a partial patch). |

## Admin

All admin routes require `ADMIN`; other roles get `403 FORBIDDEN`.

| Method and endpoint | Access | Purpose |
|---|---|---|
| `GET /api/admin/users` | ADMIN | Search via `q`; filters `role`, `shopCode`, `gradeLevel`; paginated. |
| `POST /api/admin/users` | ADMIN | Create one account. Students require both `studentId` and `employeeCode`; `employeeCode` (or `studentId`) becomes the initial password. Returns `{ user }` with status `201`. |
| `POST /api/admin/users/import` | ADMIN | JSON `{ "rows": [...] }`, max 500 rows / 1 MiB. Each row requires `line, studentId, firstName, lastName, employeeCode, branchName, programLevel, yearLevel, section, academicYear, semester`. `employeeCode` is the initial password and is stored only as an Argon2id hash. Duplicate identifiers within the file or database reject the entire batch. Success: `{ "importedCount": n }` with status `201`. |
| `GET/PATCH/DELETE /api/admin/users/{id}` | ADMIN | Read/update/delete profile and account status. DELETE is refused for your own account (`409 SELF_DELETE_PROTECTION`) and for users with attendance or leave history (`409 USER_HAS_RECORDS`). |
| `PATCH /api/admin/users/{id}/role` | ADMIN | JSON `{ "role": "ADMIN"\|"STUDENT" }`; the last active admin is protected (`409 LAST_ADMIN_PROTECTION`). |
| `POST /api/admin/users/{id}/reset-password` | ADMIN | Resets the password to `employeeCode` (or `studentId` when no employeeCode) and revokes the user's sessions. Returns `{ user, temporaryPassword }` — treat the response as sensitive. |
| `GET /api/admin/attendance` | ADMIN | Filter attendance using `q, shopCode, date, month, year, status, sort`; paginated. |
| `GET /api/admin/attendance/{id}` | ADMIN | Attendance detail as `{ attendance }`. |
| `GET /api/admin/attendance/user/{userId}` | ADMIN | A user's attendance, paginated. |
| `GET /api/admin/reports/monthly-attendance?month=&year=` | ADMIN | Monthly totals, optionally filtered by `shopCode, userId`. |
| `GET /api/admin/reports/money-tracker?month=&year=` | ADMIN | Money entries, paginated, optionally filtered by `shopCode, userId`. |
| `GET /api/admin/leaves` | ADMIN | Paginated leave list with optional `type, month, year, userId, shopCode`. |

## Cron

| Method and endpoint | Access | Purpose |
|---|---|---|
| `GET /api/cron/expire-attendance-images` | `Authorization: Bearer <CRON_SECRET>` | Deletes attendance images older than 7 days in batches. Returns `{ cutoff, processed, deleted, failed, skippedWithoutPublicId, hasMore }`. |

## Errors

| HTTP | Codes | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `PAST_LEAVE_NOT_ALLOWED`, `INVALID_JSON`, `INVALID_ENCODING`, `INVALID_IMAGE` | Invalid body, query/path parameter, image, amount, or a leave/holiday date in the past. |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `INVALID_CURRENT_PASSWORD`, `UNAUTHORIZED` | Missing/invalid session, wrong credentials, wrong current password, or invalid cron token. |
| 403 | `CSRF_REJECTED`, `FORBIDDEN` | Missing/mismatched `Origin`, or insufficient role. |
| 404 | `NOT_FOUND` | Record not found (including another user's record). |
| 409 | `CONFLICT`, `IMPORT_CONFLICT`, `USER_CONFLICT`, `ALREADY_CHECKED_OUT`, `CHECK_IN_REQUIRED`, `OPEN_ATTENDANCE_EXISTS`, `ON_LEAVE`, `LEAVE_OVERLAP`, `ATTENDANCE_EXISTS`, `INVALID_TIME_ORDER`, `LAST_ADMIN_PROTECTION`, `SELF_DELETE_PROTECTION`, `USER_HAS_RECORDS` | Duplicate data, leave/attendance conflict, invalid attendance state, or protected account operation. |
| 410 | `REGISTRATION_DISABLED` | Self-registration is closed. |
| 413 | `PAYLOAD_TOO_LARGE` | Import body over 1 MiB. |
| 429 | `RATE_LIMITED` | Login identifier temporarily blocked after 10 failed attempts in a 15-minute window. |
| 500 | `INTERNAL_ERROR` | Generic server failure. |

The API does not expose password hashes.

## Setup

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, the `CLOUDINARY_*` credentials and `CRON_SECRET`.
2. Generate Prisma Client: `npx prisma generate`.
3. Review the additive migration, then apply it in a controlled environment with `npx prisma migrate deploy`.
4. Run `npm run dev`.
5. Run checks with `npm test`, `npx tsc --noEmit` and `npm run lint`.

## Postman

1. Login with `POST /api/auth/login` (JSON + `Origin: http://localhost:3000`) and enable the cookie jar.
2. Select `multipart/form-data` for attendance writes with fields `image`, `cashAmount` / `truemoneyAmount` and `note`; use JSON for account, password and leave requests.
3. Send `Origin: http://localhost:3000` on every POST/PATCH/DELETE.
4. An expired session (8 hours) or logout returns `401` on protected routes; log in again.
