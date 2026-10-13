import Link from "next/link";

import { requireStudentPage } from "@/lib/page-auth";
import { bangkokDateKey, formatDate, formatMinutes, formatTime } from "@/lib/format";
import { monthYear, pagination } from "@/validators/api";
import { monthRange } from "@/lib/time";
import { listMyAttendance } from "@/services/attendance.service";

import Pager from "../../components/pager";
import { Badge, Card } from "../../components/ui";

export const instant = false;

type SearchParams = {
  page?: string | string[];
  pageSize?: string | string[];
  month?: string | string[];
  year?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const weekdayLong = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "long",
});
const dayNum = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
});
const monthShort = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "short",
});
const monthLong = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "long",
  year: "numeric",
});

function MonthNavigator({
  basePath,
  month,
  year,
}: {
  basePath: string;
  month: number;
  year: number;
}) {
  const prev = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  const next = month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf1ff] text-[#1750b8] hover:bg-[#dbe8ff]";
  return (
    <nav
      aria-label="เปลี่ยนเดือน"
      className="card flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-1.5"
    >
      <Link
        href={`${basePath}?month=${prev.month}&year=${prev.year}`}
        aria-label="เดือนก่อนหน้า"
        className={arrow}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 6l-6 6 6 6" /></svg>
      </Link>
      <span className="min-w-[110px] text-center text-[15px] font-semibold">
        {monthLong.format(new Date(year, month - 1, 1))}
      </span>
      <Link
        href={`${basePath}?month=${next.month}&year=${next.year}`}
        aria-label="เดือนถัดไป"
        className={arrow}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 6l6 6-6 6" /></svg>
      </Link>
    </nav>
  );
}

function StatCard({
  icon,
  chipBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ReactNode;
  chipBg: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="card flex items-center gap-3.5 p-5">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl"
        style={{ background: chipBg, color: iconColor }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="muted block text-[13px]">{label}</span>
        <span className="block truncate text-[22px] font-bold leading-snug">{value}</span>
      </span>
    </div>
  );
}

export default async function StudentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireStudentPage();
  const params = await searchParams;
  const query = new URLSearchParams({
    ...(first(params.page) ? { page: first(params.page)! } : {}),
    ...(first(params.pageSize) ? { pageSize: first(params.pageSize)! } : {}),
  });
  const { page, pageSize, skip } = pagination(query);
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month) ? { month: first(params.month)! } : {}),
      ...(first(params.year) ? { year: first(params.year)! } : {}),
    }),
  );

  const filter = { userId: session.id, workDate: monthRange(year, month) };
  const [history, summary] = await Promise.all([
    listMyAttendance(session.id, filter, skip, pageSize),
    listMyAttendance(session.id, filter, 0, 500),
  ]);
  const totalPages = Math.max(1, Math.ceil(history.total / pageSize));
  const todayKey = bangkokDateKey();

  const totalMinutes = summary.items.reduce((sum, r) => sum + (r.workMinutes ?? 0), 0);
  const completeCount = summary.items.filter((r) => r.checkOutAt).length;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">ประวัติลงเวลา</h1>
          <p className="mt-0.5 text-[15px] muted">
            ประวัติการลงเวลาเข้า–ออกงานรายเดือน
          </p>
        </div>
        <MonthNavigator basePath="/student/attendance" month={month} year={year} />
      </header>

      <section aria-label="สรุปเดือนนี้" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
          chipBg="#eaf1ff"
          iconColor="#1750b8"
          label="ชั่วโมงรวมเดือนนี้"
          value={formatMinutes(totalMinutes)}
        />
        <StatCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>}
          chipBg="#dcfce7"
          iconColor="#14532d"
          label="วันที่ทำงาน"
          value={`${history.total} วัน`}
        />
        <StatCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
          chipBg="#fef3c7"
          iconColor="#78350f"
          label="บันทึกครบ"
          value={`${completeCount} รายการ`}
        />
      </section>

      <Card label="รายการลงเวลารายเดือน" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
          <h2 className="m-0 text-[17px] font-semibold">
            รายการเดือน {month}/{year}
          </h2>
          <span className="text-sm muted">{history.total} รายการ</span>
        </div>

        {history.items.length === 0 ? (
          <p className="muted px-6 pb-6 text-sm">เดือนนี้ยังไม่มีประวัติการลงเวลา</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0 px-4 pb-2 sm:px-6">
            {history.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-[#e3e9f2] bg-white p-4"
              >
                <span
                  aria-hidden="true"
                  className="flex h-[68px] w-[62px] flex-none flex-col items-center justify-center rounded-2xl bg-[#eaf1ff]"
                >
                  <span className="text-[24px] font-bold leading-none text-[#0f1f3a]">
                    {dayNum.format(item.workDate)}
                  </span>
                  <span className="muted mt-1 text-xs">{monthShort.format(item.workDate)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {weekdayLong.format(item.workDate)} {formatDate(item.workDate)}
                  </span>
                  <span className="muted mt-1 block text-sm tabular-nums">
                    {formatTime(item.checkInAt)}
                    <span aria-hidden="true"> → </span>
                    <span className="sr-only">ถึง</span>
                    {formatTime(item.checkOutAt)}
                  </span>
                </span>
                <span className="flex flex-none items-center gap-2.5">
                  <span className="hidden text-right sm:block">
                    <span className="muted block text-xs">เวลาทำงาน</span>
                    <span className="block text-[15px] font-bold tabular-nums">
                      {formatMinutes(item.workMinutes)}
                    </span>
                  </span>
                  {item.checkOutAt ? (
                    <Badge tone="green">ครบ</Badge>
                  ) : bangkokDateKey(item.workDate) === todayKey ? (
                    <Badge tone="blue">กำลังทำงาน</Badge>
                  ) : (
                    <Badge tone="yellow">ไม่ได้เช็กเอาท์</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Pager
          pathname="/student/attendance"
          params={{ month: String(month), year: String(year) }}
          page={page}
          totalPages={totalPages}
          numbered
          summary={`ทั้งหมด ${history.total} รายการ`}
        />
      </Card>
    </div>
  );
}
