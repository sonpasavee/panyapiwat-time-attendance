import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminPage } from "@/lib/page-auth";
import { formatSpent } from "@/lib/format";
import { idSchema, monthYear } from "@/validators/api";
import { getUserById } from "@/services/user.service";
import {
  amountToCents,
  centsToAmount,
} from "@/services/money-tracker.logic";
import { getMyDailyMoney } from "@/services/money-tracker.service";

import ExportMoneyButton from "../export-money-button";
import "../finance.css";

export const instant = false;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function str(value: string | string[] | undefined) {
  const v = first(value)?.trim();
  return v ? v : undefined;
}

function baht(value: string) {
  return `฿${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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

function shiftMonth(month: number, year: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

export default async function AdminFinanceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ month?: string | string[]; year?: string | string[] }>;
}) {
  await requireAdminPage();
  const { userId } = await params;
  const query = await searchParams;

  let validId = "";
  try {
    validId = idSchema.parse(userId);
  } catch {
    notFound();
  }

  let month = 0;
  let year = 0;
  try {
    ({ month, year } = monthYear(
      new URLSearchParams({
        ...(str(query.month) ? { month: str(query.month)! } : {}),
        ...(str(query.year) ? { year: str(query.year)! } : {}),
      }),
    ));
  } catch {
    notFound();
  }

  let user;
  try {
    user = await getUserById(validId);
  } catch {
    notFound();
  }
  if (user.role !== "STUDENT") notFound();

  const report = await getMyDailyMoney(validId, month, year);

  const sum = (pick: (d: (typeof report.days)[number]) => string) =>
    centsToAmount(
      report.days.reduce((total, d) => total + amountToCents(pick(d)), 0),
    );
  const inTotal = sum((d) => d.inTotal);
  const outTotal = sum((d) => d.outTotal);
  const completeDays = report.days.filter((d) => d.summary.complete);
  const spentTotal = centsToAmount(
    completeDays.reduce((total, d) => total + amountToCents(d.summary.totalSpent), 0),
  );
  const avgSpent =
    completeDays.length === 0
      ? "0"
      : centsToAmount(
          Math.round(amountToCents(spentTotal) / completeDays.length),
        );

  const inCash = sum((d) => d.summary.CASH.in);
  const inTrue = sum((d) => d.summary.TRUEMONEY.in);
  const outCash = sum((d) => d.summary.CASH.out);
  const outTrue = sum((d) => d.summary.TRUEMONEY.out);
  const spentCash = centsToAmount(
    completeDays.reduce((t, d) => t + amountToCents(d.summary.CASH.spent), 0),
  );
  const spentTrue = centsToAmount(
    completeDays.reduce((t, d) => t + amountToCents(d.summary.TRUEMONEY.spent), 0),
  );

  // กราฟ: เฉพาะวันที่ข้อมูลครบและใช้ไปไม่ติดลบ เรียงเก่าไปใหม่
  const chartDays = [...completeDays]
    .filter((d) => amountToCents(d.summary.totalSpent) >= 0)
    .reverse();
  const maxSpent = Math.max(
    1,
    ...chartDays.map((d) => amountToCents(d.summary.totalSpent)),
  );

  const prev = shiftMonth(month, year, -1);
  const next = shiftMonth(month, year, 1);
  const monthHref = (m: number, y: number) =>
    `/admin/finance/${validId}?month=${m}&year=${y}`;
  const spentShown = formatSpent(spentTotal);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/admin/finance?month=${month}&year=${year}`}
        className="inline-flex min-h-[44px] w-fit items-center gap-1 text-[15px] font-medium text-[#1750b8] no-underline hover:underline"
      >
        ‹ กลับไปสรุปการเงิน
      </Link>

      <div className="fin-head">
        <div className="flex min-w-0 flex-1 items-center gap-4 basis-52">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-xl font-bold"
            style={{ background: "#eaf1ff", color: "#1e3a8a" }}
          >
            {(user.firstName || "?").charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="m-0 text-[20px] font-bold leading-snug break-words sm:text-[24px]">
              {user.firstName} {user.lastName}
            </h1>
            <p className="m-0 break-words text-sm muted">
              {user.studentId ?? "–"}
              {user.shopCode ? ` · ${user.shopCode}` : ""}
            </p>
          </div>
        </div>
        <div className="fin-head-actions">
          <nav aria-label="เปลี่ยนเดือน" className="fin-monthnav">
            <Link href={monthHref(prev.month, prev.year)} aria-label="เดือนก่อนหน้า">
              ‹
            </Link>
            <span>{monthLongFmt.format(new Date(Date.UTC(year, month - 1, 1)))}</span>
            <Link href={monthHref(next.month, next.year)} aria-label="เดือนถัดไป">
              ›
            </Link>
          </nav>
          <ExportMoneyButton
            filename={`การเงิน_${user.studentId ?? user.id}_${year}-${String(month).padStart(2, "0")}.xlsx`}
            label="ส่งออกรายคน (.xlsx)"
            headers={["วันที่", "เอาเข้า สด", "เอาเข้า TrueMoney", "เอาเข้ารวม", "คงเหลือ สด", "คงเหลือ TrueMoney", "คงเหลือรวม", "ใช้ไป สด", "ใช้ไป TrueMoney", "ใช้ไปรวม"]}
            rows={report.days.map((d) => {
              const date = new Date(`${d.dateISO}T00:00:00Z`);
              const label = `${dayNum.format(date)} ${monthShort.format(date)}`;
              return [
                label,
                d.summary.CASH.in,
                d.summary.TRUEMONEY.in,
                d.inTotal,
                d.summary.CASH.out,
                d.summary.TRUEMONEY.out,
                d.outTotal,
                d.summary.complete ? d.summary.CASH.spent : "–",
                d.summary.complete ? d.summary.TRUEMONEY.spent : "–",
                d.summary.complete ? d.summary.totalSpent : "–",
              ];
            })}
          />
        </div>
      </div>

      <div className="fin-stats">
        <section className="card fin-stat" aria-label="เอาเข้ารวม">
          <span className="fin-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          </span>
          <div>
            <p className="fin-stat-label">เอาเข้ารวม</p>
            <p className="fin-stat-value">{baht(inTotal)}</p>
            <p className="fin-stat-sub">สด {baht(inCash)} · ทรู {baht(inTrue)}</p>
          </div>
        </section>
        <section className="card fin-stat" aria-label="คงเหลือรวม">
          <span className="fin-stat-icon" style={{ background: "#fef3c7", color: "#92400e" }} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </span>
          <div>
            <p className="fin-stat-label">คงเหลือรวม</p>
            <p className="fin-stat-value">{baht(outTotal)}</p>
            <p className="fin-stat-sub">สด {baht(outCash)} · ทรู {baht(outTrue)}</p>
          </div>
        </section>
        <section className="card fin-stat" aria-label="ใช้ไปรวม">
          <span className="fin-stat-icon" style={{ background: "#e6e6fa", color: "#3b3480" }} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></svg>
          </span>
          <div>
            <p className="fin-stat-label">ใช้ไปรวม</p>
            <p className="fin-stat-value" style={spentShown.isGain ? { color: "#16a34a" } : undefined}>
              {spentShown.isGain ? `เงินเพิ่ม ${baht(spentTotal.slice(1))}` : baht(spentTotal)}
            </p>
            <p className="fin-stat-sub">
              สด {formatSpent(spentCash).text} · ทรู {formatSpent(spentTrue).text}
            </p>
          </div>
        </section>
        <section className="card fin-stat" aria-label="เฉลี่ยใช้ต่อวัน">
          <span className="fin-stat-icon" style={{ background: "#eaf1ff", color: "#1d63d8" }} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" /></svg>
          </span>
          <div>
            <p className="fin-stat-label">เฉลี่ยใช้ต่อวัน</p>
            <p className="fin-stat-value">{baht(avgSpent)}</p>
            <p className="fin-stat-sub">จาก {completeDays.length} วัน</p>
          </div>
        </section>
      </div>

      <section aria-label="เงินที่ใช้ไปรายวัน" className="card">
        <h2 className="m-0 px-6 pt-5 text-[17px] font-semibold">เงินที่ใช้ไปรายวัน</h2>
        {chartDays.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">ยังไม่มีวันที่สรุปยอดได้</p>
        ) : (
          <>
            <div className="fin-chart-scroll">
              <div
                className="fin-chart"
                role="img"
                aria-label="กราฟเงินที่ใช้ไปรายวัน แยกเงินสดและ TrueMoney"
              >
                {chartDays.map((d) => {
                  const cash = amountToCents(d.summary.CASH.spent);
                  const tru = amountToCents(d.summary.TRUEMONEY.spent);
                  const total = cash + tru;
                  const date = new Date(`${d.dateISO}T00:00:00Z`);
                  return (
                    <div key={d.dateISO} className="fin-bar-col">
                      <span className="fin-bar-value">
                        ฿{Number(centsToAmount(total)).toLocaleString("en-US", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <div
                        className="fin-bar"
                        style={{ height: `${Math.max(4, (total / maxSpent) * 100)}%` }}
                      >
                        <span className="fin-bar-true" style={{ height: `${total === 0 ? 0 : (tru / total) * 100}%` }} />
                        <span className="fin-bar-cash" style={{ height: `${total === 0 ? 0 : (cash / total) * 100}%` }} />
                      </div>
                      <span className="fin-bar-label">
                        {dayNum.format(date)} {monthShort.format(date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="fin-chart-legend">
              <span>
                <span className="fin-dot" style={{ background: "#f59e0b" }} /> เงินสด
              </span>
              <span>
                <span className="fin-dot" style={{ background: "#6366f1" }} /> TrueMoney
              </span>
            </div>
          </>
        )}
      </section>

      <div className="card fin-table-card">
        {report.days.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">เดือนนี้ยังไม่มีข้อมูลการเงิน</p>
        ) : (
          <div className="fin-table-scroll">
            <table className="tbl">
              <caption className="sr-only">รายวันของ {user.firstName}</caption>
              <thead>
                <tr>
                  <th scope="col">วันที่</th>
                  <th scope="col">เอาเข้า</th>
                  <th scope="col">คงเหลือ</th>
                  <th scope="col">ใช้ไป</th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((d) => {
                  const date = new Date(`${d.dateISO}T00:00:00Z`);
                  const spent = formatSpent(d.summary.totalSpent);
                  return (
                    <tr key={d.dateISO}>
                      <td className="font-semibold whitespace-nowrap">
                        {dayNum.format(date)} {monthShort.format(date)}{" "}
                        <span className="muted font-normal">{weekdayShort.format(date)}</span>
                      </td>
                      <td>
                        <span className="fin-amount">{baht(d.inTotal)}</span>
                        <span className="fin-sub">
                          สด {baht(d.summary.CASH.in)} · ทรู {baht(d.summary.TRUEMONEY.in)}
                        </span>
                      </td>
                      <td>
                        <span className="fin-amount">{baht(d.outTotal)}</span>
                        <span className="fin-sub">
                          สด {baht(d.summary.CASH.out)} · ทรู {baht(d.summary.TRUEMONEY.out)}
                        </span>
                      </td>
                      <td>
                        {d.summary.complete ? (
                          <>
                            <span
                              className="fin-amount"
                              style={spent.isGain ? { color: "#16a34a" } : { color: "#1750b8" }}
                            >
                              {spent.text}
                            </span>
                            <span className="fin-sub">
                              สด {formatSpent(d.summary.CASH.spent).text} · ทรู{" "}
                              {formatSpent(d.summary.TRUEMONEY.spent).text}
                            </span>
                          </>
                        ) : (
                          <span className="muted text-sm">ข้อมูลไม่ครบ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
