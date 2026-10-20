"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import ExportCsvButton from "../../components/export-csv-button";

export type LeaveRow = {
  id: string;
  type: "SICK" | "PERSONAL" | "HOLIDAY";
  start: string;
  end: string;
  reason: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    shopCode: string | null;
  };
};

const TYPE_LABEL: Record<LeaveRow["type"], string> = {
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  HOLIDAY: "วันหยุด",
};

const TONES = ["blue", "green", "yellow", "pink", "lavender"] as const;

function toneOf(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % 997;
  return TONES[hash % TONES.length];
}

const DAY_MS = 86400000;
// รับได้ทั้ง "YYYY-MM-DD" (props จาก server) และ full ISO datetime (items จาก API)
const parseISO = (iso: string) =>
  iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) =>
  toISO(new Date(parseISO(iso).getTime() + n * DAY_MS));

function diffDays(a: string, b: string) {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / DAY_MS) + 1;
}

const dayNum = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
});
const monthShort = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "short",
});
const yearFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
});
const monthLongFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "long",
  year: "numeric",
});

function shortDate(iso: string) {
  const d = parseISO(iso);
  return `${dayNum.format(d)} ${monthShort.format(d)}`;
}

function fullDate(iso: string) {
  const d = parseISO(iso);
  return `${dayNum.format(d)} ${monthShort.format(d)} ${yearFmt.format(d)}`;
}

function rangeLabel(start: string, end: string) {
  return start === end ? shortDate(start) : `${shortDate(start)} – ${shortDate(end)}`;
}

function createdLabel(iso: string) {
  const d = new Date(iso);
  return `${dayNum.format(d)} ${monthShort.format(d)} ${timeFmt.format(d)}`;
}

function monthLabelText(year: number, month: number) {
  return monthLongFmt.format(new Date(Date.UTC(year, month - 1, 1)));
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

function withParams(base: Record<string, string>, extra: Record<string, string>) {
  const params = new URLSearchParams({ ...base, ...extra });
  for (const [k, v] of Object.entries(extra)) {
    if (v === "") params.delete(k);
  }
  return `/admin/leaves?${params.toString()}`;
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" /></svg>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" /></svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  );
}

function SunIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  );
}

