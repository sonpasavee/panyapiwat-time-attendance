import type { ReactNode } from "react";

import { bangkokDateKey } from "@/lib/format";
import { Badge } from "./ui";
import type { DailyRowStatus } from "@/services/admin-report.service";

const TH_MONTHS_LONG = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const TH_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const TH_WEEKDAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

// ปีคริสต์ -> ปีพุทธศักราช (ใช้แสดงผลเท่านั้น ไม่แตะค่าที่เก็บใน DB)
export function thaiYear(year: number) {
  return year + 543;
}

export function monthLabel(month: number, year: number) {
  return `${TH_MONTHS_LONG[month - 1]} ${thaiYear(year)}`;
}

// "อ. 13 ต.ค. 2569" — รับ ISO YYYY-MM-DD (ตรงกับ workDate ที่เก็บใน DB)
export function shortDayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = TH_WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${TH_MONTHS_SHORT[m - 1]} ${thaiYear(y)}`;
}

// "13 ต.ค. อ." — หัวแถวตารางรายละเอียดรายบุคคล
export function detailDayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = TH_WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${d} ${TH_MONTHS_SHORT[m - 1]} ${weekday}`;
}

export function addDaysISO(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + delta);
  return t.toISOString().slice(0, 10);
}

export function todayISO() {
  return bangkokDateKey();
}

export function isValidDateISO(value: string | undefined): value is string {
  return (
    !!value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

// นาที -> "9 ชม. 5 น." / "45 น." / "–"
export function formatHours(totalMinutes: number | null | undefined) {
  if (totalMinutes == null) return "–";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h} ชม. ${m} น.` : `${m} น.`;
}

// เวลา HH:MM เขตกรุงเทพ (รับ Date ที่ serialize มาแล้ว)
export function formatClock(value: string | Date | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_TEXT: Record<DailyRowStatus, string> = {
  COMPLETE: "ครบ",
  WORKING: "กำลังทำงาน",
  NO_CHECKIN: "ยังไม่เช็กอิน",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  HOLIDAY: "วันหยุด",
};

const STATUS_TONE: Record<
  DailyRowStatus,
  "green" | "blue" | "yellow" | "pink" | "gray"
> = {
  COMPLETE: "green",
  WORKING: "blue",
  NO_CHECKIN: "gray",
  SICK: "pink",
  PERSONAL: "yellow",
  HOLIDAY: "gray",
};

export function StatusBadge({ status }: { status: DailyRowStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_TEXT[status]}</Badge>;
}

// ตัวอักษรย่อ + สีพาสเทลตามชื่อ (เหมือนในรูป)
const AVATAR_COLORS = [
  { bg: "#e3edff", fg: "#1d63d8" },
  { bg: "#dcfce7", fg: "#15803d" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#ffe4e6", fg: "#be123c" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#cffafe", fg: "#0e7490" },
];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) % 997;
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: color.bg,
        color: color.fg,
      }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

// การ์ดสถิติแนวนอน (ไอคอนซ้าย + ข้อความขวา) ตามรูป
export function ReportStat({
  icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="card card-pad">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="muted block text-[13px]">{label}</span>
          <span className="block text-[22px] font-bold leading-snug">
            {value}
          </span>
        </span>
      </div>
    </div>
  );
}

export function PersonIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 20v-6M11 20V6M17 20v-9" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5h.01" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 6l-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  );
}
