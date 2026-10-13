export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
  });
}

export const LEAVE_LABEL: Record<string, string> = {
  HOLIDAY: "วันหยุด",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
};

export const MONEY_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  TRUEMONEY: "TrueMoney",
};

// เวลา HH:MM (เขตกรุงเทพ)
export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// หัววันที่แบบยาว เช่น "วันอังคารที่ 13 ตุลาคม 2569"
export function formatThaiHeader(date = new Date()) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// นาที -> "9 ชม. 3 นาที" / "45 นาที"
export function formatMinutes(totalMinutes: number | null | undefined) {
  if (totalMinutes == null) return "–";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;
}

const bangkokKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// คีย์วันที่ YYYY-MM-DD ตามเขตกรุงเทพ (ตรงกับ workDate ที่เก็บใน DB)
export function bangkokDateKey(date = new Date()) {
  return bangkokKey.format(date);
}

const weekdayShort = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
});

// 7 วันทำการล่าสุดย้อนหลัง (รวมวันนี้, ข้ามเสาร์-อาทิตย์) ตาม mock
export function last7Weekdays(now = new Date()) {
  const dayNum = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
  });
  const dowNum = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
  });
  const isWeekend = (d: Date) => {
    const w = dowNum.format(d);
    return w === "Sat" || w === "Sun";
  };
  const days: { key: string; label: string }[] = [];
  const cursor = new Date(now);
  while (days.length < 7) {
    if (!isWeekend(cursor)) {
      days.unshift({
        key: bangkokDateKey(cursor),
        label: `${weekdayShort.format(cursor).replace(".", "")} ${dayNum.format(cursor)}`,
      });
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}
