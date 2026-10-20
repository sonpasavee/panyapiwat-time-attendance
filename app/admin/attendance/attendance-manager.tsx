"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import { formatSpent } from "@/lib/format";
import {
  amountToCents,
  centsToAmount,
  summarizeDailyMoney,
  type DailyMoneySummary,
} from "@/services/money-tracker.logic";

import ExportCsvButton from "../../components/export-csv-button";

export type AttendanceRow = {
  id: string;
  workDateISO: string;
  checkInAt: string;
  checkOutAt: string | null;
  workMinutes: number | null;
  checkInPhotoUrl: string | null;
  checkOutPhotoUrl: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    shopCode: string | null;
  };
};

type StatusFilter = "" | "complete" | "working" | "missed";

type DetailMoney = { moneyType: "CASH" | "TRUEMONEY"; direction: "IN" | "OUT"; amount: string };

type DetailAttendance = {
  id: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  workMinutes: number | null;
  checkInPhotoUrl: string | null;
  checkOutPhotoUrl: string | null;
  money: DetailMoney[];
  user: AttendanceRow["user"];
};

const TONES = ["blue", "green", "yellow", "pink", "lavender"] as const;

function toneOf(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % 997;
  return TONES[hash % TONES.length];
}

const timeFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
});
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
const weekdayLong = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "long",
});

function fmtTime(iso: string | null) {
  if (!iso) return "–";
  return timeFmt.format(new Date(iso));
}

function fmtDayMonth(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return `${dayNum.format(d)} ${monthShort.format(d)}`;
}

function fmtFullDate(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return `${dayNum.format(d)} ${monthShort.format(d)} ${yearFmt.format(d)}`;
}

const IMAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function imageExpired(at: string | null) {
  return !!at && Date.now() - new Date(at).getTime() >= IMAGE_RETENTION_MS;
}

function ExpiredPhoto() {
  return (
    <span className="att-photo att-photo-expired" role="img" aria-label="รูปหมดอายุแล้ว">
      <CameraIcon />
      <span>รูปหมดอายุแล้ว</span>
    </span>
  );
}

function fmtWeekday(isoDate: string) {
  return weekdayLong.format(new Date(`${isoDate}T00:00:00Z`)).replace(/^วัน/, "");
}

