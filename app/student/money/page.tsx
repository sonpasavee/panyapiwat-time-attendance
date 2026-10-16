import Link from "next/link";

import { requireStudentPage } from "@/lib/page-auth";
import { formatSpent } from "@/lib/format";
import { monthYear } from "@/validators/api";
import { getMyDailyMoney } from "@/services/money-tracker.service";

import { Card } from "../../components/ui";

export const instant = false;

type SearchParams = {
  month?: string | string[];
  year?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const monthLong = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "long",
  year: "numeric",
});

const dayNum = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
});

const monthShort = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "short",
});

const weekdayShort = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
});

// ยอดการ์ดสถิติ: มี comma คั่นหลักพัน ตัดทศนิยมที่เป็นศูนย์ทิ้ง
function compactBaht(value: string) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function MonthNavigator({ month, year }: { month: number; year: number }) {
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
        href={`/student/money?month=${prev.month}&year=${prev.year}`}
        aria-label="เดือนก่อนหน้า"
        className={arrow}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 6l-6 6 6 6" /></svg>
      </Link>
      <span className="min-w-[110px] text-center text-[15px] font-semibold">
        {monthLong.format(new Date(year, month - 1, 1))}
      </span>
      <Link
        href={`/student/money?month=${next.month}&year=${next.year}`}
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
  sub,
}: {
  icon: React.ReactNode;
  chipBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
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
        <span className="block truncate text-[22px] font-bold leading-snug tabular-nums">
          {value}
        </span>
        {sub && <span className="muted block text-[13px]">{sub}</span>}
      </span>
    </div>
  );
}

export default async function StudentMoneyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireStudentPage();
  const params = await searchParams;
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(first(params.month) ? { month: first(params.month)! } : {}),
      ...(first(params.year) ? { year: first(params.year)! } : {}),
    }),
  );

  const report = await getMyDailyMoney(session.id, month, year);
  const monthSpent = formatSpent(report.stats.totalSpent);
  const monthSpentText = monthSpent.isGain
    ? `เงินเพิ่ม ฿${compactBaht(report.stats.totalSpent.slice(1))}`
    : `฿${compactBaht(report.stats.totalSpent)}`;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">เงินส่วนตัว</h1>
          <p className="mt-0.5 text-[15px] muted">
            ประวัติเงินเอาเข้า คงเหลือ และใช้ไปรายวัน
          </p>
        </div>
        <MonthNavigator month={month} year={year} />
      </header>

      <section aria-label="สรุปยอดเงินเดือนนี้" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>}
          chipBg="#fef3c7"
          iconColor="#92400e"
          label="เอาเข้ารวมเดือนนี้"
          value={`฿${compactBaht(report.stats.totalIn)}`}
        />
        <StatCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>}
          chipBg="#eaf1ff"
          iconColor="#1d63d8"
          label="ใช้ไปรวมเดือนนี้"
          value={monthSpentText}
          sub="ไม่รวมวันที่ข้อมูลไม่ครบ"
        />
        <StatCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
          chipBg="#dcfce7"
          iconColor="#15803d"
          label="วันที่ข้อมูลครบ"
          value={`${report.stats.completeDays} / ${report.stats.totalDays} วัน`}
        />
      </section>

      <Card label="รายการรายวัน" className="card-pad">
        <h2 className="m-0 text-[17px] font-semibold">รายการรายวัน</h2>
        {report.days.length === 0 ? (
          <p className="muted py-6 text-center text-sm">เดือนนี้ยังไม่มีประวัติการลงเวลา</p>
        ) : (
          <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {report.days.map((day) => {
              const date = new Date(`${day.dateISO}T00:00:00Z`);
              const complete = day.summary.complete;
              const spent = formatSpent(day.summary.totalSpent);
              const isGain = complete && spent.isGain;
              const spentText = spent.text;
              return (
                <li
                  key={day.dateISO}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e3e9f2] bg-white p-4"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-[62px] w-[56px] flex-none flex-col items-center justify-center rounded-2xl bg-[#eaf1ff]"
                  >
                    <span className="text-[22px] font-bold leading-none text-[#0f1f3a]">
                      {dayNum.format(date)}
                    </span>
                    <span className="muted mt-1 text-xs">{monthShort.format(date)}</span>
                  </span>
                  <span className="min-w-[92px] flex-1">
                    <span className="block text-[15px] font-semibold">
                      {weekdayShort.format(date)}
                    </span>
                    {!complete ? (
                      <span className="mt-1 inline-block rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-semibold text-[#92400e]">
                        ข้อมูลไม่ครบ
                      </span>
                    ) : isGain ? (
                      <span className="mt-1 inline-block rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-xs font-semibold text-[#15803d]">
                        {spentText}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-none items-start gap-5 text-right sm:gap-7">
                    <span>
                      <span className="muted block text-xs">เอาเข้า</span>
                      <span className="mt-0.5 block text-[15px] font-bold tabular-nums">
                        ฿{day.inTotal}
                      </span>
                    </span>
                    <span>
                      <span className="muted block text-xs">คงเหลือ</span>
                      <span className="mt-0.5 block text-[15px] font-bold tabular-nums">
                        {day.hasOut ? `฿${day.outTotal}` : "ไม่ได้กรอก"}
                      </span>
                    </span>
                    <span>
                      <span className="muted block text-xs">ใช้ไป</span>
                      <span
                        className="mt-0.5 block text-[15px] font-bold tabular-nums"
                        style={{
                          color: !complete
                            ? "#5b6b82"
                            : isGain
                              ? "#16a34a"
                              : "#1750b8",
                        }}
                      >
                        {complete && !isGain ? spentText : "–"}
                      </span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
