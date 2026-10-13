import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { currentUser } from "@/lib/auth";
import { monthYear } from "@/validators/api";
import { getUserProfile } from "@/services/user.service";
import {
  getTodayAttendance,
  listMyAttendance,
} from "@/services/attendance.service";
import { getMyMonthlySummary } from "@/services/monthly-report.service";
import { getMyMoneyReport } from "@/services/money-tracker.service";
import { listMyLeaves } from "@/services/leave.service";

import AttendanceForm from "../components/attendance-form";
import LeaveForm from "../components/leave-form";
import LogoutButton from "../components/logout-button";
import WorkTimer from "../components/work-timer";

/* ---------- constants & helpers ---------- */

const TZ = "Asia/Bangkok";

const LEAVE_LABEL: Record<string, string> = {
  HOLIDAY: "วันหยุด",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
};

const LEAVE_STYLE: Record<string, string> = {
  HOLIDAY: "bg-sky-300/20 text-sky-100 ring-sky-200/30",
  SICK: "bg-rose-300/20 text-rose-100 ring-rose-200/30",
  PERSONAL: "bg-amber-300/20 text-amber-100 ring-amber-200/30",
};

const NAV = [
  { href: "#today", label: "วันนี้" },
  { href: "#month", label: "สรุปเดือน" },
  { href: "#money", label: "เงิน" },
  { href: "#leave", label: "ลา" },
  { href: "#history", label: "ประวัติ" },
];

type DateInput = Date | string | null | undefined;

