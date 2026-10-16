// helper วันที่สำหรับหน้าลา/วันหยุด (ไม่กระทบไฟล์อื่น)

const DAY_MS = 86400000;

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  return toISO(new Date(parseISO(iso).getTime() + days * DAY_MS));
}

export function diffDaysInclusive(startISO: string, endISO: string): number {
  return (
    Math.round(
      (parseISO(endISO).getTime() - parseISO(startISO).getTime()) / DAY_MS,
    ) + 1
  );
}

// จับวันที่เรียงกันเป็นช่วง ๆ (input ต้องเรียงจากน้อยไปมากแล้ว)
export function groupConsecutive(sorted: string[]): string[][] {
  const groups: string[][] = [];
  for (const iso of sorted) {
    const last = groups[groups.length - 1];
    if (last && addDaysISO(last[last.length - 1], 1) === iso) {
      last.push(iso);
    } else {
      groups.push([iso]);
    }
  }
  return groups;
}

const narrowWeekday = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "narrow",
});

const longWeekday = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "long",
});

const monthShortFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "short",
});

const yearFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
});

const dayNumFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
});

const monthLongFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "long",
  year: "numeric",
});

function d(iso: string): Date {
  return parseISO(iso);
}

// ชื่อวันแบบย่อ + จุด: ศ. ส. อา. จ.
export function weekdayNarrow(iso: string): string {
  return `${narrowWeekday.format(d(iso))}.`;
}

// ชื่อวันแบบยาว: เสาร์ อาทิตย์ (ตัดคำว่า "วัน" หน้า)
export function weekdayLong(iso: string): string {
  return longWeekday.format(d(iso)).replace(/^วัน/, "");
}

// 13 พ.ย. / ศ. 13 พ.ย.
export function shortDate(iso: string, withWeekday = false): string {
  const base = `${dayNumFmt.format(d(iso))} ${monthShortFmt.format(d(iso))}`;
  return withWeekday ? `${weekdayNarrow(iso)} ${base}` : base;
}

// 13 – 16 พ.ย. 2569 (เดือน/ปีเดียวกัน) หรือ 28 ต.ค. – 2 พ.ย. 2569
export function rangeLabel(startISO: string, endISO: string): string {
  const s = d(startISO);
  const e = d(endISO);
  const year = yearFmt.format(e);
  if (
    monthShortFmt.format(s) === monthShortFmt.format(e) &&
    yearFmt.format(s) === year
  ) {
    return `${dayNumFmt.format(s)} – ${dayNumFmt.format(e)} ${monthShortFmt.format(e)} ${year}`;
  }
  return `${dayNumFmt.format(s)} ${monthShortFmt.format(s)} – ${dayNumFmt.format(e)} ${monthShortFmt.format(e)} ${year}`;
}

// ศ. – จ. · 4 วัน / เสาร์ · 1 วัน
export function rangeSub(startISO: string, endISO: string): string {
  const days = diffDaysInclusive(startISO, endISO);
  const dayWord = `${days} วัน`;
  if (startISO === endISO) return `${weekdayLong(startISO)} · ${dayWord}`;
  return `${weekdayNarrow(startISO)} – ${weekdayNarrow(endISO)} · ${dayWord}`;
}

export function monthLabel(year: number, month: number): string {
  return monthLongFmt.format(new Date(Date.UTC(year, month - 1, 1)));
}
