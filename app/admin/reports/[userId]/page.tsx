import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminPage } from "@/lib/page-auth";
import { formatSpent } from "@/lib/format";
import { idSchema, monthYear } from "@/validators/api";
import { getUserMonthlyDetail, listReportTerms } from "@/services/admin-report.service";

import ExportUserButton, {
  type UserExportRow,
} from "../../../components/export-user-button";
import {
  Avatar,
  CalendarIcon,
  ChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  detailDayLabel,
  formatClock,
  formatHours,
  monthLabel,
  PlusIcon,
  ReportStat,
  StatusBadge,
  thaiYear,
  todayISO,
} from "../../../components/report-helpers";

export const instant = false;

const LEAVE_TEXT: Record<string, string> = {
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  HOLIDAY: "วันหยุด",
};

function shiftMonth(month: number, year: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

export default async function AdminUserReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{
    month?: string | string[];
    year?: string | string[];
    termId?: string | string[];
  }>;
}) {
  await requireAdminPage();
  const { userId } = await params;
  const query = await searchParams;
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  let validId = "";
  try {
    validId = idSchema.parse(userId);
  } catch {
    notFound();
  }

  let month = 0;
  let year = 0;
  const terms = await listReportTerms();
  const selectedTerm = first(query.termId)?.trim();
  const termId = terms.some((term) => term.id === selectedTerm)
    ? selectedTerm!
    : terms[0]?.id;
  try {
    ({ month, year } = monthYear(
      new URLSearchParams({
        ...(first(query.month)?.trim() ? { month: first(query.month)! } : {}),
        ...(first(query.year)?.trim() ? { year: first(query.year)! } : {}),
      }),
    ));
  } catch {
    notFound();
  }

  const detail = await getUserMonthlyDetail(validId, month, year, termId);
  if (!detail) notFound();

  const prev = shiftMonth(month, year, -1);
  const next = shiftMonth(month, year, 1);
  const monthHref = (m: number, y: number) =>
    `/admin/reports/${validId}?month=${m}&year=${y}${termId ? `&termId=${encodeURIComponent(termId)}` : ""}`;

  // กราฟแสดงถึงวันปัจจุบันเมื่อดูเดือนปัจจุบัน, เดือนอื่นแสดงทั้งเดือน
  const [ty, tm, td] = todayISO().split("-").map(Number);
  const visibleDays =
    ty === year && tm === month
      ? Math.min(td, detail.daysInMonth)
      : detail.daysInMonth;
  const chartDays = detail.days.slice(0, visibleDays);
  const maxMinutes = Math.max(1, ...chartDays.map((d) => d.workMinutes ?? 0));

  // แถวตาราง: วันที่มีลงเวลาหรือลา เรียงใหม่ไปเก่า
  const tableDays = detail.days
    .filter((d) => d.checkInAt || d.leaveType)
    .sort((a, b) => b.day - a.day);

  const leaveLabel =
    detail.totals.leaveDays > 0
      ? `${detail.totals.leaveDays} วัน (${detail.totals.leaveTypes.map((t) => LEAVE_TEXT[t]).join(", ")})`
      : "0 วัน";
  const fileName = `ชั่วโมงทำงาน_${detail.user.studentId ?? detail.user.employeeCode ?? detail.user.id}_${thaiYear(year)}-${String(month).padStart(2, "0")}.xlsx`;
  const exportRows: UserExportRow[] = tableDays.map((d) => {
    const status = d.checkInAt
      ? d.checkOutAt
        ? "COMPLETE"
        : d.workDateISO < todayISO()
          ? "MISSED_CHECKOUT"
          : "WORKING"
      : d.leaveType!;
    return {
      date: detailDayLabel(d.workDateISO),
      checkIn: formatClock(d.checkInAt),
      checkOut: formatClock(d.checkOutAt),
      hours:
        status === "COMPLETE"
          ? formatHours(d.workMinutes)
          : status === "WORKING"
            ? "กำลังนับเวลา…"
            : "–",
      status:
        status === "COMPLETE"
          ? "ครบ"
          : status === "WORKING"
            ? "กำลังทำงาน"
            : status === "MISSED_CHECKOUT"
              ? "ไม่ได้เช็กเอาท์"
              : status === "SICK"
                ? "ลาป่วย"
                : status === "PERSONAL"
                  ? "ลากิจ"
                  : status === "HOLIDAY"
                    ? "วันหยุด"
                    : "ยังไม่เช็กอิน",
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/admin/reports?view=monthly&month=${month}&year=${year}`}
        className="inline-flex min-h-[44px] w-fit items-center gap-1 text-[15px] font-medium text-[#1750b8] no-underline hover:underline"
      >
        <ChevronLeftIcon />
        กลับไปรายงานรายเดือน
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto flex min-w-0 flex-1 items-center gap-4 basis-52">
          <Avatar
            name={`${detail.user.firstName} ${detail.user.lastName}`}
            size={56}
          />
          <div className="min-w-0">
            <h1 className="m-0 text-[20px] font-bold leading-snug break-words sm:text-[24px]">
              {detail.user.firstName} {detail.user.lastName}
            </h1>
            <p className="muted m-0 break-words text-sm">
              {detail.user.studentId ?? detail.user.employeeCode ?? "–"}
              {detail.user.shopCode ? ` · ${detail.user.shopCode}` : ""}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-1 !rounded-full py-1.5 pl-2 pr-3">
          <Link
            href={monthHref(prev.month, prev.year)}
            aria-label="เดือนก่อนหน้า"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef3fa] text-[#33425b] no-underline"
          >
            <ChevronLeftIcon />
          </Link>
          <span className="whitespace-nowrap px-2 text-[15px] font-bold">
            {monthLabel(month, year)}
          </span>
          <Link
            href={monthHref(next.month, next.year)}
            aria-label="เดือนถัดไป"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef3fa] text-[#33425b] no-underline"
          >
            <ChevronRightIcon />
          </Link>
        </div>

        <ExportUserButton filename={fileName} rows={exportRows} />
      </div>

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <ReportStat
          icon={<ClockIcon />}
          iconBg="#e3edff"
          iconColor="#1d63d8"
          label="ชั่วโมงรวม"
          value={formatHours(detail.totals.totalMinutes)}
        />
        <ReportStat
          icon={<CalendarIcon />}
          iconBg="#dcfce7"
          iconColor="#15803d"
          label="วันมาทำงาน"
          value={`${detail.totals.attendanceDays} วัน`}
        />
        <ReportStat
          icon={<ChartIcon />}
          iconBg="#fef3c7"
          iconColor="#92400e"
          label="เฉลี่ยต่อวัน"
          value={formatHours(detail.totals.averageMinutes)}
        />
        <ReportStat
          icon={<PlusIcon />}
          iconBg="#fef3c7"
          iconColor="#92400e"
          label="ลา"
          value={leaveLabel}
        />
      </div>

      <section aria-label="ชั่วโมงทำงานรายวัน" className="card card-pad">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-[19px] font-semibold">
            ชั่วโมงทำงานรายวัน (ชม.)
          </h2>
          <p className="m-0 text-[13px] muted">เทา = วันหยุด · เหลือง = ลา</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div
            className="flex min-w-[560px] items-stretch gap-1.5"
            role="img"
            aria-label={`กราฟชั่วโมงทำงานรายวัน ${monthLabel(month, year)}`}
          >
            {chartDays.map((d) => {
              const minutes = d.workMinutes ?? 0;
              const barColor =
                !d.checkInAt && d.leaveType
                  ? "#eab308"
                  : d.isWeekend
                    ? "#cbd5e1"
                    : "#1d63d8";
              return (
                <div
                  key={d.day}
                  className="flex min-w-0 flex-1 flex-col items-center"
                >
                  <span className="h-4 text-[11px] muted">
                    {minutes > 0 ? (minutes / 60).toFixed(1) : ""}
                  </span>
                  <span className="flex h-[160px] w-full items-end justify-center">
                    {minutes > 0 ? (
                      <span
                        className="w-full max-w-[44px] rounded-t-md"
                        style={{
                          height: `${Math.max(6, (minutes / maxMinutes) * 100)}%`,
                          background: barColor,
                        }}
                      />
                    ) : (
                      <span className="h-1 w-full max-w-[44px] rounded-full bg-[#e8eef7]" />
                    )}
                  </span>
                  <span className="mt-1.5 text-[11px] muted">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-label="ประวัติรายวัน" className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-5 pb-1">
          <h2 className="m-0 text-[17px] font-semibold">ประวัติรายวัน</h2>
          {(() => {
            const total = formatSpent(detail.totals.totalSpent);
            return (
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: total.isGain ? "#16a34a" : "#1750b8" }}
              >
                {total.isGain ? total.text : `ใช้เงินรวมเดือนนี้ ${total.text}`}
              </span>
            );
          })()}
        </div>
        {tableDays.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">
            เดือนนี้ยังไม่มีข้อมูลการลงเวลา
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[720px]">
              <caption className="sr-only">
                ประวัติรายวัน {detail.user.firstName} {detail.user.lastName}{" "}
                {monthLabel(month, year)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">วันที่</th>
                  <th scope="col">เช็กอิน</th>
                  <th scope="col">เช็กเอาท์</th>
                  <th scope="col">ชั่วโมงการทำงาน</th>
                  <th scope="col">เงินใช้ไป</th>
                  <th scope="col">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {tableDays.map((d) => {
                  const status = d.checkInAt
                    ? d.checkOutAt
                      ? ("COMPLETE" as const)
                      : d.workDateISO < todayISO()
                        ? ("MISSED_CHECKOUT" as const)
                        : ("WORKING" as const)
                    : (d.leaveType ?? ("HOLIDAY" as const));
                  return (
                    <tr key={d.workDateISO}>
                      <td className="font-semibold">
                        {detailDayLabel(d.workDateISO)}
                      </td>
                      <td>{formatClock(d.checkInAt)}</td>
                      <td>{formatClock(d.checkOutAt)}</td>
                      <td className="font-semibold">
                        {status === "COMPLETE"
                          ? formatHours(d.workMinutes)
                          : status === "WORKING"
                            ? "กำลังนับเวลา…"
                            : "–"}
                      </td>
                      <td className="font-semibold tabular-nums">
                        {(() => {
                          if (!d.moneySummary?.complete) return "–";
                          const shown = formatSpent(d.moneySummary.totalSpent);
                          return (
                            <span style={shown.isGain ? { color: "#16a34a" } : undefined}>
                              {shown.text}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
