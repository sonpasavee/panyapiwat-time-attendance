import Link from "next/link";

import { requireAdminPage } from "@/lib/page-auth";
import {
  bangkokDateKey,
  formatThaiHeader,
  formatTime,
} from "@/lib/format";
import { monthYear } from "@/validators/api";
import { monthRange } from "@/lib/time";
import { listUsers } from "@/services/user.service";
import {
  buildAdminAttendanceFilter,
  listAdminAttendance,
} from "@/services/attendance.service";
import { listAdminLeaves } from "@/services/leave.service";
import {
  buildAdminMoneyFilter,
  listAdminMoneyEntries,
} from "@/services/money-tracker.service";
import {
  amountToCents,
  summarizeDailyMoney,
} from "@/services/money-tracker.logic";

import ExportCsvButton from "../components/export-csv-button";
import ShopSelect from "./shop-select";
import "./admin-overview.css";

export const instant = false;

type SearchParams = {
  shopCode?: string | string[];
  status?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type RowStatus = "done" | "working" | "leave-sick" | "leave-personal" | "leave-holiday" | "not-in";

const LEAVE_PILL: Record<string, { label: string; type: "SICK" | "PERSONAL" | "HOLIDAY" }> = {
  "leave-sick": { label: "ลาป่วย", type: "SICK" },
  "leave-personal": { label: "ลากิจ", type: "PERSONAL" },
  "leave-holiday": { label: "วันหยุด", type: "HOLIDAY" },
};

const TONES = ["blue", "green", "yellow", "pink", "lavender"] as const;

function toneOf(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % 997;
  return TONES[hash % TONES.length];
}

const dayNumFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
});
const monthShortFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "short",
});
const yearFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
});