export default function LeavesManager({
  items,
  view,
  month,
  year,
  filters,
  linkBase,
  todayISO,
}: {
  items: LeaveRow[];
  view: "student" | "date" | "timeline";
  month: number;
  year: number;
  filters: { q: string; shopCode: string; type: "" | LeaveRow["type"] };
  linkBase: Record<string, string>;
  todayISO: string;
}) {
  const [q, setQ] = useState(filters.q);
  const [shopCode, setShopCode] = useState(filters.shopCode);
  const [page, setPage] = useState(1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const visible = useMemo(
    () =>
      filters.type === ""
        ? items
        : items.filter((r) => r.type === filters.type),
    [items, filters.type],
  );

  const counts = useMemo(() => {
    const c = { total: items.length, SICK: 0, PERSONAL: 0, HOLIDAY: 0 };
    for (const r of items) c[r.type] += 1;
    return c;
  }, [items]);

  const todayLeaves = useMemo(
    () => visible.filter((r) => r.start <= todayISO && r.end >= todayISO),
    [visible, todayISO],
  );
  const todayPeople = new Set(todayLeaves.map((r) => r.user.id)).size;

  const studentGroups = useMemo(() => {
    const groups = new Map<string, { user: LeaveRow["user"]; leaves: LeaveRow[] }>();
    for (const leave of visible) {
      const group = groups.get(leave.user.id) ?? { user: leave.user, leaves: [] };
      group.leaves.push(leave);
      groups.set(leave.user.id, group);
    }
    return [...groups.values()]
      .map((group) => {
        const days = new Set<string>();
        for (const leave of group.leaves) {
          const start = leave.start < monthStart ? monthStart : leave.start;
          const end = leave.end > monthEnd ? monthEnd : leave.end;
          for (let date = start; date <= end; date = addDays(date, 1)) days.add(date);
        }
        return {
          ...group,
          leaves: group.leaves.sort((a, b) => a.start.localeCompare(b.start)),
          totalDays: days.size,
        };
      })
      .sort((a, b) => `${a.user.firstName} ${a.user.lastName}`.localeCompare(`${b.user.firstName} ${b.user.lastName}`, "th"));
  }, [visible, monthStart, monthEnd]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(studentGroups.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageGroups = studentGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const dateGroups = useMemo(() => {
    const groups = new Map<string, LeaveRow[]>();
    for (const leave of visible) {
      const start = leave.start < monthStart ? monthStart : leave.start;
      const end = leave.end > monthEnd ? monthEnd : leave.end;
      for (let date = start; date <= end; date = addDays(date, 1)) {
        const rows = groups.get(date) ?? [];
        rows.push(leave);
        groups.set(date, rows);
      }
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, leaves]) => ({ date, leaves }));
  }, [visible, monthStart, monthEnd]);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const navBase = linkBase;

  const csvRows = useMemo(
    () =>
      visible.map((r) => [
        `${r.user.firstName} ${r.user.lastName}`,
        r.user.shopCode ?? "–",
        TYPE_LABEL[r.type],
        rangeLabel(r.start, r.end),
        r.reason ?? "–",
        createdLabel(r.createdAt),
      ]),
    [visible],
  );

  // ---------- ไทม์ไลน์ ----------
  const timeline = useMemo(() => {
    const byUser = new Map<string, { user: LeaveRow["user"]; days: Array<LeaveRow["type"] | null> }>();
    for (const r of visible) {
      let row = byUser.get(r.user.id);
      if (!row) {
        row = { user: r.user, days: Array(daysInMonth).fill(null) };
        byUser.set(r.user.id, row);
      }
      const s = r.start < monthStart ? monthStart : r.start;
      const e = r.end > monthEnd ? monthEnd : r.end;
      for (let d = s; ; d = addDays(d, 1)) {
        row.days[Number(d.slice(8, 10)) - 1] = r.type;
        if (d === e) break;
      }
    }
    return [...byUser.values()].map((row) => ({
      ...row,
      totalDays: row.days.filter(Boolean).length,
    }));
  }, [visible, daysInMonth, monthStart, monthEnd]);

  const todayDay =
    todayISO.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}`
      ? Number(todayISO.slice(8, 10))
      : null;

  const pills: Array<{ value: "" | LeaveRow["type"]; label: string; count: number }> = [
    { value: "", label: "ทั้งหมด", count: counts.total },
    { value: "SICK", label: "ลาป่วย", count: counts.SICK },
    { value: "PERSONAL", label: "ลากิจ", count: counts.PERSONAL },
    { value: "HOLIDAY", label: "วันหยุด", count: counts.HOLIDAY },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="admin-leaves-head">
        <div>
          <h1>การลาและวันหยุด</h1>
          <p>ดูข้อมูลการลาและวันหยุดของนักศึกษา · ไม่ต้องรออนุมัติ (ดูอย่างเดียว)</p>
        </div>
        <div className="admin-leaves-head-actions">
          <nav aria-label="สลับมุมมอง" className="admin-leaves-view">
            <Link
              href={withParams({ ...navBase }, { view: "student" })}
              aria-current={view === "student" ? "page" : undefined}
            >
              ตามนักศึกษา
            </Link>
            <Link
              href={withParams({ ...navBase }, { view: "date" })}
              aria-current={view === "date" ? "page" : undefined}
            >
              ตามวันที่
            </Link>
            <Link
              href={withParams({ ...navBase }, { view: "timeline" })}
              aria-current={view === "timeline" ? "page" : undefined}
            >
              ไทม์ไลน์
            </Link>
          </nav>
          <nav aria-label="เปลี่ยนเดือน" className="admin-leaves-monthnav">
            <Link
              href={withParams({ ...navBase }, { month: String(prev.month), year: String(prev.year) })}
              aria-label="เดือนก่อนหน้า"
            >
              ‹
            </Link>
            <span>{monthLabelText(year, month)}</span>
            <Link
              href={withParams({ ...navBase }, { month: String(next.month), year: String(next.year) })}
              aria-label="เดือนถัดไป"
            >
              ›
            </Link>
          </nav>
          <ExportCsvButton
            filename={`การลา_${year}-${String(month).padStart(2, "0")}.csv`}
            headers={["ชื่อ", "ร้าน", "ประเภท", "วันที่", "เหตุผล", "บันทึกเมื่อ"]}
            rows={csvRows}
          />
        </div>
      </div>

      {view !== "timeline" && <section className="card admin-leaves-today" aria-label="สรุปการลาในวันนี้">
        <span className="admin-leaves-today-icon" aria-hidden="true"><SunIcon /></span>
        <div className="admin-leaves-today-content">
          <span className="admin-leaves-today-date">วันนี้ · {fullDate(todayISO)}</span>
          <h2>หยุด/ลาวันนี้ {todayPeople} คน</h2>
          <div className="admin-leaves-today-people">
            {todayLeaves.length === 0 ? (
              <span className="muted text-sm">ไม่มีนักศึกษาหยุดหรือลาวันนี้</span>
            ) : [...new Map(todayLeaves.map((leave) => [leave.user.id, leave.user])).values()].map((user) => {
              const userLeaves = todayLeaves.filter((leave) => leave.user.id === user.id);
              return (
                <span className="admin-leaves-today-person" key={user.id}>
                  <span className="admin-leaves-avatar" data-tone={toneOf(user.id)} aria-hidden="true">{(user.firstName || "?").charAt(0)}</span>
                  <strong>{user.firstName} {user.lastName}</strong>
                  {userLeaves.map((leave) => <span className="admin-leaves-type" data-type={leave.type} key={leave.id}>{TYPE_LABEL[leave.type]}</span>)}
                </span>
              );
            })}
          </div>
        </div>
        <span className="admin-leaves-today-note">จากนักศึกษาทั้งหมดที่มีรายการเดือนนี้</span>
      </section>}

      {view === "student" && <div className="admin-leaves-stats">
        <section className="card admin-leaves-stat" aria-label="หยุดหรือลาวันนี้">
          <span className="admin-leaves-stat-icon" style={{ background: "#eaf1ff", color: "#1d63d8" }} aria-hidden="true">
            <CalendarIcon />
          </span>
          <div>
            <p className="admin-leaves-stat-label">หยุด/ลาวันนี้</p>
            <p className="admin-leaves-stat-value">{todayPeople} คน</p>
          </div>
        </section>
        <section className="card admin-leaves-stat" aria-label="ลาป่วย">
          <span className="admin-leaves-stat-icon" style={{ background: "#ffe4e6", color: "#be123c" }} aria-hidden="true">
            <HeartIcon />
          </span>
          <div>
            <p className="admin-leaves-stat-label">ลาป่วย</p>
            <p className="admin-leaves-stat-value">{counts.SICK} ใบ</p>
          </div>
        </section>
        <section className="card admin-leaves-stat" aria-label="ลากิจ">
          <span className="admin-leaves-stat-icon" style={{ background: "#e6e6fa", color: "#3b3480" }} aria-hidden="true">
            <BagIcon />
          </span>
          <div>
            <p className="admin-leaves-stat-label">ลากิจ</p>
            <p className="admin-leaves-stat-value">{counts.PERSONAL} ใบ</p>
          </div>
        </section>
        <section className="card admin-leaves-stat" aria-label="วันหยุด">
          <span className="admin-leaves-stat-icon" style={{ background: "#eaf1ff", color: "#1d63d8" }} aria-hidden="true">
            <SunIcon />
          </span>
          <div>
            <p className="admin-leaves-stat-label">วันหยุด</p>
            <p className="admin-leaves-stat-value">{counts.HOLIDAY} รายการ</p>
          </div>
        </section>
      </div>}

      <form
        className="card admin-leaves-filter"
        role="search"
        method="get"
        action="/admin/leaves"
      >
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />
        {filters.type && <input type="hidden" name="type" value={filters.type} />}
        <div className="admin-leaves-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <label htmlFor="admin-leaves-q" className="sr-only">ค้นหาชื่อ / รหัสนักศึกษา</label>
          <input
            id="admin-leaves-q"
            name="q"
            type="search"
            className="input"
            placeholder="ค้นหาชื่อ / รหัสนักศึกษา…"
            value={q}
            maxLength={100}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="admin-leaves-shop">
          <label htmlFor="admin-leaves-shop" className="sr-only">รหัสร้าน</label>
          <input
            id="admin-leaves-shop"
            name="shopCode"
            type="text"
            className="input"
            placeholder="รหัสร้าน"
            value={shopCode}
            maxLength={40}
            onChange={(e) => setShopCode(e.target.value)}
          />
        </div>
        <div className="admin-leaves-pills" role="group" aria-label="กรองตามประเภท">
          {pills.map((p) => (
            <Link
              key={p.label}
              href={withParams({ ...navBase, q, shopCode }, { type: p.value })}
              className="admin-leaves-pill"
              aria-current={filters.type === p.value}
            >
              {p.label} {p.count}
            </Link>
          ))}
        </div>
      </form>

      {view === "student" ? (
        <section className="card admin-leaves-table-card" aria-label="รายการแยกตามนักศึกษา">
          {studentGroups.length === 0 ? <p className="muted px-6 py-6 text-sm">ไม่พบรายการลาตามเงื่อนไข</p> : (
            <>
              <div className="admin-leaves-table-scroll"><table className="tbl admin-leaves-student-table">
                <caption className="sr-only">รายการลาแยกตามนักศึกษาประจำเดือนนี้</caption>
                <thead><tr><th scope="col">นักศึกษา</th><th scope="col">วันนี้</th><th scope="col">วันหยุด / การลา</th><th scope="col">รวม</th></tr></thead>
                <tbody>{pageGroups.map((group) => {
                  const leavesToday = group.leaves.filter((leave) => leave.start <= todayISO && leave.end >= todayISO);
                  return <tr key={group.user.id}>
                    <td><span className="admin-leaves-user"><span className="admin-leaves-avatar" data-tone={toneOf(group.user.id)} aria-hidden="true">{(group.user.firstName || "?").charAt(0)}</span><span><span className="admin-leaves-username">{group.user.firstName} {group.user.lastName}</span>{group.user.shopCode && <span className="admin-leaves-shopchip">{group.user.shopCode}</span>}{group.user.studentId && <span className="admin-leaves-student-id">{group.user.studentId}</span>}</span></span></td>
                    <td>{leavesToday.length ? <span className="admin-leaves-today-types">{leavesToday.map((leave) => <span className="admin-leaves-type" data-type={leave.type} key={leave.id}>{TYPE_LABEL[leave.type]}วันนี้</span>)}</span> : <span className="muted">–</span>}</td>
                    <td><div className="admin-leaves-group-chips">{group.leaves.map((leave) => <span className="admin-leaves-group-entry" key={leave.id}><span className="admin-leaves-group-chip" data-type={leave.type}><strong>{TYPE_LABEL[leave.type]}</strong><span>{rangeLabel(leave.start, leave.end)} · {diffDays(leave.start, leave.end)} วัน</span></span>{leave.reason && <span className="admin-leaves-reason">{TYPE_LABEL[leave.type]}: {leave.reason}</span>}</span>)}</div></td>
                    <td className="admin-leaves-total-days">{group.totalDays} <span>วัน</span></td>
                  </tr>;
                })}</tbody>
              </table></div>
              <div className="admin-leaves-pagination"><span>{studentGroups.length} คน · หน้า {currentPage} / {pageCount}</span><div><button type="button" className="btn btn-outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>ก่อนหน้า</button><span className="admin-leaves-page-number">{currentPage}</span><button type="button" className="btn btn-outline" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>ถัดไป</button></div></div>
            </>
          )}
        </section>
      ) : view === "date" ? (
        <section className="admin-leaves-date-view" aria-label="รายการหยุดและลาตามวันที่">
          <p className="admin-leaves-date-caption">เรียงตามวันที่ · มีผู้หยุด/ลา {dateGroups.length} วัน</p>
          {dateGroups.length === 0 ? <div className="card"><p className="muted px-6 py-6 text-sm">ไม่พบรายการลาตามเงื่อนไข</p></div> : dateGroups.map(({ date, leaves }) => {
            const parsedDate = parseISO(date);
            const uniquePeople = new Set(leaves.map((leave) => leave.user.id)).size;
            const weekday = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "short" }).format(parsedDate);
            return <section className="card admin-leaves-date-card" key={date}>
              <div className={"admin-leaves-date-tile" + (date === todayISO ? " is-today" : "")}><strong>{dayNum.format(parsedDate)}</strong><span>{weekday}</span></div>
              <div className="admin-leaves-date-content"><p className="admin-leaves-date-heading">{weekday} {fullDate(date)} · {uniquePeople} คน</p><div className="admin-leaves-date-people">{leaves.map((leave) => <div className="admin-leaves-date-person" key={date + leave.id}><span className="admin-leaves-avatar" data-tone={toneOf(leave.user.id)} aria-hidden="true">{(leave.user.firstName || "?").charAt(0)}</span><strong>{leave.user.firstName} {leave.user.lastName}</strong>{leave.user.shopCode && <span className="admin-leaves-shopchip">{leave.user.shopCode}</span>}<span className="admin-leaves-type" data-type={leave.type}>{TYPE_LABEL[leave.type]}</span></div>)}</div></div>
            </section>;
          })}
        </section>
      ) : (
        <section aria-label="ไทม์ไลน์รายคน" className="card" style={{ overflow: "hidden" }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-5">
            <h2 className="m-0 text-[17px] font-semibold">ไทม์ไลน์รายคน</h2>
            <span className="text-[13px] muted">ดูว่าใครหยุด/ลาวันไหนในหน้าเดียว</span>
          </div>
          {timeline.length === 0 ? (
            <p className="muted px-6 py-6 text-sm">ไม่พบใบลาตามเงื่อนไข</p>
          ) : (
            <div className="admin-leaves-timeline-scroll">
              <table className="admin-leaves-timeline">
                <caption className="sr-only">ไทม์ไลน์การลาและวันหยุดรายคน</caption>
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">นักศึกษา</span></th>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const d = new Date(Date.UTC(year, month - 1, day));
                      const dow = d.getUTCDay();
                      return (
                        <th
                          key={day}
                          scope="col"
                          data-weekend={dow === 0 || dow === 6}
                          data-today={todayDay === day}
                          title={dow === 0 ? "อาทิตย์" : dow === 6 ? "เสาร์" : undefined}
                        >
                          {day}
                        </th>
                      );
                    })}
                    <th scope="col" className="admin-leaves-timeline-total">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((row) => (
                    <tr key={row.user.id}>
                      <th scope="row">
                        <span className="admin-leaves-user">
                          <span className="admin-leaves-avatar" data-tone={toneOf(row.user.id)} aria-hidden="true">
                            {(row.user.firstName || "?").charAt(0)}
                          </span>
                          <span>
                            <span className="admin-leaves-username" style={{ fontSize: 13 }}>
                              {row.user.firstName} {row.user.lastName}
                            </span>
                            {row.user.shopCode && (
                              <span className="admin-leaves-shopchip">{row.user.shopCode}</span>
                            )}
                          </span>
                        </span>
                      </th>
                      {row.days.map((t, i) => (
                        <td key={i}>
                          <span className="admin-leaves-dot" data-type={t ?? undefined} />
                        </td>
                      ))}
                      <td className="admin-leaves-timeline-total tabular-nums">
                        {row.totalDays} วัน
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-leaves-legend">
            <span><span className="admin-leaves-dot" data-type="SICK" /> ลาป่วย</span>
            <span><span className="admin-leaves-dot" data-type="PERSONAL" /> ลากิจ</span>
            <span><span className="admin-leaves-dot" data-type="HOLIDAY" /> วันหยุด</span>
            <span>แถบน้ำเงิน = วันนี้</span>
          </div>
        </section>
      )}

    </div>
  );
}
