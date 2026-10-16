import { requireStudentPage } from "@/lib/page-auth";
import { bangkokDateKey } from "@/lib/format";
import { listMyLeaves } from "@/services/leave.service";

import HolidayManager from "./holiday-manager";
import LeaveManager from "./leave-manager";
import { diffDaysInclusive, shortDate } from "./leave-dates";
import "./leaves.css";

export const instant = false;

type SearchParams = {
  tab?: string | string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const bangkokYear = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
});

export default async function StudentLeavesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireStudentPage();
  const params = await searchParams;
  const tab = first(params.tab) === "leave" ? "leave" : "holiday";

  const today = bangkokDateKey();
  const year = Number(bangkokYear.format(new Date()));

  const { items } = await listMyLeaves(session.id, 0, 500);

  const holidays = items
    .filter((l) => l.type === "HOLIDAY")
    .map((l) => ({
      id: l.id,
      start: l.startDate.toISOString().slice(0, 10),
      end: l.endDate.toISOString().slice(0, 10),
    }))
    .sort((a, b) => (a.start < b.start ? -1 : 1));

  const holidayDays = holidays.reduce(
    (sum, h) => sum + diffDaysInclusive(h.start, h.end),
    0,
  );
  const upcoming = holidays.find((h) => h.end >= today);
  const nextLabel = upcoming
    ? shortDate(upcoming.start > today ? upcoming.start : today, true)
    : null;

  const records = items
    .filter((l) => l.type === "SICK" || l.type === "PERSONAL")
    .map((l) => ({
      id: l.id,
      type: l.type as "SICK" | "PERSONAL",
      start: l.startDate.toISOString().slice(0, 10),
      end: l.endDate.toISOString().slice(0, 10),
      reason: l.reason,
    }))
    .sort((a, b) => (a.start > b.start ? -1 : 1));

  const statOf = (type: "SICK" | "PERSONAL") => {
    const rows = records.filter(
      (r) => r.type === type && Number(r.start.slice(0, 4)) === year,
    );
    return {
      count: rows.length,
      days: rows.reduce((sum, r) => sum + diffDaysInclusive(r.start, r.end), 0),
    };
  };

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-5">
      <nav aria-label="เลือกหมวด" className="leaves-tabs w-fit">
        <a
          href="/student/leaves?tab=holiday"
          aria-current={tab === "holiday" ? "page" : undefined}
        >
          วันหยุด
        </a>
        <a
          href="/student/leaves?tab=leave"
          aria-current={tab === "leave" ? "page" : undefined}
        >
          การลา
        </a>
      </nav>

      {tab === "holiday" ? (
        <HolidayManager
          holidays={holidays}
          todayISO={today}
          totalDays={holidayDays}
          nextLabel={nextLabel}
        />
      ) : (
        <LeaveManager
          leaves={records}
          stats={{ sick: statOf("SICK"), personal: statOf("PERSONAL") }}
        />
      )}
    </div>
  );
}
