"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addDaysISO,
  diffDaysInclusive,
  groupConsecutive,
  monthLabel,
  rangeLabel,
  rangeSub,
  shortDate,
  toISO,
} from "./leave-dates";

export type HolidayItem = {
  id: string;
  start: string;
  end: string;
};

function readError(response: Response, fallback: string) {
  return response
    .json()
    .then((body) => body?.error?.message ?? fallback)
    .catch(() => fallback);
}

function ChevronLeft() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 6l6 6-6 6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function HolidayManager({
  holidays,
  todayISO,
  totalDays,
  nextLabel,
}: {
  holidays: HolidayItem[];
  todayISO: string;
  totalDays: number;
  nextLabel: string | null;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [viewY, setViewY] = useState(Number(todayISO.slice(0, 4)));
  const [viewM, setViewM] = useState(Number(todayISO.slice(5, 7)));
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // วันที่บันทึกไปแล้ว (แตะไม่ได้ ป้องกันช่วงซ้อนกัน)
  const savedSet = useMemo(() => {
    const set = new Set<string>();
    for (const h of holidays) {
      for (let d = 0; d < diffDaysInclusive(h.start, h.end); d += 1) {
        set.add(addDaysISO(h.start, d));
      }
    }
    return set;
  }, [holidays]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(viewY, viewM - 1 + delta, 1));
    setViewY(d.getUTCFullYear());
    setViewM(d.getUTCMonth() + 1);
  }

  const cells = useMemo(() => {
    const firstDow = new Date(Date.UTC(viewY, viewM - 1, 1)).getUTCDay();
    const dim = new Date(Date.UTC(viewY, viewM, 0)).getUTCDate();
    const list: Array<string | null> = Array(firstDow).fill(null);
    for (let day = 1; day <= dim; day += 1) {
      list.push(toISO(new Date(Date.UTC(viewY, viewM - 1, day))));
    }
    return list;
  }, [viewY, viewM]);

  function toggleDate(iso: string) {
    setSelected((current) => {
      const next = current.includes(iso)
        ? current.filter((d) => d !== iso)
        : [...current, iso];
      return next.sort();
    });
  }

  function selectWeekends() {
    setSelected((current) => {
      const next = new Set(current);
      for (const cell of cells) {
        if (!cell || savedSet.has(cell)) continue;
        const dow = new Date(`${cell}T00:00:00Z`).getUTCDay();
        if (dow === 0 || dow === 6) next.add(cell);
      }
      return [...next].sort();
    });
  }

  async function saveHolidays() {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const groups = groupConsecutive([...selected].sort());
      for (const group of groups) {
        const response = await fetch("/api/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaveType: "HOLIDAY",
            startDate: group[0],
            endDate: group[group.length - 1],
          }),
        });
        if (!response.ok)
          throw new Error(await readError(response, "บันทึกวันหยุดไม่สำเร็จ"));
      }
      const labels = groupConsecutive([...selected].sort())
        .map((g) => rangeLabel(g[0], g[g.length - 1]))
        .join(" · ");
      setSuccess(
        `วันหยุด ${selected.length} วัน (${labels}) · ไม่ต้องรออนุมัติ`,
      );
      setSelected([]);
      setPicking(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกวันหยุดไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function cancelHoliday(id: string) {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/leaves/me/${id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error(await readError(response, "ยกเลิกวันหยุดไม่สำเร็จ"));
      setCancellingId(null);
      setSuccess(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยกเลิกวันหยุดไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  const sortedSelected = useMemo(() => [...selected].sort(), [selected]);

  if (picking) {
    return (
      <div className="flex flex-col gap-5">
        <header>
          <h1 className="m-0 text-[28px] font-bold leading-snug">
            เลือกวันหยุด
          </h1>
          <p className="mt-0.5 text-[15px] muted">
            แตะวันที่ในปฏิทินเพื่อเลือก แตะซ้ำเพื่อยกเลิก
          </p>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="cal-h" className="card card-pad">
            <div className="leaves-cal-head">
              <button
                type="button"
                className="leaves-cal-nav"
                aria-label="เดือนก่อนหน้า"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft />
              </button>
              <h2 id="cal-h" className="leaves-cal-title">
                {monthLabel(viewY, viewM)}
              </h2>
              <button
                type="button"
                className="leaves-cal-nav"
                aria-label="เดือนถัดไป"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight />
              </button>
            </div>

            <div
              className="leaves-cal-grid"
              role="grid"
              aria-label={`ปฏิทิน ${monthLabel(viewY, viewM)}`}
            >
              {DOW.map((name, i) => (
                <span
                  key={name}
                  className="leaves-cal-dow"
                  data-weekend={i === 0 || i === 6}
                >
                  {name}
                </span>
              ))}
              {cells.map((iso, i) =>
                iso === null ? (
                  <span key={`blank-${i}`} />
                ) : (
                  <button
                    key={iso}
                    type="button"
                    className="leaves-cal-day"
                    data-selected={selectedSet.has(iso)}
                    data-today={iso === todayISO}
                    disabled={savedSet.has(iso)}
                    title={savedSet.has(iso) ? "บันทึกวันหยุดแล้ว" : undefined}
                    aria-pressed={selectedSet.has(iso)}
                    aria-label={`${Number(iso.slice(8, 10))} ${monthLabel(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)))}`}
                    onClick={() => toggleDate(iso)}
                  >
                    {Number(iso.slice(8, 10))}
                  </button>
                ),
              )}
            </div>

            <div className="leaves-cal-legend">
              <span>
                <span
                  className="leaves-dot"
                  style={{ background: "#1d63d8" }}
                />
                วันที่เลือก
              </span>
              <span>
                <span
                  className="leaves-dot"
                  style={{
                    background: "#fff8e6",
                    border: "2px dashed #eab308",
                  }}
                />
                วันนี้
              </span>
            </div>
          </section>

          <section aria-labelledby="picked-h" className="card card-pad">
            <div className="flex items-center justify-between gap-2">
              <h2 id="picked-h" className="m-0 text-[17px] font-semibold">
                วันที่เลือก
              </h2>
              <span className="leaves-count-pill">{selected.length} วัน</span>
            </div>

            {selected.length > 0 && (
              <p className="m-0 mt-3 text-[15px] font-bold">
                {rangeLabel(
                  sortedSelected[0],
                  sortedSelected[sortedSelected.length - 1],
                )}
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2">
              {sortedSelected.map((iso) => (
                <span key={iso} className="leaves-chip">
                  {shortDate(iso, true)}
                  <button
                    type="button"
                    aria-label={`ลบวันที่ ${shortDate(iso, true)}`}
                    onClick={() => toggleDate(iso)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn btn-outline flex-1"
                onClick={selectWeekends}
              >
                ทุกเสาร์-อาทิตย์
              </button>
              <button
                type="button"
                className="leaves-btn-danger-outline flex-1"
                onClick={() => setSelected([])}
              >
                ล้างทั้งหมด
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary mt-3 w-full min-h-[52px] text-[16px]"
              disabled={selected.length === 0 || saving}
              onClick={saveHolidays}
            >
              {saving
                ? "กำลังบันทึก…"
                : `บันทึกวันหยุด (${selected.length} วัน)`}
            </button>

            {error && (
              <p role="alert" className="leaves-alert mt-3">
                {error}
              </p>
            )}

            <p className="muted mt-3 rounded-xl bg-[#f8fafd] p-3.5 text-[13px] leading-relaxed">
              วันหยุดไม่ต้องรออนุมัติ · ต้องการลา
              <br />
              ป่วยหรือลากิจ? ไปที่เมนู การลา ›
            </p>

            <button
              type="button"
              className="btn btn-soft mt-2 w-full"
              onClick={() => {
                setPicking(false);
                setSelected([]);
                setError(null);
              }}
            >
              กลับไปรายการวันหยุด
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">
            เลือกวันหยุด
          </h1>
          <p className="mt-0.5 text-[15px] muted">วันหยุดที่คุณเลือกไว้</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setSuccess(null);
            setError(null);
            setPicking(true);
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
            +
          </span>
          เลือกวันหยุดเพิ่ม
        </button>
      </header>

      {success && (
        <div className="leaves-success" role="status">
          <span className="leaves-success-icon" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <span>
            <span className="leaves-success-title">
              บันทึกวันหยุดเรียบร้อยแล้ว
            </span>
            <span className="leaves-success-sub block">{success}</span>
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="leaves-alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card flex items-center gap-3.5 p-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl"
            style={{ background: "#eaf1ff", color: "#1d63d8" }}
          >
            <CalendarIcon />
          </span>
          <span>
            <span className="muted block text-[13px]">วันหยุดที่เลือกไว้</span>
            <span className="block text-[22px] font-bold leading-snug">
              {totalDays} วัน
            </span>
          </span>
        </div>
        <div className="card flex items-center gap-3.5 p-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl"
            style={{ background: "#dcfce7", color: "#15803d" }}
          >
            <ClockIcon />
          </span>
          <span>
            <span className="muted block text-[13px]">วันหยุดถัดไป</span>
            <span className="block text-[22px] font-bold leading-snug">
              {nextLabel ?? "–"}
            </span>
          </span>
        </div>
      </div>

      <section aria-label="รายการวันหยุด" className="card card-pad">
        <h2 className="m-0 text-[17px] font-semibold">รายการวันหยุด</h2>
        {holidays.length === 0 ? (
          <p className="muted py-6 text-center text-sm">
            ยังไม่มีวันหยุดที่เลือกไว้ กด “เลือกวันหยุดเพิ่ม” เพื่อเริ่ม
          </p>
        ) : (
          <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
            {holidays.map((h) => (
              <li key={h.id} className="leaves-holiday-row">
                <span className="leaves-holiday-icon" aria-hidden="true">
                  <CalendarIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">
                    {rangeLabel(h.start, h.end)}
                  </span>
                  <span className="muted mt-0.5 block text-[13px]">
                    {rangeSub(h.start, h.end)}
                  </span>
                </span>
                {cancellingId === h.id ? (
                  <span className="flex w-full flex-col gap-2 min-[480px]:w-auto min-[480px]:flex-row">
                    <button
                      type="button"
                      className="btn btn-outline min-h-[44px] w-full min-[480px]:w-auto"
                      disabled={deleting}
                      onClick={() => setCancellingId(null)}
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      className="leaves-btn-danger-outline w-full min-[480px]:w-auto"
                      disabled={deleting}
                      onClick={() => cancelHoliday(h.id)}
                    >
                      {deleting ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="leaves-btn-danger-outline w-full min-[480px]:w-auto"
                    onClick={() => setCancellingId(h.id)}
                  >
                    ยกเลิกวันหยุด
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
