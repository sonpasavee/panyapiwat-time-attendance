import Link from "next/link";

import { requireStudentPage } from "@/lib/page-auth";
import { MONEY_LABEL, bangkokDateKey, formatDate } from "@/lib/format";
import { monthYear, pagination } from "@/validators/api";
import { getMyMoneyReport } from "@/services/money-tracker.service";

import Pager from "../../components/pager";
import { Card } from "../../components/ui";

export const instant = false;

type SearchParams = {
  month?: string | string[];
  year?: string | string[];
  date?: string | string[];
  page?: string | string[];
  pageSize?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const monthLong = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "long",
  year: "numeric",
});

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

function BalanceCard({
  icon,
  chipBg,
  iconColor,
  label,
  net,
  flow,
}: {
  icon: React.ReactNode;
  chipBg: string;
  iconColor: string;
  label: string;
  net: string;
  flow: string;
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
          ฿{net}
        </span>
        <span className="muted block text-[13px] tabular-nums">{flow}</span>
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
  const { page, pageSize } = pagination(
    new URLSearchParams({
      ...(first(params.page) ? { page: first(params.page)! } : {}),
      ...(first(params.pageSize) ? { pageSize: first(params.pageSize)! } : {}),
    }),
  );

  const rawDate = first(params.date)?.trim() ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";

  const money = await getMyMoneyReport(session.id, month, year);

  const filtered = date
    ? money.entries.filter((e) => bangkokDateKey(e.attendance.workDate) === date)
    : money.entries;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageEntries = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pagerParams: Record<string, string> = {
    month: String(month),
    year: String(year),
    ...(date ? { date } : {}),
  };

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">เงินส่วนตัว</h1>
          <p className="mt-0.5 text-[15px] muted">
            เดือน {month}/{year}
          </p>
        </div>
        <MonthNavigator month={month} year={year} />
      </header>

      <section aria-label="สรุปยอดเงิน" className="grid gap-4 sm:grid-cols-3">
        <BalanceCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>}
          chipBg="#fef3c7"
          iconColor="#78350f"
          label="เงินสดคงเหลือ"
          net={money.totals.CASH.net}
          flow={`เข้า ฿${money.totals.CASH.in} • ออก ฿${money.totals.CASH.out}`}
        />
        <BalanceCard
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M11 18h2" /></svg>}
          chipBg="#e0e7ff"
          iconColor="#312e81"
          label="TrueMoney คงเหลือ"
          net={money.totals.TRUEMONEY.net}
          flow={`เข้า ฿${money.totals.TRUEMONEY.in} • ออก ฿${money.totals.TRUEMONEY.out}`}
        />
        <div
          className="flex flex-col justify-center gap-1 rounded-[18px] border border-[#1d63d8] p-5 text-white"
          style={{ background: "linear-gradient(135deg, #1c5fd0 0%, #3b82f6 100%)" }}
        >
          <span className="block text-[13px] text-white/85">คงเหลือรวม</span>
          <span className="block text-[26px] font-bold leading-snug tabular-nums">
            ฿{money.totals.net}
          </span>
          <span className="block text-[13px] leading-snug text-white/85">
            ยอดบันทึกส่วนตัว อาจไม่ตรงเงินในกระเป๋าจริง
          </span>
        </div>
      </section>

      <Card label="รายการเดินเงิน" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
          <h2 className="m-0 text-[17px] font-semibold">รายการเดินเงิน</h2>
          <span className="text-sm muted">{filtered.length} รายการ</span>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2.5 px-6 pt-4">
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="money-date" className="field-label">
              กรองตามวันที่
            </label>
            <input
              id="money-date"
              name="date"
              type="date"
              defaultValue={date}
              className="input min-h-[44px] w-auto"
            />
          </div>
          <button type="submit" className="btn btn-outline">
            กรอง
          </button>
          {date && (
            <Link
              href={`/student/money?month=${month}&year=${year}`}
              className="btn btn-soft"
            >
              ล้าง
            </Link>
          )}
        </form>
        {date && (
          <p className="m-0 px-6 pt-2.5 text-sm muted">
            กำลังแสดงเฉพาะวันที่ {formatDate(date)}
          </p>
        )}

        {pageEntries.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">
            {date ? "วันที่เลือกยังไม่มีรายการเดินเงิน" : "เดือนนี้ยังไม่มีรายการเดินเงิน"}
          </p>
        ) : (
          <ul className="m-0 list-none p-0 px-6">
            {pageEntries.map((entry) => {
              const isIn = entry.direction === "IN";
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3.5 border-b border-[#edf1f7] py-4 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
                    style={{ background: isIn ? "#dcfce7" : "#ffe4e6" }}
                  >
                    {isIn ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14532d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#881337" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">
                      {isIn ? "เงินเข้า" : "เงินออก"}
                    </span>
                    <span className="muted mt-0.5 block text-[13px]">
                      {formatDate(entry.attendance.workDate)} • {MONEY_LABEL[entry.moneyType] ?? entry.moneyType}
                    </span>
                  </span>
                  <span
                    className="flex-none text-lg font-bold tabular-nums"
                    style={{ color: isIn ? "#16a34a" : "#dc2626" }}
                  >
                    {isIn ? "+" : "-"}฿{String(entry.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <Pager
          pathname="/student/money"
          params={pagerParams}
          page={safePage}
          totalPages={totalPages}
          numbered
          summary={`ทั้งหมด ${filtered.length} รายการ`}
        />
      </Card>
    </div>
  );
}