function fmtHours(minutes: number | null | undefined) {
  if (minutes == null) return null;
  return `${Math.floor(minutes / 60)} ชม. ${minutes % 60} น.`;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const shopCode = first(params.shopCode)?.trim() || "";
  const status = first(params.status)?.trim() || "all";

  const todayKey = bangkokDateKey();
  const todayDate = new Date(`${todayKey}T00:00:00.000Z`);
  const yesterday = new Date(todayDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const { month: curMonth, year: curYear } = monthYear(new URLSearchParams());

  const [students, todayAtt, todayLeaves, missedOut, monthAtt, monthMoney] =
    await Promise.all([
      listUsers({ role: "STUDENT", isActive: true }, 0, 500),
      listAdminAttendance(
        buildAdminAttendanceFilter({ date: todayKey }),
        0,
        1000,
        "asc",
      ),
      listAdminLeaves(
        { startDate: { lte: todayDate }, endDate: { gte: todayDate } },
        0,
        500,
      ),
      listAdminAttendance(
        buildAdminAttendanceFilter({ date: yesterdayKey, status: "checked-in" }),
        0,
        100,
        "asc",
      ),
      listAdminAttendance(
        buildAdminAttendanceFilter({ monthRange: monthRange(curYear, curMonth) }),
        0,
        5000,
        "asc",
      ),
      listAdminMoneyEntries(
        buildAdminMoneyFilter(curMonth, curYear, {}),
        0,
        5000,
      ),
    ]);

  const shops = [...new Set(students.items.map((u) => u.shopCode).filter(Boolean))].sort() as string[];

  const attByUser = new Map(todayAtt.items.map((a) => [a.userId, a]));
  const leaveByUser = new Map(todayLeaves.items.map((l) => [l.userId, l]));

  type Row = {
    id: string;
    name: string;
    shop: string;
    checkIn: string;
    checkOut: string;
    hours: string | null;
    working: boolean;
    status: RowStatus;
  };

  const inScope = students.items.filter(
    (u) => !shopCode || u.shopCode === shopCode,
  );

  const allRows: Row[] = inScope.map((u) => {
    const att = attByUser.get(u.id);
    const leave = leaveByUser.get(u.id);
    let s: RowStatus = "not-in";
    if (att?.checkOutAt) s = "done";
    else if (att) s = "working";
    else if (leave?.type === "SICK") s = "leave-sick";
    else if (leave?.type === "PERSONAL") s = "leave-personal";
    else if (leave) s = "leave-holiday";
    const hours = att?.workMinutes != null ? fmtHours(att.workMinutes) : null;
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      shop: u.shopCode ?? "–",
      checkIn: att ? formatTime(att.checkInAt) : "–",
      checkOut: att?.checkOutAt ? formatTime(att.checkOutAt) : "–",
      hours,
      working: !!att && !att.checkOutAt,
      status: s,
    };
  });

  const checkedIn = allRows.filter((r) => r.status === "done" || r.status === "working").length;
  const onLeave = allRows.filter((r) => r.status.startsWith("leave")).length;
  const notIn = allRows.length - checkedIn - onLeave;
  const pct1 = (n: number) =>
    allRows.length === 0 ? "0.0%" : `${((n / allRows.length) * 100).toFixed(1)}%`;

  const matchStatus = (r: Row) => {
    if (status === "in") return r.status === "done" || r.status === "working";
    if (status === "not") return r.status === "not-in";
    if (status === "leave") return r.status.startsWith("leave");
    return true;
  };
  const filtered = allRows.filter(matchStatus);
  const shown = filtered.slice(0, 7);

  // ข้อมูลเงินไม่ครบ = เช็กเอาท์แล้วแต่สรุปยอดรายวันไม่ได้
  const incompleteMoney = todayAtt.items.filter(
    (a) => a.checkOutAt && !summarizeDailyMoney(a.money).complete,
  ).length;

  // อัตราเข้างานรายร้านของเดือนนี้:
  // วันทำงานที่ distinct (คน, วัน) / (นักศึกษาในร้าน × วันจันทร์–ศุกร์ที่พ้นมาแล้วของเดือน)
  const elapsedWeekdays = (() => {
    const todayDay = todayDate.getUTCDate();
    let count = 0;
    for (let d = 1; d <= todayDay; d += 1) {
      const dow = new Date(Date.UTC(curYear, curMonth - 1, d)).getUTCDay();
      if (dow >= 1 && dow <= 5) count += 1;
    }
    return Math.max(count, 1);
  })();
  const shopCheckDays = new Map<string, Set<string>>();
  for (const a of monthAtt.items) {
    const shop = a.user.shopCode ?? "–";
    let set = shopCheckDays.get(shop);
    if (!set) {
      set = new Set<string>();
      shopCheckDays.set(shop, set);
    }
    set.add(`${a.userId}_${a.workDate.toISOString().slice(0, 10)}`);
  }
  const shopStudents = new Map<string, number>();
  for (const u of students.items) {
    const shop = u.shopCode ?? "–";
    shopStudents.set(shop, (shopStudents.get(shop) ?? 0) + 1);
  }
  const shopRates = [...shopStudents.entries()]
    .filter(([shop]) => !shopCode || shop === shopCode)
    .map(([shop, count]) => {
      const days = shopCheckDays.get(shop)?.size ?? 0;
      const rate = Math.min(100, Math.round((days / (count * elapsedWeekdays)) * 100));
      return { shop, rate };
    })
    .sort((a, b) => (a.shop < b.shop ? -1 : 1));
  const avgRate =
    shopRates.length === 0
      ? 0
      : Math.round(
          shopRates.reduce((sum, r) => {
            const count = shopStudents.get(r.shop) ?? 0;
            return sum + (r.rate * count * elapsedWeekdays) / 100;
          }, 0) /
            Math.max(
              1,
              shopRates.reduce((sum, r) => sum + (shopStudents.get(r.shop) ?? 0), 0) *
                elapsedWeekdays,
            ) *
            100,
        );
  const minRate = Math.min(...shopRates.map((r) => r.rate), 100);

  // การเงินเดือนนี้
  let inCents = 0;
  let outCents = 0;
  for (const e of monthMoney.items) {
    const c = amountToCents(String(e.amount));
    if (e.direction === "IN") inCents += c;
    else outCents += c;
  }
  const spentCents = inCents - outCents;
  const spentPct = inCents === 0 ? 0 : Math.max(0, Math.round((spentCents / inCents) * 100));
  const baht = (c: number) =>
    `฿${Math.round(c / 100).toLocaleString("en-US")}`;

  const linkBase: Record<string, string> = {
    ...(shopCode ? { shopCode } : {}),
  };

  const pillHref = (value: string) =>
    `/admin?${new URLSearchParams(value === "all" ? linkBase : { ...linkBase, status: value }).toString()}`;

  const dateLabel = `${dayNumFmt.format(todayDate)} ${monthShortFmt.format(todayDate)} ${yearFmt.format(todayDate)}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="ov-head">
        <div>
          <h1>ภาพรวมวันนี้</h1>
          <p>
            {formatThaiHeader()} · นักศึกษาทั้งหมด {allRows.length} คน
          </p>
        </div>
        <div className="ov-head-actions">
          <ShopSelect value={shopCode} options={shops} baseParams={status !== "all" ? { status } : {}} />
          <Link href={`/admin/attendance?date=${todayKey}`} className="ov-datelink">
            {dateLabel} (วันนี้)
          </Link>
          <ExportCsvButton
            filename={`overview-${todayKey}.csv`}
            headers={["ชื่อ", "ร้าน", "เช็กอิน", "เช็กเอาท์", "ชั่วโมงทำงาน", "สถานะ"]}
            rows={filtered.map((r) => [
              r.name,
              r.shop,
              r.checkIn,
              r.checkOut,
              r.hours ?? (r.working ? "กำลังนับเวลา" : "–"),
              r.status === "done"
                ? "ครบ"
                : r.status === "working"
                  ? "กำลังทำงาน"
                  : r.status === "not-in"
                    ? "ยังไม่เช็กอิน"
                    : LEAVE_PILL[r.status].label,
            ])}
          />
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="การเข้างานวันนี้" className="card card-pad">
            <h2 className="m-0 text-[17px] font-semibold">การเข้างานวันนี้</h2>
            <p className="ov-rate-value">
              {pct1(checkedIn).replace("%", "")}
              <span style={{ fontSize: 28 }}>%</span>{" "}
              <span className="ov-rate-sub">
                เช็กอินแล้ว {checkedIn} จาก {allRows.length} คน
              </span>
            </p>
            <div className="ov-bar" role="img" aria-label={`เช็กอินแล้ว ${pct1(checkedIn)} ยังไม่เช็กอิน ${pct1(notIn)} ลา ${pct1(onLeave)}`}>
              <span style={{ width: pct1(checkedIn), background: "#1d63d8" }} />
              <span style={{ width: pct1(notIn), background: "#c3cfe0" }} />
              <span style={{ width: pct1(onLeave), background: "#f59e0b" }} />
            </div>
            <div className="ov-legend">
              <span className="ov-legend-item">
                <span className="ov-dot" style={{ background: "#1d63d8" }} />
                <span>เช็กอินแล้ว<strong>{checkedIn} {pct1(checkedIn)}</strong></span>
              </span>
              <span className="ov-legend-item">
                <span className="ov-dot" style={{ background: "#c3cfe0" }} />
                <span>ยังไม่เช็กอิน<strong>{notIn} {pct1(notIn)}</strong></span>
              </span>
              <span className="ov-legend-item">
                <span className="ov-dot" style={{ background: "#f59e0b" }} />
                <span>ลาวันนี้<strong>{onLeave} {pct1(onLeave)}</strong></span>
              </span>
            </div>
          </section>

          <section aria-label="การลงเวลาวันนี้" className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
              <h2 className="m-0 text-[19px] font-semibold">การลงเวลาวันนี้</h2>
              <Link href={`/admin/attendance?date=${todayKey}`} className="text-sm font-semibold text-[#1750b8] no-underline hover:underline">
                เปิดหน้าการลงเวลา ›
              </Link>
            </div>
            <div className="ov-pills px-6 pb-4">
              {(
                [
                  ["all", `ทั้งหมด ${allRows.length}`],
                  ["in", `เช็กอินแล้ว ${checkedIn}`],
                  ["not", `ยังไม่เช็กอิน ${notIn}`],
                  ["leave", `ลา ${onLeave}`],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={value}
                  href={pillHref(value)}
                  className="ov-pill"
                  aria-current={(status === "all" ? "all" : status) === value ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="muted px-6 pb-6 text-sm">ไม่พบข้อมูลตามเงื่อนไข</p>
            ) : (
              <div className="ov-table-scroll">
                <table className="tbl">
                  <caption className="sr-only">การลงเวลาวันนี้</caption>
                  <thead>
                    <tr>
                      <th scope="col">นักศึกษา</th>
                      <th scope="col">ร้าน</th>
                      <th scope="col">เช็กอิน</th>
                      <th scope="col">เช็กเอาท์</th>
                      <th scope="col">ชั่วโมงทำงาน</th>
                      <th scope="col">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="ov-user">
                            <span className="ov-avatar" data-tone={toneOf(r.id)} aria-hidden="true">
                              {r.name.charAt(0)}
                            </span>
                            {r.name}
                          </span>
                        </td>
                        <td>{r.shop}</td>
                        <td className="tabular-nums">{r.checkIn}</td>
                        <td className="tabular-nums">{r.checkOut}</td>
                        <td className="font-semibold">
                          {r.hours ?? (r.working ? "กำลังนับเวลา…" : "–")}
                        </td>
                        <td>
                          {r.status === "done" ? (
                            <span className="badge badge-green">ครบ</span>
                          ) : r.status === "working" ? (
                            <span className="badge badge-blue">กำลังทำงาน</span>
                          ) : r.status === "not-in" ? (
                            <span className="badge badge-gray">ยังไม่เช็กอิน</span>
                          ) : r.status === "leave-sick" ? (
                            <span className="badge badge-pink">ลาป่วย</span>
                          ) : r.status === "leave-personal" ? (
                            <span className="badge badge-yellow">ลากิจ</span>
                          ) : (
                            <span className="badge badge-gray">วันหยุด</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="ov-foot">
              <span>
                แสดง {shown.length} จาก {filtered.length} คน
              </span>
              <Link href={`/admin/attendance?date=${todayKey}`}>ดูทั้งหมด ›</Link>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="ต้องติดตาม" className="card card-pad">
            <h2 className="m-0 text-[17px] font-semibold">ต้องติดตาม</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div className="ov-todo" style={{ background: "#fffbeb" }}>
                <span>
                  <strong style={{ color: "#92400e" }}>{notIn}</strong>
                  <span style={{ color: "#92400e" }}>ยังไม่เช็กอินวันนี้</span>
                  <span style={{ color: "#b45309" }}>ยังไม่มีเวลาเข้าในระบบ</span>
                </span>
                <Link href={`/admin?${new URLSearchParams({ ...linkBase, status: "not" }).toString()}`} style={{ color: "#1750b8" }}>
                  ดูรายชื่อ ›
                </Link>
              </div>
              <div className="ov-todo" style={{ background: "#fef2f2" }}>
                <span>
                  <strong style={{ color: "#be123c" }}>{missedOut.total}</strong>
                  <span style={{ color: "#881337" }}>ลืมเช็กเอาท์เมื่อวาน</span>
                  <span style={{ color: "#be123c" }}>ชั่วโมงทำงานเมื่อวานยังไม่ครบ</span>
                </span>
                <Link href={`/admin/attendance?date=${yesterdayKey}`} style={{ color: "#1750b8" }}>
                  ดูรายชื่อ ›
                </Link>
              </div>
              <div className="ov-todo" style={{ background: "#eaf1ff" }}>
                <span>
                  <strong style={{ color: "#1e3a8a" }}>{incompleteMoney}</strong>
                  <span style={{ color: "#1e3a8a" }}>ข้อมูลเงินไม่ครบ</span>
                  <span style={{ color: "#475569" }}>เมื่อวานไม่ได้กรอกเงินคงเหลือ</span>
                </span>
                <Link href={`/admin/attendance?date=${todayKey}`} style={{ color: "#1750b8" }}>
                  ดูรายชื่อ ›
                </Link>
              </div>
            </div>
          </section>

          <section aria-label="อัตราเข้างานรายร้าน" className="card card-pad">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="m-0 text-[17px] font-semibold">อัตราเข้างานรายร้าน</h2>
              <span className="text-[13px] muted">เฉลี่ย {avgRate}% เดือนนี้</span>
            </div>
            <div className="mt-2">
              {shopRates.map((r) => (
                <div key={r.shop} className="ov-shopbar">
                  <span className="muted font-medium">{r.shop}</span>
                  <span className="ov-shopbar-track">
                    <span
                      className="ov-shopbar-fill"
                      style={{
                        width: `${r.rate}%`,
                        background: r.rate === minRate && shopRates.length > 1 ? "#f59e0b" : "#1d63d8",
                      }}
                    />
                  </span>
                  <span className="text-right font-bold tabular-nums">{r.rate}%</span>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="ลาและวันหยุดวันนี้" className="card card-pad">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="m-0 text-[17px] font-semibold">ลาและวันหยุดวันนี้</h2>
              <span className="text-[22px] font-bold tabular-nums">
                {todayLeaves.total} <span className="text-[13px] font-medium muted">คน</span>
              </span>
            </div>
            <div className="mt-2">
              {todayLeaves.items.slice(0, 5).map((l) => (
                <div key={l.id} className="ov-leave-row">
                  <span>
                    <span className="ov-leave-name">
                      {l.user.firstName} {l.user.lastName}
                    </span>
                    <span className="ov-leave-shop">{l.user.shopCode ?? "–"}</span>
                  </span>
                  <span
                    className="ov-type"
                    data-type={l.type === "SICK" ? "SICK" : l.type === "PERSONAL" ? "PERSONAL" : "HOLIDAY"}
                  >
                    {l.type === "SICK" ? "ลาป่วย" : l.type === "PERSONAL" ? "ลากิจ" : "วันหยุด"}
                  </span>
                </div>
              ))}
              {todayLeaves.items.length === 0 && (
                <p className="muted py-4 text-center text-sm">วันนี้ยังไม่มีใบลา</p>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] muted">ดูอย่างเดียว · ไม่ต้องรออนุมัติ</span>
              <Link href="/admin/leaves" className="text-sm font-semibold text-[#1750b8] no-underline hover:underline">
                ดูทั้งหมด ›
              </Link>
            </div>
          </section>

          <section aria-label="การเงินเดือนนี้" className="card card-pad">
            <h2 className="m-0 text-[17px] font-semibold">การเงินเดือนนี้</h2>
            <div className="ov-money-grid mt-3">
              <span>เอาเข้ารวม<strong>{baht(inCents)}</strong></span>
              <span>คงเหลือรวม<strong>{baht(outCents)}</strong></span>
              <span>ใช้ไปรวม<strong style={{ color: "#1750b8" }}>{baht(spentCents)}</strong></span>
            </div>
            <div className="ov-money-bar" role="img" aria-label={`ใช้ไป ${spentPct}% ของเงินที่นำเข้า`}>
              <span style={{ width: `${Math.min(100, spentPct)}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] muted">ใช้ไป {spentPct}% ของเงินที่นำเข้า</span>
              <Link href="/admin/finance" className="text-sm font-semibold text-[#1750b8] no-underline hover:underline">
                ดูการเงินนักศึกษา ›
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
