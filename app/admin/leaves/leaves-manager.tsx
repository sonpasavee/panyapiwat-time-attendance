"use client";

import { useEffect, useMemo, useState } from "react";
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

type AdminLeaveApiRow = Omit<LeaveRow, "start" | "end"> & {
  startDate: string;
  endDate: string;
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
  view: "list" | "timeline";
  month: number;
  year: number;
  filters: { q: string; shopCode: string; type: "" | LeaveRow["type"] };
  linkBase: Record<string, string>;
  todayISO: string;
}) {
  const [q, setQ] = useState(filters.q);
  const [shopCode, setShopCode] = useState(filters.shopCode);
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [modalItems, setModalItems] = useState<LeaveRow[] | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

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
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

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

  // ---------- โมดัล ----------
  useEffect(() => {
    if (!modalUserId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalUserId(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalUserId]);

  async function openHistory(userId: string) {
    setModalUserId(userId);
    setModalItems(null);
    setModalError(null);
    try {
      const res = await fetch(
        `/api/admin/leaves?userId=${userId}&month=${month}&year=${year}`,
      );
      const body = (await res.json()) as {
        items?: AdminLeaveApiRow[];
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(body?.error?.message ?? "โหลดประวัติไม่สำเร็จ");
      if (!body.items) throw new Error("รูปแบบข้อมูลประวัติการลาไม่ถูกต้อง");
      setModalItems(
        body.items.map(({ startDate, endDate, ...item }) => ({
          ...item,
          start: startDate,
          end: endDate,
        })),
      );
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "โหลดประวัติไม่สำเร็จ");
    }
  }

  const modalUser = modalUserId
    ? (modalItems?.[0]?.user ?? visible.find((r) => r.user.id === modalUserId)?.user ?? null)
    : null;

  const modalStats = useMemo(() => {
    const s = {
      SICK: { count: 0, days: 0 },
      PERSONAL: { count: 0, days: 0 },
      HOLIDAY: { count: 0, days: 0 },
    } as Record<LeaveRow["type"], { count: number; days: number }>;
    for (const r of modalItems ?? []) {
      s[r.type].count += 1;
      s[r.type].days += diffDays(r.start, r.end);
    }
    return s;
  }, [modalItems]);

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
              href={withParams({ ...navBase }, { view: "list" })}
              aria-current={view === "list" ? "page" : undefined}
            >
              รายการ
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

      <div className="admin-leaves-stats">
        <section className="card admin-leaves-stat" aria-label="ทั้งหมดเดือนนี้">
          <span className="admin-leaves-stat-icon" style={{ background: "#eaf1ff", color: "#1d63d8" }} aria-hidden="true">
            <CalendarIcon />
          </span>
          <div>
            <p className="admin-leaves-stat-label">ทั้งหมดเดือนนี้</p>
            <p className="admin-leaves-stat-value">{counts.total} รายการ</p>
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
      </div>

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

      {view === "list" ? (
        <div className="card admin-leaves-table-card">
          {visible.length === 0 ? (
            <p className="muted px-6 py-6 text-sm">ไม่พบใบลาตามเงื่อนไข</p>
          ) : (
            <div className="admin-leaves-table-scroll">
              <table className="tbl">
                <caption className="sr-only">ใบลาและวันหยุดเดือนนี้</caption>
                <thead>
                  <tr>
                    <th scope="col">นักศึกษา</th>
                    <th scope="col">ประเภท</th>
                    <th scope="col">วันที่</th>
                    <th scope="col">เหตุผล</th>
                    <th scope="col">บันทึกเมื่อ</th>
                    <th scope="col"><span className="sr-only">ประวัติ</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="admin-leaves-user">
                          <span className="admin-leaves-avatar" data-tone={toneOf(r.user.id)} aria-hidden="true">
                            {(r.user.firstName || "?").charAt(0)}
                          </span>
                          <span>
                            <span className="admin-leaves-username">
                              {r.user.firstName} {r.user.lastName}
                            </span>
                            {r.user.shopCode && (
                              <span className="admin-leaves-shopchip">{r.user.shopCode}</span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="admin-leaves-type" data-type={r.type}>
                          {TYPE_LABEL[r.type]}
                        </span>
                      </td>
                      <td>
                        <span className="admin-leaves-date">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5b6b82" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 6 }}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                          {rangeLabel(r.start, r.end)}
                          <span className="admin-leaves-daypill">
                            {diffDays(r.start, r.end)} วัน
                          </span>
                        </span>
                      </td>
                      <td>{r.reason || "–"}</td>
                      <td className="tabular-nums">{createdLabel(r.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-leaves-link"
                          onClick={() => openHistory(r.user.id)}
                        >
                          ดูประวัติ ›
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

      {modalUserId && (
        <div
          className="admin-leaves-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalUserId(null);
          }}
        >
          <div
            className="admin-leaves-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-leaves-modal-title"
          >
            <div className="admin-leaves-modal-body">
              <div className="admin-leaves-modal-head">
                <h2 id="admin-leaves-modal-title" className="admin-leaves-modal-title">
                  ประวัติการลาและวันหยุด
                </h2>
                <button
                  type="button"
                  aria-label="ปิด"
                  onClick={() => setModalUserId(null)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    border: 0,
                    borderRadius: 12,
                    background: "transparent",
                    color: "#5b6b82",
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              {modalUser && (
                <div className="admin-leaves-modal-user">
                  <span className="admin-leaves-avatar" data-tone={toneOf(modalUser.id)} aria-hidden="true">
                    {(modalUser.firstName || "?").charAt(0)}
                  </span>
                  <div>
                    <p className="m-0 text-[16px] font-bold">
                      {modalUser.firstName} {modalUser.lastName}
                    </p>
                    <p className="muted m-0 text-[13px]">
                      {modalUser.shopCode ?? "–"}
                      {modalUser.studentId ? ` · ${modalUser.studentId}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {modalError ? (
                <p role="alert" className="leaves-alert" style={{ marginTop: 16, padding: "10px 14px", borderRadius: 12, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
                  {modalError}
                </p>
              ) : !modalItems ? (
                <p className="muted py-6 text-center text-sm">กำลังโหลด…</p>
              ) : (
                <>
                  <div className="admin-leaves-summary-grid">
                    <div className="admin-leaves-summary-box" style={{ background: "#ffe4e6", color: "#881337" }}>
                      ลาป่วย
                      <strong>{modalStats.SICK.count} ครั้ง · {modalStats.SICK.days} วัน</strong>
                    </div>
                    <div className="admin-leaves-summary-box" style={{ background: "#e6e6fa", color: "#3b3480" }}>
                      ลากิจ
                      <strong>{modalStats.PERSONAL.count} ครั้ง · {modalStats.PERSONAL.days} วัน</strong>
                    </div>
                    <div className="admin-leaves-summary-box" style={{ background: "#dbeafe", color: "#1e3a8a" }}>
                      วันหยุด
                      <strong>{modalStats.HOLIDAY.count} รายการ · {modalStats.HOLIDAY.days} วัน</strong>
                    </div>
                  </div>

                  {modalItems.length === 0 ? (
                    <p className="muted py-6 text-center text-sm">เดือนนี้ยังไม่มีประวัติ</p>
                  ) : (
                    <ul className="m-0 mt-2 list-none p-0">
                      {modalItems.map((r) => (
                        <li key={r.id} className="admin-leaves-entry">
                          <span
                            className="admin-leaves-entry-icon"
                            style={
                              r.type === "SICK"
                                ? { background: "#ffe4e6", color: "#be123c" }
                                : r.type === "PERSONAL"
                                  ? { background: "#e6e6fa", color: "#3b3480" }
                                  : { background: "#dbeafe", color: "#1e3a8a" }
                            }
                            aria-hidden="true"
                          >
                            {r.type === "SICK" ? <HeartIcon /> : r.type === "PERSONAL" ? <BagIcon /> : <CalendarIcon />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-bold">
                              {TYPE_LABEL[r.type]}
                              <span className="admin-leaves-daypill">
                                {diffDays(r.start, r.end)} วัน
                              </span>
                            </span>
                            <span className="muted mt-1 block text-[13px]">
                              {r.start === r.end
                                ? fullDate(r.start)
                                : `${rangeLabel(r.start, r.end)} ${yearFmt.format(parseISO(r.end))}`}
                              {r.reason ? ` · ${r.reason}` : " · –"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            <div className="admin-leaves-modal-foot">
              <button type="button" className="btn btn-outline" onClick={() => setModalUserId(null)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
