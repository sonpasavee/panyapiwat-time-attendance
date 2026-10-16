import Link from "next/link";

import { requireStudentPage } from "@/lib/page-auth";
import {
  bangkokDateKey,
  formatDate,
  formatMinutes,
  formatSpent,
  formatThaiHeader,
  formatTime,
  last7Weekdays,
} from "@/lib/format";
import { monthRange } from "@/lib/time";
import { monthYear } from "@/validators/api";
import { getUserProfile } from "@/services/user.service";
import {
  getTodayAttendance,
  listMyAttendance,
} from "@/services/attendance.service";
import { getMyMonthlySummary } from "@/services/monthly-report.service";
import { getMyMoneyReport } from "@/services/money-tracker.service";
import { summarizeDailyMoney } from "@/services/money-tracker.logic";
import { listMyLeaves } from "@/services/leave.service";

import AttendanceForm from "../components/attendance-form";
import WorkTimer from "../components/work-timer";
import { AttendanceBadge, Badge, Card, CardHeader, LeaveBadge, StatCard } from "../components/ui";

export const instant = false;

function leaveRangeText(start: Date, end: Date) {
  const s = formatDate(start).replace(" พ.ศ. ", " ").replace(", ", " ");
  if (bangkokDateKey(start) === bangkokDateKey(end)) return s;
  const e = formatDate(end);
  // "1 – 2 ต.ค. 2569" แบบ mock: ตัดเดือนปีซ้ำฝั่งเริ่ม
  const sDay = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
  }).format(start);
  return `${sDay} – ${e}`;
}

function TimelineDot({ state }: { state: "done" | "current" | "todo" }) {
  if (state === "done") {
    return (
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#16a34a] text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-[#1d63d8] bg-white shadow-[0_0_0_4px_#dbeafe]">
        <span className="h-[9px] w-[9px] rounded-full bg-[#1d63d8]" />
      </span>
    );
  }
  return (
    <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#e8edf5]">
      <span className="h-[9px] w-[9px] rounded-full bg-[#8696ae]" />
    </span>
  );
}