function fmtHours(minutes: number | null) {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} ชม. ${m} น.`;
}

function withParams(base: Record<string, string>, extra: Record<string, string>) {
  const params = new URLSearchParams({ ...base, ...extra });
  for (const [k, v] of Object.entries(extra)) {
    if (v === "") params.delete(k);
  }
  return `/admin/attendance?${params.toString()}`;
}

function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.6" /></svg>
  );
}

type RowStatus = "complete" | "working" | "missed";

function rowStatus(row: AttendanceRow, todayISO: string): RowStatus {
  if (row.checkOutAt) return "complete";
  return row.workDateISO === todayISO ? "working" : row.workDateISO < todayISO ? "missed" : "working";
}

const STATUS_LABEL: Record<RowStatus, string> = {
  complete: "ครบ",
  working: "กำลังทำงาน",
  missed: "ไม่ได้เช็กเอาท์",
};

export default function AttendanceManager({
  rows,
  todayISO,
  month,
  year,
  monthLabel,
  linkBase,
  filters,
  shopCodes,
  stats,
  status,
  csvRows,
  csvFilename,
  pager,
}: {
  rows: AttendanceRow[];
  todayISO: string;
  month: number;
  year: number;
  monthLabel: string;
  linkBase: Record<string, string>;
  filters: { q: string; shopCode: string; date: string; sort: "asc" | "desc" };
  shopCodes: string[];
  stats: { total: number; complete: number; working: number; missed: number };
  status: StatusFilter;
  csvRows: string[][];
  csvFilename: string;
  pager: ReactNode;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailAttendance | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  function openDetail(id: string) {
    setDetail(null);
    setDetailError(null);
    setDetailId(id);
  }

  function closeDetail() {
    setDetailId(null);
    setDetail(null);
    setDetailError(null);
  }

  const groups = useMemo(() => {
    const map = new Map<string, AttendanceRow[]>();
    for (const r of rows) {
      const list = map.get(r.workDateISO) ?? [];
      list.push(r);
      map.set(r.workDateISO, list);
    }
    return [...map.entries()];
  }, [rows]);

  const prev = useMemo(() => {
    const d = new Date(Date.UTC(year, month - 2, 1));
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  }, [year, month]);
  const next = useMemo(() => {
    const d = new Date(Date.UTC(year, month, 1));
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  }, [year, month]);

  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailId(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [detailId]);

  useEffect(() => {
    if (!detailId) return;
    let cancelled = false;
    fetch(`/api/admin/attendance/${detailId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "โหลดรายละเอียดไม่สำเร็จ");
        if (!cancelled) setDetail(body.attendance as DetailAttendance);
      })
      .catch((err: unknown) => {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : "โหลดรายละเอียดไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const detailMoney = detail ? summarizeDailyMoney(detail.money) : null;
  const detailStatus: RowStatus | null = detail
    ? detail.checkOutAt
      ? "complete"
      : "working"
    : null;

  const statCards: Array<{
    key: StatusFilter;
    label: string;
    value: string;
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
  }> = [
    {
      key: "",
      label: "ทั้งหมด",
      value: String(stats.total),
      icon: <CalendarIcon />,
      iconBg: "#eaf1ff",
      iconColor: "#1d63d8",
    },
    {
      key: "complete",
      label: "ครบ",
      value: String(stats.complete),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      ),
      iconBg: "#dcfce7",
      iconColor: "#15803d",
    },
    {
      key: "working",
      label: "กำลังทำงาน",
      value: String(stats.working),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      ),
      iconBg: "#eaf1ff",
      iconColor: "#1d63d8",
    },
    {
      key: "missed",
      label: "ไม่ได้เช็กเอาท์",
      value: String(stats.missed),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
      ),
      iconBg: "#fef3c7",
      iconColor: "#92400e",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="att-head">
        <div>
          <h1>การลงเวลา</h1>
          <p>รายการลงเวลาเข้า–ออกงานของนักศึกษา · แตะแถวเพื่อดูรูปและรายละเอียด</p>
        </div>
        <div className="att-head-actions">
          <nav aria-label="เปลี่ยนเดือน" className="att-monthnav">
            <Link
              href={withParams(linkBase, { month: String(prev.month), year: String(prev.year) })}
              aria-label="เดือนก่อนหน้า"
            >
              ‹
            </Link>
            <span>{monthLabel}</span>
            <Link
              href={withParams(linkBase, { month: String(next.month), year: String(next.year) })}
              aria-label="เดือนถัดไป"
            >
              ›
            </Link>
          </nav>
          <ExportCsvButton
            filename={csvFilename}
            headers={["ชื่อ", "รหัส", "ร้าน", "วันที่", "เช็กอิน", "เช็กเอาท์", "ชั่วโมงทำงาน", "สถานะ"]}
            rows={csvRows}
          />
        </div>
      </div>

      <div className="att-stats">
        {statCards.map((s) => (
          <Link
            key={s.key}
            href={withParams(linkBase, { status: s.key })}
            className="att-stat"
            aria-current={status === s.key}
            aria-label={`กรองสถานะ${s.label} ${s.value} รายการ`}
          >
            <span className="att-stat-icon" style={{ background: s.iconBg, color: s.iconColor }} aria-hidden="true">
              {s.icon}
            </span>
            <span>
              <span className="att-stat-label">{s.label}</span>
              <span className="att-stat-value block">{s.value}</span>
            </span>
          </Link>
        ))}
      </div>

      <form className="card att-filter" role="search" method="get" action="/admin/attendance">
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />
        {status && <input type="hidden" name="status" value={status} />}
        <div className="att-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <label htmlFor="att-q" className="sr-only">ค้นหาชื่อ / รหัสนักศึกษา</label>
          <input
            id="att-q"
            name="q"
            type="search"
            className="input"
            placeholder="ค้นหาชื่อ / รหัสนักศึกษา…"
            defaultValue={filters.q}
            maxLength={100}
          />
        </div>
        <div className="att-shop">
          <label htmlFor="att-shop" className="sr-only">รหัสร้าน</label>
          <select
            id="att-shop"
            name="shopCode"
            className="input"
            defaultValue={filters.shopCode}
          >
            <option value="">รหัสร้าน (ทั้งหมด)</option>
            {shopCodes.map((shopCode) => (
              <option key={shopCode} value={shopCode}>{shopCode}</option>
            ))}
          </select>
        </div>
        <div className="att-field">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" />
          </svg>
          <label htmlFor="att-date" className="sr-only">วันที่ (เจาะจง)</label>
          <input
            id="att-date"
            name="date"
            type="date"
            className="input"
            defaultValue={filters.date}
          />
        </div>
        <div className="att-sort">
          <label htmlFor="att-sort" className="sr-only">เรียงลำดับ</label>
          <select
            id="att-sort"
            name="sort"
            className="input"
            defaultValue={filters.sort}
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (form) form.requestSubmit();
            }}
          >
            <option value="desc">ใหม่ → เก่า</option>
            <option value="asc">เก่า → ใหม่</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary att-submit">
          ค้นหา
        </button>
      </form>

      <div className="card att-table-card">
        {groups.length === 0 ? (
          <p className="muted px-6 py-6 text-sm">ไม่พบข้อมูลตามเงื่อนไข</p>
        ) : (
          <div className="att-table-scroll">
            <table className="tbl">
              <caption className="sr-only">รายการลงเวลา</caption>
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
              {groups.map(([dateISO, list]) => (
                <tbody key={dateISO}>
                  <tr className="att-group">
                    <td colSpan={6}>
                      {dateISO === todayISO ? "วันนี้ · " : ""}
                      {fmtWeekday(dateISO)} {fmtFullDate(dateISO)} · {list.length} รายการ
                    </td>
                  </tr>
                  {list.map((r) => {
                    const st = rowStatus(r, todayISO);
                    const hours = fmtHours(r.workMinutes);
                    return (
                      <tr key={r.id}>
                        <td>
                          <span className="att-user">
                            <button
                              type="button"
                              onClick={() => openDetail(r.id)}
                              aria-label={`ดูรายละเอียดของ ${r.user.firstName} ${r.user.lastName}`}
                            >
                              <span className="att-avatar" data-tone={toneOf(r.user.id)} aria-hidden="true">
                                {(r.user.firstName || "?").charAt(0)}
                              </span>
                              <span>
                                <span className="att-username">
                                  {r.user.firstName} {r.user.lastName}
                                </span>
                                <span className="att-userid">{r.user.studentId ?? "–"}</span>
                              </span>
                            </button>
                          </span>
                        </td>
                        <td>
                          {r.user.shopCode ? (
                            <span className="att-shop-chip">{r.user.shopCode}</span>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td>
                          <span className="att-time">
                            {r.checkInPhotoUrl && !imageExpired(r.checkInAt) ? <a
                              className="att-photo-link"
                              href={r.checkInPhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`ดูรูปเช็กอินของ ${r.user.firstName}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CameraIcon />
                            </a> : <ExpiredPhoto />}
                            {fmtTime(r.checkInAt)}
                          </span>
                        </td>
                        <td>
                          {r.checkOutAt ? (
                            <span className="att-time">
                              {r.checkOutPhotoUrl && !imageExpired(r.checkOutAt) ? (
                                <a
                                  className="att-photo-link"
                                  href={r.checkOutPhotoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`ดูรูปเช็กเอาท์ของ ${r.user.firstName}`}
                                >
                                  <CameraIcon />
                                </a>
                              ) : imageExpired(r.checkOutAt) ? <ExpiredPhoto /> : null}
                              {fmtTime(r.checkOutAt)}
                            </span>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className="font-semibold">
                          {hours ?? (st === "working" ? "กำลังนับเวลา…" : "–")}
                        </td>
                        <td>
                          <span className="att-status" data-status={st}>
                            {STATUS_LABEL[st]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        )}
        {pager}
      </div>

      {detailId && (
        <div
          className="att-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div
            className="att-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="att-modal-title"
          >
            <div className="att-modal-body">
              <div className="att-modal-head">
                <h2 id="att-modal-title" className="att-modal-title">
                  รายละเอียดการลงเวลา
                </h2>
                <button
                  type="button"
                  aria-label="ปิด"
                  onClick={() => closeDetail()}
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

              {detailError ? (
                <p role="alert" style={{ margin: "16px 0 0", padding: "10px 14px", borderRadius: 12, background: "#fef2f2", color: "#991b1b", fontSize: 13 }}>
                  {detailError}
                </p>
              ) : !detail || !detailMoney || !detailStatus ? (
                <p className="muted py-6 text-center text-sm">กำลังโหลด…</p>
              ) : (
                <>
                  <div className="att-modal-user">
                    <span className="att-avatar" data-tone={toneOf(detail.user.id)} aria-hidden="true">
                      {(detail.user.firstName || "?").charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold">
                        {detail.user.firstName} {detail.user.lastName}
                      </span>
                      <span className="att-modal-meta block">
                        {detail.user.studentId ?? "–"}
                        {detail.user.shopCode ? ` · ${detail.user.shopCode}` : ""} ·{" "}
                        {fmtDayMonth(detail.workDate.slice(0, 10))} {yearFmt.format(new Date(detail.workDate))}
                      </span>
                    </span>
                    <span className="att-status" data-status={detailStatus}>
                      {STATUS_LABEL[detailStatus]}
                    </span>
                  </div>

                  <div className="att-check-grid">
                    <div>
                      <span className="att-check-label">
                        เช็กอิน <span className="att-check-time">{fmtTime(detail.checkInAt)}</span>
                      </span>
                      {detail.checkInPhotoUrl && !imageExpired(detail.checkInAt) ? <a
                        className="att-photo"
                        href={detail.checkInPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="ดูรูปเช็กอินขนาดใหญ่"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={detail.checkInPhotoUrl} alt="รูปเช็กอิน" />
                      </a> : <ExpiredPhoto />}
                    </div>
                    <div>
                      <span className="att-check-label">
                        เช็กเอาท์{" "}
                        <span className="att-check-time">
                          {detail.checkOutAt ? fmtTime(detail.checkOutAt) : "–"}
                        </span>
                      </span>
                      {detail.checkOutPhotoUrl && !imageExpired(detail.checkOutAt) ? (
                        <a
                          className="att-photo"
                          href={detail.checkOutPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="ดูรูปเช็กเอาท์ขนาดใหญ่"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={detail.checkOutPhotoUrl} alt="รูปเช็กเอาท์" />
                        </a>
                      ) : imageExpired(detail.checkOutAt) ? <ExpiredPhoto /> : (
                        <span className="att-photo att-photo-empty" style={{ borderStyle: "dashed" }}>
                          <CameraIcon />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="att-workbox">
                    <span>เวลาทำงาน</span>
                    <strong>{fmtHours(detail.workMinutes) ?? (detailStatus === "working" ? "กำลังนับเวลา…" : "–")}</strong>
                  </div>

                  <h3 className="m-0 mt-4 text-[15px] font-semibold">เงินส่วนตัววันนี้</h3>
                  <MoneyBoxes money={detailMoney} />
                </>
              )}
            </div>
            <div className="att-modal-foot">
              <button type="button" className="btn btn-outline" onClick={() => closeDetail()}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MoneyBoxes({ money }: { money: DailyMoneySummary }) {
  const inTotal = centsToAmount(
    amountToCents(money.CASH.in) + amountToCents(money.TRUEMONEY.in),
  );
  const outTotal = centsToAmount(
    amountToCents(money.CASH.out) + amountToCents(money.TRUEMONEY.out),
  );
  const hasOut = money.CASH.out !== "0.00" || money.TRUEMONEY.out !== "0.00";
  const spent = formatSpent(money.totalSpent);
  const sub = (value: string, isSpent: boolean) =>
    isSpent ? formatSpent(value).text : `฿${value}`;
  const boxes = [
    {
      label: "เอาเข้า",
      main: `฿${inTotal}`,
      mainColor: undefined as string | undefined,
      sub: `สด ฿${money.CASH.in} · ทรู ฿${money.TRUEMONEY.in}`,
    },
    {
      label: "คงเหลือ",
      main: hasOut ? `฿${outTotal}` : "–",
      mainColor: undefined as string | undefined,
      sub: `สด ฿${money.CASH.out} · ทรู ฿${money.TRUEMONEY.out}`,
    },
    {
      label: "ใช้ไป",
      main: money.complete ? spent.text : "–",
      mainColor: spent.isGain ? "#16a34a" : "#1750b8",
      sub: `สด ${sub(money.CASH.spent, true)} · ทรู ${sub(money.TRUEMONEY.spent, true)}`,
    },
  ];
  return (
    <div className="att-money-grid">
      {boxes.map((box) => (
        <div key={box.label} className="att-money-box">
          {box.label}
          <strong style={box.mainColor ? { color: box.mainColor } : undefined}>
            {box.main}
          </strong>
          <small className="muted">{box.sub}</small>
        </div>
      ))}
    </div>
  );
}

// ไอคอนปฏิทินสำหรับ stat card (นิยามท้ายไฟล์กันชนชื่อ)
function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  );
}
