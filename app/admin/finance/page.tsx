import Link from "next/link";

import { requireAdminPage } from "@/lib/page-auth";
import { formatSpent } from "@/lib/format";
import { monthYear } from "@/validators/api";
import {
  amountToCents,
  centsToAmount,
} from "@/services/money-tracker.logic";
import { getMonthlyFinance } from "@/services/money-tracker.service";

import ExportMoneyButton from "./export-money-button";
import "./finance.css";

export const instant = false;

type SearchParams = {
  view?: string | string[];
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

const TONES = ["blue", "green", "yellow", "pink", "lavender"] as const;

function toneOf(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % 997;
  return TONES[hash % TONES.length];
}

const monthLongFmt = new Intl.DateTimeFormat("th-TH", {
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

function baht(value: string) {
  return `฿${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function shiftMonth(month: number, year: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

function withParams(base: Record<string, string>, extra: Record<string, string>) {
  const params = new URLSearchParams({ ...base, ...extra });
  for (const [k, v] of Object.entries(extra)) {
    if (v === "") params.delete(k);
  }
  return `/admin/finance?${params.toString()}`;
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;

  const view = first(params.view) === "daily" ? "daily" : "monthly";
  const q = str(params.q) ?? "";
  const shopCode = str(params.shopCode) ?? "";
  const { month, year } = monthYear(
    new URLSearchParams({
      ...(str(params.month) ? { month: str(params.month)! } : {}),
      ...(str(params.year) ? { year: str(params.year)! } : {}),
    }),
  );

  const { users, days } = await getMonthlyFinance(month, year);

  const needle = q.toLowerCase();
  const matched = users.filter(
    (r) =>
      (!shopCode || r.user.shopCode === shopCode) &&
      (!needle ||
        `${r.user.firstName} ${r.user.lastName} ${r.user.studentId ?? ""}`
          .toLowerCase()
          .includes(needle)),
  );

  const sum = (pick: (r: (typeof matched)[number]) => string) =>
    centsToAmount(
      matched.reduce((total, r) => total + amountToCents(pick(r)), 0),
    );
  const totalIn = sum((r) => r.inTotal);
  const totalOut = sum((r) => r.outTotal);
  const totalSpent = sum((r) => r.spentTotal);

  const linkBase: Record<string, string> = {
    view,
    month: String(month),
    year: String(year),
    ...(q ? { q } : {}),
    ...(shopCode ? { shopCode } : {}),
  };

  const prev = shiftMonth(month, year, -1);
  const next = shiftMonth(month, year, 1);
  const shopOptions = [...new Set(users.map((r) => r.user.shopCode).filter((c): c is string => !!c))].sort();
  const monthSlug = `${year}-${String(month).padStart(2, "0")}`;

  const ratio = (spent: string, into: string) => {
    const inC = amountToCents(into);
    if (inC === 0) return "–";
    return `${Math.round((amountToCents(spent) / inC) * 100)}% ของเอาเข้า`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="fin-head">
        <div>
          <h1>การเงินนักศึกษา</h1>
          <p>สรุปเงินเอาเข้า คงเหลือ และใช้ไปของนักศึกษาแต่ละคน</p>
        </div>
        <div className="fin-head-actions">
          <nav aria-label="สลับมุมมอง" className="fin-view">
            <Link
              href={withParams(linkBase, { view: "daily" })}
              aria-current={view === "daily" ? "page" : undefined}
            >
              รายวัน
            </Link>
            <Link
              href={withParams(linkBase, { view: "monthly" })}
              aria-current={view === "monthly" ? "page" : undefined}
            >
              รายเดือน
            </Link>
          </nav>
          <nav aria-label="เปลี่ยนเดือน" className="fin-monthnav">
            <Link
              href={withParams(linkBase, { month: String(prev.month), year: String(prev.year) })}
              aria-label="เดือนก่อนหน้า"
            >
              ‹
            </Link>
            <span>{monthLongFmt.format(new Date(Date.UTC(year, month - 1, 1)))}</span>
            <Link
              href={withParams(linkBase, { month: String(next.month), year: String(next.year) })}
              aria-label="เดือนถัดไป"
            >
              ›
            </Link>
          </nav>
          <ExportMoneyButton
            filename={`การเงิน_${monthSlug}.xlsx`}
            headers={[
              "ชื่อ",
              "รหัส",
              "ร้าน",
              "เอาเข้า สด",
              "เอาเข้า TrueMoney",
              "เอาเข้ารวม",
              "คงเหลือ สด",
              "คงเหลือ TrueMoney",
              "คงเหลือรวม",
              "ใช้ไป สด",
              "ใช้ไป TrueMoney",
              "ใช้ไปรวม",
              "สัดส่วน",
            ]}
            rows={matched.map((r) => [
              `${r.user.firstName} ${r.user.lastName}`,
              r.user.studentId ?? "–",
              r.user.shopCode ?? "–",
              r.inCash,
              r.inTrue,
              r.inTotal,
              r.outCash,
              r.outTrue,
              r.outTotal,
              r.spentCash,
              r.spentTrue,
              r.spentTotal,
              ratio(r.spentTotal, r.inTotal),
            ])}
          />
        </div>
      </div>

      <div className="fin-stats">
        <section className="card fin-stat" aria-label="นักศึกษาที่บันทึก">
          <span className="fin-stat-icon" style={{ background: "#eaf1ff", color: "#1d63d8" }} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 19c1.2-3.2 3.9-5 7-5s5.8 1.8 7 5" /></svg>
          </span>
          <div>
            <p className="fin-stat-label">นักศึกษาที่บันทึก</p>
            <p className="fin-stat-value">{matched.length} คน</p>
          </div>
        </section>
        <section className="card fin-stat" aria-label="เอาเข้ารวม">
          <span className="fin-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          </span>
          <div>
            <p className="fin-stat-label">เอาเข้ารวม</p>
            <p className="fin-stat-value">{baht(totalIn)}</p>
          </div>
        </section>
        <section className="card fin-stat" aria-label="คงเหลือรวม">
          <span className="fin-stat-icon" style={{ background: "#fef3c7", color: "#92400e" }} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </span>
          <div>
            <p className="fin-stat-label">คงเหลือรวม</p>
            <p className="fin-stat-value">{baht(totalOut)}</p>
          </div>
        </section>
        <section className="card fin-stat" aria-label="ใช้ไปรวม">
          <span className="fin-stat-icon" style={{ background: "#e6e6fa", color: "#3b3480" }} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
          </span>
          <div>
            <p className="fin-stat-label">ใช้ไปรวม</p>
            <p className="fin-stat-value">
              {(() => {
                const gain = totalSpent.trim().startsWith("-");
                const abs = gain ? totalSpent.trim().slice(1) : totalSpent;
                return (
                  <span style={gain ? { color: "#16a34a" } : undefined}>
                    {gain ? `เงินเพิ่ม ${baht(abs)}` : baht(abs)}
                  </span>
                );
              })()}
            </p>
          </div>
        </section>
      </div>

      <form className="card fin-filter" role="search" method="get" action="/admin/finance">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />
        <div className="fin-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <label htmlFor="fin-q" className="sr-only">ค้นหาชื่อ / รหัสนักศึกษา</label>
          <input
            id="fin-q"
            name="q"
            type="search"
            className="input"
            placeholder="ค้นหาชื่อ / รหัสนักศึกษา…"
            defaultValue={q}
            maxLength={100}
          />
        </div>
        <div className="fin-shop">
          <label htmlFor="fin-shop" className="sr-only">รหัสร้าน</label>
          <select id="fin-shop" name="shopCode" className="input" defaultValue={shopCode}>
            <option value="">รหัสร้าน (ทั้งหมด)</option>
            {shopOptions.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">ค้นหา</button>
      </form>

      {view === "monthly" ? (
        <div className="card fin-table-card">
          {matched.length === 0 ? (
            <p className="muted px-6 py-6 text-sm">ไม่พบข้อมูลตามเงื่อนไข</p>
          ) : (
            <div className="fin-table-scroll">
              <table className="tbl">
                <caption className="sr-only">สรุปการเงินรายคน</caption>
                <thead>
                  <tr>
                    <th scope="col">นักศึกษา</th>
                    <th scope="col">เอาเข้า</th>
                    <th scope="col">คงเหลือ</th>
                    <th scope="col">ใช้ไป</th>
                    <th scope="col">สัดส่วน</th>
                    <th scope="col"><span className="sr-only">รายละเอียด</span></th>
                  </tr>
                </thead>
                <tbody>
                  {matched.map((r) => {
                    const spent = formatSpent(r.spentTotal);
                    return (
                      <tr key={r.user.id}>
                        <td>
                          <span className="fin-user">
                            <span className="fin-avatar" data-tone={toneOf(r.user.id)} aria-hidden="true">
                              {(r.user.firstName || "?").charAt(0)}
                            </span>
                            <span>
                              <span className="fin-username">
                                {r.user.firstName} {r.user.lastName}
                              </span>
                              {r.user.shopCode && (
                                <span className="fin-shopchip">{r.user.shopCode}</span>
                              )}
                              {r.incompleteDays > 0 && (
                                <span className="fin-incomplete">
                                  ข้อมูลไม่ครบ {r.incompleteDays} วัน
                                </span>
                              )}
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className="fin-amount">{baht(r.inTotal)}</span>
                          <span className="fin-sub">สด {baht(r.inCash)} · ทรู {baht(r.inTrue)}</span>
                        </td>
                        <td>
                          <span className="fin-amount">{baht(r.outTotal)}</span>
                          <span className="fin-sub">สด {baht(r.outCash)} · ทรู {baht(r.outTrue)}</span>
                        </td>
                        <td>
                          <span
                            className="fin-amount"
                            style={spent.isGain ? { color: "#16a34a" } : { color: "#1750b8" }}
                          >
                            {spent.text}
                          </span>
                          <span className="fin-sub">
                            สด {formatSpent(r.spentCash).text} · ทรู {formatSpent(r.spentTrue).text}
                          </span>
                        </td>
                        <td className="muted whitespace-nowrap text-[13px]">
                          {ratio(r.spentTotal, r.inTotal)}
                        </td>
                        <td>
                          <Link
                            href={`/admin/finance/${r.user.id}?month=${month}&year=${year}`}
                            className="fin-link"
                          >
                            ดูรายละเอียด ›
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="fin-footnote">
            ใช้ไป = เอาเข้า − คงเหลือ · วันที่ข้อมูลไม่ครบจะไม่นับเข้าใช้ไปรวม
          </p>
        </div>
      ) : (
        <div className="card fin-table-card">
          {days.length === 0 ? (
            <p className="muted px-6 py-6 text-sm">เดือนนี้ยังไม่มีข้อมูลการเงิน</p>
          ) : (
            <div className="fin-table-scroll">
              <table className="tbl">
                <caption className="sr-only">สรุปการเงินรายวัน</caption>
                <thead>
                  <tr>
                    <th scope="col">วันที่</th>
                    <th scope="col">นักศึกษา</th>
                    <th scope="col">เอาเข้า</th>
                    <th scope="col">คงเหลือ</th>
                    <th scope="col">ใช้ไป</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => {
                    const date = new Date(`${d.dateISO}T00:00:00Z`);
                    const spent = formatSpent(d.spentTotal);
                    return (
                      <tr key={d.dateISO}>
                        <td className="font-semibold whitespace-nowrap">
                          {dayNum.format(date)} {monthShort.format(date)}{" "}
                          <span className="muted font-normal">
                            {weekdayShort.format(date)}
                          </span>
                        </td>
                        <td className="tabular-nums">{d.students} คน</td>
                        <td>
                          <span className="fin-amount">{baht(d.inTotal)}</span>
                          <span className="fin-sub">สด {baht(d.inCash)} · ทรู {baht(d.inTrue)}</span>
                        </td>
                        <td>
                          <span className="fin-amount">{baht(d.outTotal)}</span>
                          <span className="fin-sub">สด {baht(d.outCash)} · ทรู {baht(d.outTrue)}</span>
                        </td>
                        <td>
                          <span
                            className="fin-amount"
                            style={spent.isGain ? { color: "#16a34a" } : { color: "#1750b8" }}
                          >
                            {spent.text}
                          </span>
                          <span className="fin-sub">
                            สด {formatSpent(d.spentCash).text} · ทรู {formatSpent(d.spentTrue).text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="fin-footnote">
            ใช้ไป = เอาเข้า − คงเหลือ · วันที่ข้อมูลไม่ครบจะไม่นับเข้าใช้ไปรวม
          </p>
        </div>
      )}
    </div>
  );
}