function formatTime(value: DateInput) {
  if (!value) return "–";
  return new Date(value).toLocaleTimeString("th-TH", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("th-TH", {
    timeZone: TZ,
    dateStyle: "medium",
  });
}

function formatLongDate(value: Date | string) {
  return new Date(value).toLocaleDateString("th-TH", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** YYYY-MM-DD ตามเวลาไทย ใช้เทียบ "วันก่อนหน้า" */
function dateKey(value: Date | string) {
  return new Date(value).toLocaleDateString("en-CA", { timeZone: TZ });
}

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m} นาที` : `${h} ชม. ${m} นาที`;
}

function baht(value: unknown) {
  return `฿${Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const card = "rounded-2xl border border-white/15 bg-white/[0.07] p-5 sm:p-6";
const focusRing =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#ffd666]";

/* ---------- small presentational pieces ---------- */

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        {hint && <p className="text-sm text-white/70">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={card}>
      <p className="text-sm text-white/75">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">
        {children}
      </p>
    </div>
  );
}

function Unit({ children }: { children: ReactNode }) {
  return (
    <span className="ml-1 mr-2 text-sm font-medium text-white/75">
      {children}
    </span>
  );
}

function Step({
  state,
  label,
  value,
}: {
  state: "done" | "current" | "todo";
  label: string;
  value: ReactNode;
}) {
  const circle =
    state === "done"
      ? "bg-emerald-400 text-[#06331f]"
      : state === "current"
        ? "bg-white text-[#0b2f5c] ring-4 ring-sky-300/40"
        : "border border-white/30 bg-white/10 text-white/70";
  return (
    <li className="flex flex-col items-center gap-1.5 text-center">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${circle}`}
      >
        {state === "done" ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        )}
      </span>
      <span className="text-xs text-white/75">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function Badge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------- page ---------- */

export default async function StudentPage() {
  const session = await currentUser();

  if (!session) {
    redirect("/login?role=student");
  }
  if (session.role !== "STUDENT") {
    redirect("/admin");
  }

  const { month, year } = monthYear(new URLSearchParams());

  const [profile, today, summary, money, leaves, history] = await Promise.all([
    getUserProfile(session.id),
    getTodayAttendance(session.id),
    getMyMonthlySummary(session.id, month, year),
    getMyMoneyReport(session.id, month, year),
    listMyLeaves(session.id, 0, 10),
    listMyAttendance(session.id, { userId: session.id }, 0, 10),
  ]);

  const now = new Date();
  const todayKey = dateKey(now);
  const monthLabel = now.toLocaleDateString("th-TH", {
    timeZone: TZ,
    month: "long",
    year: "numeric",
  });

  const checkedIn = !!today;
  const checkedOut = !!today?.checkOutAt;
  const working = checkedIn && !checkedOut;

  const status = !checkedIn
    ? {
        label: "ยังไม่ได้เช็กอิน",
        cls: "bg-amber-300/20 text-amber-100 ring-amber-200/30",
      }
    : working
      ? {
          label: "กำลังทำงาน",
          cls: "bg-sky-300/20 text-sky-100 ring-sky-200/30",
        }
      : {
          label: "บันทึกครบแล้ว",
          cls: "bg-emerald-300/20 text-emerald-100 ring-emerald-200/30",
        };

  const moneyRows = [
    { type: "CASH" as const, label: "เงินสด" },
    { type: "TRUEMONEY" as const, label: "TrueMoney" },
  ];

  return (
    <main
      className="min-h-screen pb-16 text-white"
      style={{
        background:
          "radial-gradient(900px 520px at 15% 0%, rgba(96,165,240,0.30), rgba(96,165,240,0) 60%), linear-gradient(180deg, #0e4a86 0%, #0a2e5a 100%)",
      }}
    >
      {/* Header */}
      <header className="mx-auto flex max-w-[960px] items-center gap-3 px-5 pb-4 pt-6 sm:px-8">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0b2f5c]"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold sm:text-2xl">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="truncate text-sm text-white/75">
            รหัส {profile.studentId ?? profile.username}
            {profile.shopCode ? ` • ร้าน ${profile.shopCode}` : ""}
            {profile.gradeLevel ? ` • ชั้นปี ${profile.gradeLevel}` : ""}
          </p>
        </div>
        <LogoutButton />
      </header>

      {/* Sticky section nav */}
      <nav
        aria-label="ไปยังหัวข้อ"
        className="sticky top-0 z-10 border-b border-white/10 bg-[#0a2e5a]/85 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-[960px] gap-1.5 overflow-x-auto px-5 py-2 sm:px-8">
          {NAV.map((item) => (
            <li key={item.href} className="shrink-0">
              <a
                href={item.href}
                className={`flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-white/90 transition hover:bg-white/10 ${focusRing}`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto mt-6 flex max-w-[960px] flex-col gap-8 px-5 sm:px-8">
        {/* Today: status + the one action that matters */}
        <section
          id="today"
          aria-labelledby="today-title"
          className="scroll-mt-20 rounded-3xl border border-white/20 bg-white/[0.12] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-white/75">วันนี้</p>
              <h2 id="today-title" className="text-xl font-bold">
                {formatLongDate(now)}
              </h2>
            </div>
            <Badge className={status.cls}>
              {working && (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 animate-pulse rounded-full bg-sky-200"
                />
              )}
              {status.label}
            </Badge>
          </div>

          <ol className="mt-6 grid grid-cols-3 gap-2">
            <Step
              state={checkedIn ? "done" : "current"}
              label="เช็กอิน"
              value={checkedIn ? formatTime(today?.checkInAt) : "–"}
            />
            <Step
              state={checkedOut ? "done" : working ? "current" : "todo"}
              label="เวลาทำงาน"
              value={
                working && today ? (
                  <WorkTimer since={new Date(today.checkInAt).toISOString()} />
                ) : today?.workMinutes != null ? (
                  formatMinutes(today.workMinutes)
                ) : (
                  "–"
                )
              }
            />
            <Step
              state={checkedOut ? "done" : "todo"}
              label="เช็กเอาท์"
              value={checkedOut ? formatTime(today?.checkOutAt) : "–"}
            />
          </ol>

          <div className="mt-6 border-t border-white/15 pt-6">
            {!checkedIn ? (
              <>
                <h3 className="text-lg font-semibold">เช็กอินเข้างาน</h3>
                <p className="mt-1 text-sm text-white/75">
                  แนบรูปถ่าย ใส่จำนวนเงินที่นำเข้า และเลือกประเภทเงิน
                  แล้วกดยืนยัน
                </p>
                <div className="mt-4">
                  <AttendanceForm action="check-in" />
                </div>
              </>
            ) : working ? (
              <>
                <h3 className="text-lg font-semibold">เช็กเอาท์ออกงาน</h3>
                <p className="mt-1 text-sm text-white/75">
                  แนบรูปถ่าย ใส่จำนวนเงินที่นำออก และเลือกประเภทเงิน
                  แล้วกดยืนยัน
                </p>
                <div className="mt-4">
                  <AttendanceForm action="check-out" />
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-emerald-200/30 bg-emerald-300/10 px-4 py-3 text-sm leading-relaxed text-emerald-100">
                วันนี้เช็กอินและเช็กเอาท์ครบแล้ว ขอบคุณที่ตั้งใจฝึกงาน
                เจอกันใหม่พรุ่งนี้
              </p>
            )}
          </div>
        </section>

        {/* Monthly summary */}
        <Section id="month" title="สรุปเดือนนี้" hint={monthLabel}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="ชั่วโมงทำงานรวม">
              {summary.hours}
              <Unit>ชม.</Unit>
              {summary.minutes}
              <Unit>นาที</Unit>
            </Stat>
            <Stat label="วันมาทำงาน">
              {summary.attendanceDays}
              <Unit>วัน</Unit>
            </Stat>
            <Stat label="วันที่เช็กครบ (เข้า–ออก)">
              {summary.completeDays}
              <Unit>วัน</Unit>
            </Stat>
          </div>
        </Section>

        {/* Money */}
        <Section id="money" title="เงินส่วนตัว" hint={`เดือน${monthLabel}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {moneyRows.map(({ type, label }) => (
              <div key={type} className={card}>
                <p className="text-sm font-medium text-white/80">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">
                  {baht(money.totals[type].net)}
                </p>
                <p className="text-xs text-white/70">คงเหลือสุทธิ</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
                  <div>
                    <dt className="text-white/70">เงินเข้า</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {baht(money.totals[type].in)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/70">เงินออก</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">
                      {baht(money.totals[type].out)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </Section>

        {/* Leave */}
        <Section id="leave" title="การลา">
          <div className={card}>
            <details className="group rounded-xl border border-white/15 bg-white/[0.05]">
              <summary
                className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold marker:content-none [&::-webkit-details-marker]:hidden ${focusRing}`}
              >
                <span className="flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  แจ้งลาใหม่
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-180"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="border-t border-white/10 p-4">
                <LeaveForm />
              </div>
            </details>

            <h3 className="mb-2 mt-6 text-base font-semibold">ประวัติการลา</h3>
            {leaves.items.length === 0 ? (
              <p className="rounded-xl bg-black/20 px-4 py-6 text-center text-sm text-white/70">
                ยังไม่มีประวัติการลา
              </p>
            ) : (
              <ul className="space-y-2">
                {leaves.items.map((leave) => {
                  const sameDay =
                    dateKey(leave.startDate) === dateKey(leave.endDate);
                  return (
                    <li
                      key={leave.id}
                      className="rounded-xl bg-black/20 px-4 py-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                          className={
                            LEAVE_STYLE[leave.type] ??
                            "bg-white/10 text-white ring-white/20"
                          }
                        >
                          {LEAVE_LABEL[leave.type] ?? leave.type}
                        </Badge>
                        <span className="tabular-nums text-white/85">
                          {sameDay
                            ? formatDate(leave.startDate)
                            : `${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}`}
                        </span>
                      </div>
                      {leave.reason && (
                        <p className="mt-2 text-white/75">{leave.reason}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Section>

        {/* History */}
        <Section id="history" title="ประวัติการลงเวลา" hint="10 รายการล่าสุด">
          {history.items.length === 0 ? (
            <p className={`${card} text-center text-sm text-white/70`}>
              ยังไม่มีประวัติการลงเวลา
            </p>
          ) : (
            <>
              {/* Mobile: cards */}
              <ul className="space-y-2.5 md:hidden">
                {history.items.map((item) => {
                  const missed =
                    !item.checkOutAt && dateKey(item.workDate) < todayKey;
                  return (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-white/15 bg-white/[0.07] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {formatDate(item.workDate)}
                          </p>
                          <p className="mt-1 text-sm tabular-nums text-white/80">
                            {formatTime(item.checkInAt)} –{" "}
                            {formatTime(item.checkOutAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">
                            {item.workMinutes != null
                              ? formatMinutes(item.workMinutes)
                              : "–"}
                          </p>
                          {missed && (
                            <Badge className="mt-1.5 bg-amber-300/20 text-amber-100 ring-amber-200/30">
                              ไม่ได้เช็กเอาท์
                            </Badge>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Desktop: table */}
              <div className={`${card} hidden overflow-x-auto p-2 md:block`}>
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    ประวัติการลงเวลาเข้า–ออกงาน
                  </caption>
                  <thead>
                    <tr className="text-white/70">
                      <th scope="col" className="px-4 py-3 font-medium">
                        วันที่
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        เช็กอิน
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        เช็กเอาท์
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-medium"
                      >
                        เวลาทำงาน
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.items.map((item) => {
                      const missed =
                        !item.checkOutAt && dateKey(item.workDate) < todayKey;
                      return (
                        <tr key={item.id} className="border-t border-white/10">
                          <td className="px-4 py-3 font-medium">
                            {formatDate(item.workDate)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatTime(item.checkInAt)}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {missed ? (
                              <Badge className="bg-amber-300/20 text-amber-100 ring-amber-200/30">
                                ไม่ได้เช็กเอาท์
                              </Badge>
                            ) : (
                              formatTime(item.checkOutAt)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {item.workMinutes != null
                              ? formatMinutes(item.workMinutes)
                              : "–"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>
      </div>
    </main>
  );
}
