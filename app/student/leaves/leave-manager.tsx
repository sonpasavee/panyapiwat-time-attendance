"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { diffDaysInclusive, rangeLabel, shortDate } from "./leave-dates";

export type LeaveItem = {
  id: string;
  type: "SICK" | "PERSONAL";
  start: string;
  end: string;
  reason: string | null;
};

export type LeaveStats = {
  sick: { count: number; days: number };
  personal: { count: number; days: number };
};

const TYPE_META = {
  SICK: {
    label: "ลาป่วย",
    cardBg: "#ffe4e6",
    cardColor: "#be123c",
    pillBg: "#ffe4e6",
    pillColor: "#881337",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" />
      </svg>
    ),
  },
  PERSONAL: {
    label: "ลากิจ",
    cardBg: "#fef3c7",
    cardColor: "#92400e",
    pillBg: "#fef3c7",
    pillColor: "#78350f",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
} as const;

const REASON_CHIPS = ["ไม่สบาย", "ไปพบแพทย์", "ธุระครอบครัว", "อื่นๆ"];

function readError(response: Response, fallback: string) {
  return response
    .json()
    .then((body) => body?.error?.message ?? fallback)
    .catch(() => fallback);
}

export default function LeaveManager({
  leaves,
  stats,
}: {
  leaves: LeaveItem[];
  stats: LeaveStats;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(leaves.length === 0);
  const [leaveType, setLeaveType] = useState<"SICK" | "PERSONAL">("SICK");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rangeValid = start !== "" && end !== "" && end >= start;
  const dayCount = rangeValid ? diffDaysInclusive(start, end) : 0;

  async function submitLeave() {
    if (saving) return;
    if (!start || !end) {
      setError("กรุณาเลือกตั้งแต่วันที่และถึงวันที่");
      return;
    }
    if (end < start) {
      setError("ถึงวันที่ต้องไม่ก่อนตั้งแต่วันที่");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          startDate: start,
          endDate: end,
          reason: reason.trim() || undefined,
        }),
      });
      if (!response.ok)
        throw new Error(await readError(response, "บันทึกใบลาไม่สำเร็จ"));
      const days = diffDaysInclusive(start, end);
      setSuccess(
        `${TYPE_META[leaveType].label} ${rangeLabel(start, end)} (${days} วัน) · ไม่ต้องรออนุมัติ`,
      );
      setShowForm(false);
      setStart("");
      setEnd("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกใบลาไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">การลา</h1>
          <p className="mt-0.5 text-[15px] muted">
            แจ้งลาป่วยและลากิจ (ไม่ต้องรออนุมัติ)
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSuccess(null);
              setError(null);
              setShowForm(true);
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
              +
            </span>
            แจ้งลาใหม่
          </button>
        )}
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
              บันทึกใบลาเรียบร้อยแล้ว
            </span>
            <span className="leaves-success-sub block">{success}</span>
          </span>
        </div>
      )}

      {showForm ? (
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] xl:gap-6">
          <section aria-labelledby="form-h" className="card card-pad min-w-0">
            <h2 id="form-h" className="m-0 text-[19px] font-semibold">
              แจ้งลา
            </h2>

            <div className="mt-4 flex flex-col gap-1.5">
              <span id="leave-type-label" className="field-label">
                ประเภทการลา
              </span>
              <div
                className="leaves-type-grid"
                role="group"
                aria-labelledby="leave-type-label"
              >
                <button
                  type="button"
                  className="leaves-type-card"
                  aria-pressed={leaveType === "SICK"}
                  onClick={() => setLeaveType("SICK")}
                >
                  <span
                    className="leaves-type-icon"
                    style={{ background: "#ffe4e6", color: "#be123c" }}
                  >
                    {TYPE_META.SICK.icon}
                  </span>
                  <span>
                    <span className="leaves-type-name">ลาป่วย</span>
                    <span className="leaves-type-sub">ไม่สบาย เป็นไข้หวัด</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="leaves-type-card"
                  aria-pressed={leaveType === "PERSONAL"}
                  onClick={() => setLeaveType("PERSONAL")}
                >
                  <span
                    className="leaves-type-icon"
                    style={{ background: "#fef3c7", color: "#92400e" }}
                  >
                    {TYPE_META.PERSONAL.icon}
                  </span>
                  <span>
                    <span className="leaves-type-name">ลากิจ</span>
                    <span className="leaves-type-sub">
                      ธุระส่วนตัว / ครอบครัว
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="leave-start" className="field-label">
                  ตั้งแต่วันที่
                </label>
                <input
                  id="leave-start"
                  type="date"
                  className="input min-h-[44px]"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <span
                aria-hidden="true"
                className="muted hidden pb-3 text-lg sm:block"
              >
                →
              </span>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="leave-end" className="field-label">
                  ถึงวันที่
                </label>
                <input
                  id="leave-end"
                  type="date"
                  className="input min-h-[44px]"
                  value={end}
                  min={start || undefined}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            {dayCount > 0 && (
              <p className="m-0 mt-2.5">
                <span className="leaves-count-pill">รวม {dayCount} วัน</span>
              </p>
            )}

            <div className="mt-4 flex flex-col gap-1.5">
              <label htmlFor="leave-reason" className="field-label">
                เหตุผล <span className="field-hint">(ไม่บังคับ)</span>
              </label>
              <div
                className="leaves-reason-chips"
                role="group"
                aria-label="เหตุผลด่วน"
              >
                {REASON_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="leaves-reason-chip"
                    aria-pressed={reason === chip}
                    onClick={() => setReason(chip === "อื่นๆ" ? "" : chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <textarea
                id="leave-reason"
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="พิมพ์เหตุผลเพิ่มเติม"
                className="input min-h-[96px] resize-y py-3 leading-relaxed"
              />
            </div>

            {error && (
              <p role="alert" className="leaves-alert mt-3">
                {error}
              </p>
            )}

            <button
              type="button"
              className="btn btn-primary mt-4 w-full min-h-[52px] text-[16px]"
              disabled={saving}
              onClick={submitLeave}
            >
              {saving ? "กำลังบันทึก…" : "บันทึกใบลา"}
            </button>
            <p className="muted mt-2.5 text-center text-[13px]">
              การลาไม่ต้องรออนุมัติ · ต้องการหยุดตามปฏิทิน? ไปที่เมนู
              เลือกวันหยุด
            </p>
          </section>

          <section aria-label="ประวัติการลา" className="card card-pad min-w-0">
            <h2 className="m-0 text-[19px] font-semibold">
              ประวัติการลา ({leaves.length} รายการ)
            </h2>
            {leaves.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center">
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf1ff]"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1d63d8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                  </svg>
                </span>
                <p className="m-0 mt-4 text-[16px] font-bold">
                  ยังไม่มีประวัติการลา
                </p>
                <p className="m-0 mt-1 text-sm muted">
                  ใบลาที่บันทึกจะแสดงที่นี่
                </p>
              </div>
            ) : (
              <HistoryList leaves={leaves} />
            )}
          </section>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card flex items-center gap-3.5 p-5">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 flex-none items-center justify-center rounded-full"
                style={{ background: "#ffe4e6", color: "#be123c" }}
              >
                {TYPE_META.SICK.icon}
              </span>
              <span>
                <span className="muted block text-[13px]">ลาป่วย (ปีนี้)</span>
                <span className="block text-[22px] font-bold leading-snug">
                  {stats.sick.count} ครั้ง · {stats.sick.days} วัน
                </span>
              </span>
            </div>
            <div className="card flex items-center gap-3.5 p-5">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 flex-none items-center justify-center rounded-full"
                style={{ background: "#fef3c7", color: "#92400e" }}
              >
                {TYPE_META.PERSONAL.icon}
              </span>
              <span>
                <span className="muted block text-[13px]">ลากิจ (ปีนี้)</span>
                <span className="block text-[22px] font-bold leading-snug">
                  {stats.personal.count} ครั้ง · {stats.personal.days} วัน
                </span>
              </span>
            </div>
          </div>

          <section aria-label="ประวัติการลา" className="card card-pad">
            <h2 className="m-0 text-[19px] font-semibold">
              ประวัติการลา ({leaves.length} รายการ)
            </h2>
            {leaves.length === 0 ? (
              <p className="muted py-6 text-center text-sm">
                ยังไม่มีประวัติการลา
              </p>
            ) : (
              <HistoryList leaves={leaves} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function HistoryList({ leaves }: { leaves: LeaveItem[] }) {
  return (
    <ul className="m-0 mt-2 flex list-none flex-col p-0">
      {leaves.map((leave) => {
        const meta = TYPE_META[leave.type];
        const days = diffDaysInclusive(leave.start, leave.end);
        return (
          <li key={leave.id} className="leaves-history-row">
            <span
              className="leaves-history-icon"
              style={{ background: meta.cardBg, color: meta.cardColor }}
              aria-hidden="true"
            >
              {meta.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">
                {meta.label}
                <span
                  className="leaves-day-pill"
                  style={{ background: meta.pillBg, color: meta.pillColor }}
                >
                  {days} วัน
                </span>
              </span>
              <span className="muted mt-1 block text-[13px]">
                {leave.start === leave.end
                  ? shortDate(leave.start)
                  : rangeLabel(leave.start, leave.end)}
                {leave.reason ? ` · ${leave.reason}` : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
