import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";
import { monthYear } from "@/validators/api";
import { monthRange } from "@/lib/time";
import { listUsers } from "@/services/user.service";
import {
  buildAdminAttendanceFilter,
  listAdminAttendance,
} from "@/services/attendance.service";
import { listAdminLeaves } from "@/services/leave.service";
import { getAdminMonthlyReport } from "@/services/monthly-report.service";

import LogoutButton from "../components/logout-button";

type AdminSearchParams = {
  month?: string | string[];
  year?: string | string[];
  q?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
  });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const session = await currentUser();

  if (!session) {
    redirect("/login?role=admin");
  }
  if (session.role !== "ADMIN") {
    redirect("/student");
  }

  const params = await searchParams;
  const query = first(params.q)?.trim() || "";
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month) ? { month: first(params.month)! } : {}),
      ...(first(params.year) ? { year: first(params.year)! } : {}),
    }),
  );

  const [users, report, attendance, leaves] = await Promise.all([
    listUsers(
      query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" as const } },
              { lastName: { contains: query, mode: "insensitive" as const } },
              { studentId: { contains: query } },
              { employeeCode: { contains: query } },
            ],
          }
        : {},
      0,
      20,
    ),
    getAdminMonthlyReport(month, year, {}),
    listAdminAttendance(
      buildAdminAttendanceFilter({ monthRange: monthRange(year, month) }),
      0,
      20,
      "desc",
    ),
    listAdminLeaves({}, 0, 10),
  ]);

  return (
    <main
      className="min-h-screen px-5 pb-12 pt-8 text-white sm:px-8"
      style={{
        background:
          "radial-gradient(900px 520px at 15% 0%, rgba(96,165,240,0.30), rgba(96,165,240,0) 60%), linear-gradient(180deg, #0e4a86 0%, #0a2e5a 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-blue-100">เจ้าหน้าที่ศูนย์การเรียน</p>
            <h1 className="text-2xl font-bold sm:text-3xl">ภาพรวมการฝึกอาชีพ</h1>
            <p className="mt-1 text-sm text-white/70">
              ประจำเดือน {month}/{year} • มาทำงาน{" "}
              {report.totals.attendanceDays} ครั้ง • ครบกะ{" "}
              {report.totals.completeDays} ครั้ง
            </p>
          </div>
          <LogoutButton />
        </header>

        {/* Month filter */}
        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/15 bg-white/[0.08] p-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="admin-month"
              className="block text-sm font-semibold text-white/90"
            >
              เดือน
            </label>
            <input
              id="admin-month"
              name="month"
              type="number"
              min={1}
              max={12}
              defaultValue={month}
              className="min-h-12 w-28 rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="admin-year"
              className="block text-sm font-semibold text-white/90"
            >
              ปี
            </label>
            <input
              id="admin-year"
              name="year"
              type="number"
              min={2000}
              max={2200}
              defaultValue={year}
              className="min-h-12 w-32 rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none"
            />
          </div>
          {query && <input type="hidden" name="q" value={query} />}
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-white px-5 text-base font-bold text-[#0b2f5c] hover:bg-blue-50"
          >
            ดูรายงาน
          </button>
        </form>

        {/* Monthly report */}
        <section className="rounded-2xl border border-white/15 bg-white/[0.08] p-5">
          <h2 className="text-lg font-semibold">
            รายงานรายเดือน {month}/{year} ({report.users.length} คน)
          </h2>
          {report.users.length === 0 ? (
            <p className="mt-2 text-sm text-white/60">
              เดือนนี้ยังไม่มีข้อมูลการลงเวลา
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-white/60">
                    <th className="px-3 py-2 font-medium">ชื่อ</th>
                    <th className="px-3 py-2 font-medium">รหัส</th>
                    <th className="px-3 py-2 font-medium">ร้าน</th>
                    <th className="px-3 py-2 font-medium">วันมา</th>
                    <th className="px-3 py-2 font-medium">ครบกะ</th>
                    <th className="px-3 py-2 font-medium">ชั่วโมงรวม</th>
                  </tr>
                </thead>
                <tbody>
                  {report.users.map((row) => (
                    <tr
                      key={row.user.id}
                      className="border-t border-white/10"
                    >
                      <td className="px-3 py-2">
                        {row.user.firstName} {row.user.lastName}
                      </td>
                      <td className="px-3 py-2">
                        {row.user.studentId ?? row.user.employeeCode ?? "–"}
                      </td>
                      <td className="px-3 py-2">
                        {row.user.shopCode ?? "–"}
                      </td>
                      <td className="px-3 py-2">{row.attendanceDays}</td>
                      <td className="px-3 py-2">{row.completeDays}</td>
                      <td className="px-3 py-2">
                        {row.hours} ชม. {row.minutes} นาที
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent attendance */}
        <section className="rounded-2xl border border-white/15 bg-white/[0.08] p-5">
          <h2 className="text-lg font-semibold">การลงเวลาล่าสุดในเดือนนี้</h2>
          {attendance.items.length === 0 ? (
            <p className="mt-2 text-sm text-white/60">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-white/60">
                    <th className="px-3 py-2 font-medium">ชื่อ</th>
                    <th className="px-3 py-2 font-medium">วันที่</th>
                    <th className="px-3 py-2 font-medium">เช็กอิน</th>
                    <th className="px-3 py-2 font-medium">เช็กเอาท์</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-white/10"
                    >
                      <td className="px-3 py-2">
                        {item.user.firstName} {item.user.lastName}
                      </td>
                      <td className="px-3 py-2">
                        {formatDate(item.workDate)}
                      </td>
                      <td className="px-3 py-2">
                        {formatDateTime(item.checkInAt)}
                      </td>
                      <td className="px-3 py-2">
                        {formatDateTime(item.checkOutAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {/* Users */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5">
            <h2 className="text-lg font-semibold">
              ผู้ใช้ ({users.total} คน)
            </h2>
            <form method="get" className="mt-3 flex gap-2">
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="year" value={year} />
              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="ค้นหาชื่อ / รหัส…"
                maxLength={100}
                className="min-h-12 w-full rounded-xl border border-white/20 bg-[#082c54]/60 px-4 text-base text-white outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                className="min-h-12 shrink-0 rounded-xl bg-white px-5 text-base font-bold text-[#0b2f5c] hover:bg-blue-50"
              >
                ค้นหา
              </button>
            </form>
            <ul className="mt-3 space-y-2">
              {users.items.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/20 px-4 py-3 text-sm"
                >
                  <span className="font-semibold">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-white/60">
                    {user.studentId ?? user.employeeCode ?? user.username} •{" "}
                    {user.role}
                    {user.isActive ? "" : " • ปิดใช้งาน"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Leaves */}
          <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5">
            <h2 className="text-lg font-semibold">ใบลาล่าสุด</h2>
            {leaves.items.length === 0 ? (
              <p className="mt-2 text-sm text-white/60">ยังไม่มีใบลา</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {leaves.items.map((leave) => (
                  <li
                    key={leave.id}
                    className="rounded-xl bg-black/20 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold">
                        {leave.user.firstName} {leave.user.lastName}
                      </span>
                      <span className="text-white/60">{leave.type}</span>
                    </div>
                    <p className="mt-1 text-white/70">
                      {formatDate(leave.startDate)} –{" "}
                      {formatDate(leave.endDate)}
                      {leave.reason ? ` • ${leave.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
