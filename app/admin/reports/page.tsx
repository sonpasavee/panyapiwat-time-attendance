import Link from "next/link";

import { requireAdminPage } from "@/lib/page-auth";
import { monthYear } from "@/validators/api";
import {
  getDailyReport,
  getMonthlyReportOverview,
  listActiveShopCodes,
} from "@/services/admin-report.service";

import ExportExcelModal, {
  type DailyExportRow,
  type MonthlyExportRow,
} from "../../components/export-excel-modal";
import {
  addDaysISO,
  AlertIcon,
  Avatar,
  ChartIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  formatClock,
  formatHours,
  isValidDateISO,
  monthLabel,
  PersonIcon,
  ReportStat,
  shortDayLabel,
  StatusBadge,
  thaiYear,
  todayISO,
} from "../../components/report-helpers";

export const instant = false;

type SearchParams = {
  view?: string | string[];
  date?: string | string[];
  month?: string | string[];
  year?: string | string[];
  q?: string | string[];
  shopCode?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function str(value: string | string[] | undefined) {
  const v = first(value)?.trim();
  return v ? v : undefined;
}

function qs(params: Record<string, string>) {
  return `?${new URLSearchParams(params).toString()}`;
}

function shiftMonth(month: number, year: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const view = first(params.view) === "monthly" ? "monthly" : "daily";
  const q = str(params.q) ?? "";
  const shopCode = str(params.shopCode) ?? "";
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(str(params.month) ? { month: str(params.month)! } : {}),
      ...(str(params.year) ? { year: str(params.year)! } : {}),
    }),
  );

  const dateParam = str(params.date);
  const date = isValidDateISO(dateParam) ? dateParam : todayISO();
  const filter = { ...(q ? { q } : {}), ...(shopCode ? { shopCode } : {}) };

  const [daily, monthly, shops] = await Promise.all([
    getDailyReport(date, filter),
    getMonthlyReportOverview(month, year, filter),
    listActiveShopCodes(),
  ]);

  const shopOptions = shops.map((s) => s.shopCode).filter((c): c is string => !!c);
  const baseFilterParams = { ...(q ? { q } : {}), ...(shopCode ? { shopCode } : {}) };

  const dailyHref = (d: string) =>
    `/admin/reports${qs({ view: "daily", date: d, ...baseFilterParams })}`;
  const monthlyHref = (m: number, y: number) =>
    `/admin/reports${qs({ view: "monthly", month: String(m), year: String(y), ...baseFilterParams })}`;
  const prevMonth = shiftMonth(month, year, -1);
  const nextMonth = shiftMonth(month, year, 1);

  // ข้อมูลสำหรับ export (serialize ฝั่ง server แล้วส่งให้ modal ฝั่ง client)
  const dailyExport: DailyExportRow[] = daily.rows.map((r) => ({
    name: `${r.user.firstName} ${r.user.lastName}`,
    code: r.user.studentId ?? r.user.employeeCode ?? "–",
    shop: r.user.shopCode ?? "–",
    checkIn: formatClock(r.checkInAt),
    checkOut: formatClock(r.checkOutAt),
    hours: formatHours(r.workMinutes),
    status:
      r.status === "COMPLETE" ? "ครบ"
      : r.status === "WORKING" ? "กำลังทำงาน"
      : r.status === "NO_CHECKIN" ? "ยังไม่เช็กอิน"
      : r.status === "SICK" ? "ลาป่วย"
      : r.status === "PERSONAL" ? "ลากิจ"
      : "วันหยุด",
    photo: [r.checkInPhotoUrl, r.checkOutPhotoUrl].filter(Boolean).join(" "),
  }));
  const monthlyExport: MonthlyExportRow[] = monthly.rows.map((r) => ({
    name: `${r.user.firstName} ${r.user.lastName}`,
    code: r.user.studentId ?? r.user.employeeCode ?? "–",
    shop: r.user.shopCode ?? "–",
    attendanceDays: r.attendanceDays,
    completeDays: r.completeDays,
    leaveDays: r.leaveDays,
    hours: formatHours(r.totalMinutes),
    avgPerDay: formatHours(
      r.attendanceDays > 0 ? Math.round(r.totalMinutes / r.attendanceDays) : null,
    ),
  }));
  const [dy, dm, dd] = date.split("-").map(Number);
  const dayFilename = `ชั่วโมงทำงาน_${thaiYear(dy)}-${String(dm).padStart(2, "0")}-${String(dd).padStart(2, "0")}.xlsx`;
  const monthFilename = `ชั่วโมงทำงาน_${thaiYear(year)}-${String(month).padStart(2, "0")}.xlsx`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <header className="mr-auto">
          <h1 className="m-0 text-[28px] font-bold leading-snug">รายงานชั่วโมงทำงาน</h1>
          <p className="muted mt-0.5 text-[15px]">
            {view === "daily" ? "สรุปชั่วโมงทำงานรายวันของแต่ละคน" : "สรุปชั่วโมงทำงานรายเดือนของแต่ละคน"}
          </p>
        </header>

        <nav aria-label="สลับมุมมองรายงาน" className="flex gap-1 rounded-2xl bg-[#e9eff9] p-1.5">
          <Link
            href={dailyHref(date)}
            aria-current={view === "daily" ? "page" : undefined}
            className={`flex min-h-[44px] items-center rounded-xl px-5 text-sm no-underline ${
              view === "daily" ? "bg-white font-bold text-[#0f1f3a] shadow-sm" : "font-medium text-[#5b6b82]"
            }`}
          >
            รายวัน
          </Link>
          <Link
            href={monthlyHref(month, year)}
            aria-current={view === "monthly" ? "page" : undefined}
            className={`flex min-h-[44px] items-center rounded-xl px-5 text-sm no-underline ${
              view === "monthly" ? "bg-white font-bold text-[#0f1f3a] shadow-sm" : "font-medium text-[#5b6b82]"
            }`}
          >
            รายเดือน
          </Link>
        </nav>

        {view === "daily" ? (
          <div className="card flex items-center gap-1 !rounded-full py-1.5 pl-2 pr-3">
            <Link
              href={dailyHref(addDaysISO(date, -1))}
              aria-label="วันก่อนหน้า"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef3fa] text-[#33425b] no-underline"
            >
              <ChevronLeftIcon />
            </Link>
            <span className="whitespace-nowrap px-2 text-[15px] font-bold">{shortDayLabel(date)}</span>
            <Link
              href={dailyHref(addDaysISO(date, 1))}
              aria-label="วันถัดไป"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef3fa] text-[#33425b] no-underline"
            >
              <ChevronRightIcon />
            </Link>
          </div>
        ) : (
          <div className="card flex items-center gap-1 !rounded-full py-1.5 pl-2 pr-3">
            <Link
              href={monthlyHref(prevMonth.month, prevMonth.year)}
              aria-label="เดือนก่อนหน้า"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef3fa] text-[#33425b] no-underline"
            >
              <ChevronLeftIcon />
            </Link>
            <span className="whitespace-nowrap px-2 text-[15px] font-bold">{monthLabel(month, year)}</span>
            <Link
              href={monthlyHref(nextMonth.month, nextMonth.year)}
              aria-label="เดือนถัดไป"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef3fa] text-[#33425b] no-underline"
            >
              <ChevronRightIcon />
            </Link>
          </div>
        )}

        <ExportExcelModal
          daily={dailyExport}
          monthly={monthlyExport}
          defaultType={view}
          dailyLabel={shortDayLabel(date)}
          monthlyLabel={monthLabel(month, year)}
          dayFilename={dayFilename}
          monthFilename={monthFilename}
          personCount={view === "daily" ? daily.totals.total : monthly.totals.total}
        />
      </div>

      {view === "daily" ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <ReportStat
            icon={<PersonIcon />}
            iconBg="#e3edff"
            iconColor="#1d63d8"
            label="เข้างานวันนี้"
            value={`${daily.totals.checkedIn} / ${daily.totals.total} คน`}
          />
          <ReportStat
            icon={<ClockIcon />}
            iconBg="#dcfce7"
            iconColor="#15803d"
            label="ชั่วโมงรวม"
            value={formatHours(daily.totals.totalMinutes)}
          />
          <ReportStat
            icon={<ChartIcon />}
            iconBg="#fef3c7"
            iconColor="#92400e"
            label="เฉลี่ยต่อคน"
            value={formatHours(daily.totals.averageMinutes)}
          />
          <ReportStat
            icon={<AlertIcon />}
            iconBg="#ffe4e6"
            iconColor="#be123c"
            label="ยังไม่เช็กเอาท์"
            value={`${daily.totals.notCheckedOut} คน`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <ReportStat
            icon={<PersonIcon />}
            iconBg="#e3edff"
            iconColor="#1d63d8"
            label="ผู้ฝึกอาชีพ"
            value={`${monthly.totals.total} คน`}
          />
          <ReportStat
            icon={<ClockIcon />}
            iconBg="#dcfce7"
            iconColor="#15803d"
            label="ชั่วโมงรวม"
            value={formatHours(monthly.totals.totalMinutes)}
          />
          <ReportStat
            icon={<ChartIcon />}
            iconBg="#fef3c7"
            iconColor="#92400e"
            label="เฉลี่ยต่อคน"
            value={formatHours(monthly.totals.averageMinutes)}
          />
          <ReportStat
            icon={<CheckIcon />}
            iconBg="#ede9fe"
            iconColor="#6d28d9"
            label="ครบกะ"
            value={`${monthly.totals.completeDays} ครั้ง`}
          />
        </div>
      )}

      <div className="card p-4 sm:p-5">
        <form
          method="get"
          className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
          role="search"
          aria-label="ค้นหารายงาน"
        >
          <input type="hidden" name="view" value={view} />
          {view === "daily" ? (
            <input type="hidden" name="date" value={date} />
          ) : (
            <>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="year" value={year} />
            </>
          )}
          <div className="relative min-w-0">
            <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8696ae]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            </span>
            <label htmlFor="rep-q" className="sr-only">ค้นหาชื่อ / รหัสนักศึกษา</label>
            <input
              id="rep-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="ค้นหาชื่อ / รหัสนักศึกษา…"
              maxLength={100}
              className="input !min-h-[48px] !pl-11"
            />
          </div>
          <label htmlFor="rep-shop" className="sr-only">ตัวกรองรหัสร้าน</label>
          <select
            id="rep-shop"
            name="shopCode"
            defaultValue={shopCode}
            className="input !min-h-[48px] w-full"
          >
            <option value="">รหัสร้าน (ทั้งหมด)</option>
            {shopOptions.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary w-full sm:w-28">ค้นหา</button>
        </form>
      </div>

      {view === "daily" ? (
        <section aria-label="รายงานรายวัน" className="card overflow-hidden">
          {daily.rows.length === 0 ? (
            <p className="muted px-6 py-6 text-sm">ไม่พบนักศึกษาตามเงื่อนไข</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <caption className="sr-only">รายงานชั่วโมงทำงานรายวัน {shortDayLabel(date)}</caption>
                <thead>
                  <tr>
                    <th scope="col">นักศึกษา</th>
                    <th scope="col">ร้าน</th>
                    <th scope="col">เช็กอิน</th>
                    <th scope="col">เช็กเอาท์</th>
                    <th scope="col">ชั่วโมงการทำงาน</th>
                    <th scope="col">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.rows.map((row) => (
                    <tr key={row.user.id}>
                      <td>
                        <span className="flex items-center gap-3">
                          <Avatar name={`${row.user.firstName} ${row.user.lastName}`} />
                          <span className="font-semibold">{row.user.firstName} {row.user.lastName}</span>
                        </span>
                      </td>
                      <td>
                        {row.user.shopCode ? (
                          <span className="inline-block rounded-lg bg-[#f1f5fb] px-2.5 py-1 text-[13px] font-medium">
                            {row.user.shopCode}
                          </span>
                        ) : "–"}
                      </td>
                      <td>{formatClock(row.checkInAt)}</td>
                      <td>{formatClock(row.checkOutAt)}</td>
                      <td className="font-semibold">
                        {row.status === "COMPLETE"
                          ? formatHours(row.workMinutes)
                          : row.status === "WORKING"
                            ? "กำลังนับเวลา…"
                            : "–"}
                      </td>
                      <td><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section aria-label="รายงานรายเดือน" className="card overflow-hidden">
          {monthly.rows.length === 0 ? (
            <p className="muted px-6 py-6 text-sm">ไม่พบนักศึกษาตามเงื่อนไข</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <caption className="sr-only">รายงานชั่วโมงทำงานรายเดือน {monthLabel(month, year)}</caption>
                <thead>
                  <tr>
                    <th scope="col">นักศึกษา</th>
                    <th scope="col">ร้าน</th>
                    <th scope="col">วันมา</th>
                    <th scope="col">ครบกะ</th>
                    <th scope="col">ลา</th>
                    <th scope="col">ชั่วโมงรวม</th>
                    <th scope="col">เฉลี่ย/วัน</th>
                    <th scope="col"><span className="sr-only">รายละเอียด</span></th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.rows.map((row) => (
                    <tr key={row.user.id}>
                      <td>
                        <span className="flex items-center gap-3">
                          <Avatar name={`${row.user.firstName} ${row.user.lastName}`} />
                          <span className="font-semibold">{row.user.firstName} {row.user.lastName}</span>
                        </span>
                      </td>
                      <td>
                        {row.user.shopCode ? (
                          <span className="inline-block rounded-lg bg-[#f1f5fb] px-2.5 py-1 text-[13px] font-medium">
                            {row.user.shopCode}
                          </span>
                        ) : "–"}
                      </td>
                      <td>{row.attendanceDays}</td>
                      <td>{row.completeDays}</td>
                      <td>{row.leaveDays}</td>
                      <td className="font-semibold">{formatHours(row.totalMinutes)}</td>
                      <td>
                        {formatHours(
                          row.attendanceDays > 0
                            ? Math.round(row.totalMinutes / row.attendanceDays)
                            : null,
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/admin/reports/${row.user.id}${qs({ month: String(month), year: String(year) })}`}
                          className="whitespace-nowrap text-sm font-medium text-[#1750b8] no-underline hover:underline"
                        >
                          ดูรายละเอียด ›
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