export default async function StudentDashboardPage() {
  const session = await requireStudentPage();
  const now = new Date();
  const { month, year } = monthYear(new URLSearchParams());
  const todayKey = bangkokDateKey(now);
  const week = last7Weekdays(now);

  const [profile, today, summary, money, leaves, history, monthRows, allLeaves] =
    await Promise.all([
      getUserProfile(session.id),
      getTodayAttendance(session.id),
      getMyMonthlySummary(session.id, month, year),
      getMyMoneyReport(session.id, month, year),
      listMyLeaves(session.id, 0, 4),
      listMyAttendance(session.id, { userId: session.id }, 0, 10),
      listMyAttendance(
        session.id,
        { userId: session.id, workDate: monthRange(year, month) },
        0,
        200,
      ),
      listMyLeaves(session.id, 0, 100),
    ]);

  const checkedIn = !!today;
  const checkedOut = !!today?.checkOutAt;

  const rowByDate = new Map(
    monthRows.items.map((r) => [bangkokDateKey(r.workDate), r]),
  );
  const isLeaveDay = (key: string) =>
    allLeaves.items.some(
      (l) => bangkokDateKey(l.startDate) <= key && key <= bangkokDateKey(l.endDate),
    );

  const chart = week.map((d) => {
    const row = rowByDate.get(d.key);
    const isToday = d.key === todayKey;
    if (row?.workMinutes != null) {
      const hours = row.workMinutes / 60;
      return { ...d, kind: "done" as const, label: hours.toFixed(1), height: Math.min(150, Math.round(hours * 13)) };
    }
    if (row && !row.checkOutAt && !isToday) {
      return { ...d, kind: "missed" as const, label: "–", height: 6 };
    }
    if (isLeaveDay(d.key) && !isToday) {
      return { ...d, kind: "leave" as const, label: "ลา", height: 6 };
    }
    if (isToday && row && !row.checkOutAt) {
      const hours = (now.getTime() - new Date(row.checkInAt).getTime()) / 3600000;
      return { ...d, kind: "today" as const, label: hours.toFixed(1), height: Math.max(10, Math.min(150, Math.round(hours * 13))) };
    }
    return { ...d, kind: "empty" as const, label: "0", height: 6 };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-[28px] font-bold leading-snug">แดชบอร์ด</h1>
          <p className="mt-0.5 text-[15px] muted">
            สวัสดี {profile.firstName} {profile.lastName} • {formatThaiHeader()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm muted">
            ร้าน {profile.shopCode ?? "–"} • ชั้นปี {profile.gradeLevel ?? "–"}
          </span>
          {checkedOut ? (
            <Badge tone="green">ครบ</Badge>
          ) : checkedIn ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#dbeafe] px-4 py-2 text-sm font-semibold text-[#1e3a8a]">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#1d63d8]" />
              กำลังทำงาน
            </span>
          ) : (
            <Badge tone="gray">ยังไม่เช็กอิน</Badge>
          )}
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* LEFT */}
        <div className="flex min-w-0 flex-col gap-6">
          <Card labelledBy="today-h" className="card-pad">
            <div className="flex items-center justify-between">
              <h2 id="today-h" className="m-0 text-[19px] font-semibold">วันนี้</h2>
              <span className="text-sm muted">
                {checkedIn ? `เช็กอินเมื่อ ${formatTime(today?.checkInAt)} น.` : "ยังไม่ได้เช็กอิน"}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 rounded-2xl bg-[#f4f7fb] p-5">
                <p className="m-0 text-[13px] muted">เวลาทำงานวันนี้</p>
                {checkedIn && !checkedOut && today ? (
                  <>
                    <WorkTimer
                      checkInAt={new Date(today.checkInAt).toISOString()}
                      initialNow={now.getTime()}
                    />
                    <p className="mt-1.5 text-sm muted">กำลังนับเวลาต่อเนื่อง</p>
                  </>
                ) : checkedOut && today?.workMinutes != null ? (
                  <>
                    <p className="m-0 mt-1 text-5xl font-bold leading-[1.15] tabular-nums">
                      {String(Math.floor(today.workMinutes / 3600)).padStart(2, "0")}:
                      {String(Math.floor((today.workMinutes % 3600) / 60)).padStart(2, "0")}:
                      {String(Math.floor(((today.workMinutes % 3600) % 60))).padStart(2, "0")}
                    </p>
                    <p className="mt-1.5 text-sm muted">ทำงานครบแล้ววันนี้</p>
                  </>
                ) : (
                  <>
                    <p className="m-0 mt-1 text-5xl font-bold leading-[1.15] tabular-nums muted">00:00:00</p>
                    <p className="mt-1.5 text-sm muted">เช็กอินเพื่อเริ่มนับเวลา</p>
                  </>
                )}
              </div>

              <ol className="m-0 flex flex-1 list-none flex-col justify-center gap-3.5 p-0">
                <li className="flex items-center gap-3">
                  <TimelineDot state={checkedIn ? "done" : "todo"} />
                  <span className="flex-1 text-[15px] font-medium">เช็กอิน</span>
                  <span className="text-[15px] font-semibold">{checkedIn ? formatTime(today?.checkInAt) : "–"}</span>
                </li>
                <li className="flex items-center gap-3">
                  <TimelineDot state={checkedIn && !checkedOut ? "current" : checkedOut ? "done" : "todo"} />
                  <span className="flex-1 text-[15px] font-medium">กำลังทำงาน</span>
                  <span className="text-[15px] font-semibold text-[#1750b8]">
                    {checkedIn && !checkedOut ? "ตอนนี้" : checkedOut ? formatMinutes(today?.workMinutes) : "–"}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <TimelineDot state={checkedOut ? "done" : "todo"} />
                  <span className={`flex-1 text-[15px] font-medium ${checkedOut ? "" : "muted"}`}>เช็กเอาท์</span>
                  <span className={`text-[15px] font-semibold ${checkedOut ? "" : "muted"}`}>
                    {checkedOut ? formatTime(today?.checkOutAt) : "–"}
                  </span>
                </li>
              </ol>
            </div>

            <div className="mt-6 border-t border-[#e3e9f2] pt-6">
              <h3 className="m-0 text-[17px] font-semibold">
                {!checkedIn ? "เช็กอินเข้างาน" : !checkedOut ? "เช็กเอาท์ออกงาน" : "บันทึกวันนี้ครบแล้ว"}
              </h3>
              {!checkedIn ? (
                <AttendanceForm action="check-in" />
              ) : !checkedOut ? (
                <AttendanceForm action="check-out" />
              ) : (
                <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                  วันนี้เช็กอินและเช็กเอาท์ครบแล้ว เจอกันใหม่พรุ่งนี้
                </p>
              )}
            </div>
          </Card>

          <Card label="ประวัติการลงเวลา" className="overflow-hidden">
            <CardHeader
              id="hist-h"
              title="ประวัติการลงเวลา"
              aside={<span className="text-sm muted">10 รายการล่าสุด</span>}
            />
            {history.items.length === 0 ? (
              <p className="muted px-6 pb-6 text-sm">ยังไม่มีประวัติการลงเวลา</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl">
                  <caption className="sr-only">ประวัติการลงเวลาเข้า–ออกงาน</caption>
                  <thead>
                    <tr>
                      <th scope="col">วันที่</th>
                      <th scope="col">เช็กอิน</th>
                      <th scope="col">เช็กเอาท์</th>
                      <th scope="col">เวลาทำงาน</th>
                      <th scope="col">เงินใช้ไป</th>
                      <th scope="col">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.items.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium">{formatDate(item.workDate)}</td>
                        <td>{formatTime(item.checkInAt)}</td>
                        <td>{formatTime(item.checkOutAt)}</td>
                        <td className="font-semibold">{formatMinutes(item.workMinutes)}</td>
                        <td className="font-semibold tabular-nums">
                          {(() => {
                            const spent = summarizeDailyMoney(item.money);
                            if (!spent.complete) return "–";
                            const shown = formatSpent(spent.totalSpent);
                            return (
                              <span style={shown.isGain ? { color: "#16a34a" } : undefined}>
                                {shown.text}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          {item.checkOutAt ? (
                            <AttendanceBadge checkedOut />
                          ) : bangkokDateKey(item.workDate) === todayKey ? (
                            <AttendanceBadge checkedOut={false} />
                          ) : (
                            <AttendanceBadge checkedOut={false} missed />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end px-6 py-3.5">
              <Link href="/student/attendance" className="text-sm font-semibold text-[#1750b8] hover:underline">
                ดูประวัติทั้งหมด →
              </Link>
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="flex min-w-0 flex-col gap-5">
          <div aria-label="สรุปเดือนนี้" className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
              iconBg="#dbeafe"
              iconColor="#1750b8"
              label="ชั่วโมงรวมเดือนนี้"
              value={<>{summary.hours}<span className="mx-1.5 text-[13px] font-medium muted">ชม.</span>{summary.minutes}<span className="ml-1 text-[13px] font-medium muted">น.</span></>}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M9 15l2 2 4-4" /></svg>}
              iconBg="#dcfce7"
              iconColor="#14532d"
              label="วันมาทำงาน"
              value={<>{summary.attendanceDays}<span className="ml-1 text-[13px] font-medium muted">วัน</span></>}
              sub={`เช็กครบ ${summary.completeDays} วัน`}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="16.5" cy="13.5" r="1.2" /></svg>}
              iconBg="#fef3c7"
              iconColor="#78350f"
              label="เงินสดคงเหลือ"
              value={`฿${money.totals.CASH.net}`}
              sub={`เข้า ฿${money.totals.CASH.in} • ออก ฿${money.totals.CASH.out}`}
            />
            <StatCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M11 18h2" /></svg>}
              iconBg="#e0e7ff"
              iconColor="#312e81"
              label="TrueMoney คงเหลือ"
              value={`฿${money.totals.TRUEMONEY.net}`}
              sub={`เข้า ฿${money.totals.TRUEMONEY.in} • ออก ฿${money.totals.TRUEMONEY.out}`}
            />
          </div>

          <Card labelledBy="chart-h" className="card-pad">
            <div className="flex items-baseline justify-between">
              <h2 id="chart-h" className="m-0 text-[17px] font-semibold">ชั่วโมงทำงานรายวัน</h2>
              <span className="text-[13px] muted">
                {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" }).format(new Date())}
              </span>
            </div>
            <div className="mt-3.5 flex h-[190px] items-end gap-2.5 border-b border-[#e3e9f2] pb-0.5" role="img" aria-label="กราฟชั่วโมงทำงาน 7 วันทำการล่าสุด">
              {chart.map((b) => (
                <div key={b.key} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span
                    className={`text-xs font-semibold ${b.kind === "missed" ? "text-[#78350f]" : b.kind === "leave" || b.kind === "empty" ? "muted" : b.kind === "today" ? "text-[#1750b8]" : ""}`}
                  >
                    {b.label}
                  </span>
                  <div
                    className="w-full max-w-[30px]"
                    style={{
                      height: b.height,
                      borderRadius: b.height <= 6 ? 3 : "8px 8px 0 0",
                      background:
                        b.kind === "done" ? "#1d63d8"
                        : b.kind === "today" ? "#93b4f0"
                        : b.kind === "missed" ? "#f59e0b"
                        : b.kind === "leave" ? "#c3cfe0" : "#e3e9f2",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-2.5">
              {week.map((d) => (
                <span key={d.key} className={`flex-1 text-center text-xs ${d.key === todayKey ? "font-semibold text-[#1750b8]" : "muted"}`}>
                  {d.label}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs muted">ลา = วันที่ลา • – = ไม่ได้เช็กเอาท์ • แท่งอ่อน = วันนี้ (ยังทำงานอยู่)</p>
          </Card>

          <Card labelledBy="leave-h" className="card-pad">
            <div className="flex items-center justify-between">
              <h2 id="leave-h" className="m-0 text-[17px] font-semibold">การลา</h2>
              <Link href="/student/leaves" className="btn btn-soft min-h-[40px] px-4 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                แจ้งลา
              </Link>
            </div>
            {leaves.items.length === 0 ? (
              <p className="muted mt-3.5 text-sm">ยังไม่มีประวัติการลา</p>
            ) : (
              <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0">
                {leaves.items.map((leave) => (
                  <li key={leave.id} className="rounded-xl bg-[#f8fafd] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <LeaveBadge type={leave.type} />
                      <span className="text-sm text-[#33425b]">
                        {leaveRangeText(leave.startDate, leave.endDate)}
                      </span>
                    </div>
                    {leave.reason && (
                      <p className="mt-2 text-[13px] muted">{leave.reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
