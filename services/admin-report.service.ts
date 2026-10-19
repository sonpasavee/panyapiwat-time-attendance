import { prisma } from "@/lib/db";
import { monthRange } from "@/lib/time";
import {
  amountToCents,
  centsToAmount,
  summarizeDailyMoney,
  type DailyMoneySummary,
} from "@/services/money-tracker.logic";

export type ReportUserFilter = {
  shopCode?: string;
  q?: string;
};

export type DailyRowStatus =
  | "COMPLETE"
  | "WORKING"
  | "NO_CHECKIN"
  | "SICK"
  | "PERSONAL"
  | "HOLIDAY";

export type DailyRow = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    employeeCode: string | null;
    shopCode: string | null;
  };
  checkInAt: Date | null;
  checkOutAt: Date | null;
  workMinutes: number | null;
  checkInPhotoUrl: string | null;
  checkOutPhotoUrl: string | null;
  leaveType: "SICK" | "PERSONAL" | "HOLIDAY" | null;
  status: DailyRowStatus;
  moneySummary: DailyMoneySummary | null;
};

export type MonthlyRow = {
  user: DailyRow["user"];
  attendanceDays: number;
  completeDays: number;
  leaveDays: number;
  totalMinutes: number;
};

const IMAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function availablePhotoUrl(url: string | null, uploadedAt: Date | null) {
  return url && uploadedAt && Date.now() - uploadedAt.getTime() < IMAGE_RETENTION_MS
    ? url
    : null;
}

// รายชื่อนักศึกษาที่ใช้งานอยู่ (roster ตั้งต้นของหน้ารายงาน)
function userWhere(filter: ReportUserFilter) {
  return {
    role: "STUDENT" as const,
    isActive: true,
    ...(filter.shopCode ? { shopCode: filter.shopCode } : {}),
    ...(filter.q
      ? {
          OR: [
            { studentId: { contains: filter.q } },
            { employeeCode: { contains: filter.q } },
            {
              firstName: { contains: filter.q, mode: "insensitive" as const },
            },
            { lastName: { contains: filter.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  studentId: true,
  employeeCode: true,
  shopCode: true,
} as const;

async function getRoster(filter: ReportUserFilter) {
  return prisma.user.findMany({
    where: userWhere(filter),
    select: userSelect,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

// รหัสร้านทั้งหมดของนักศึกษา active (ไว้ทำ dropdown ตัวกรอง)
export function listActiveShopCodes() {
  return prisma.user.findMany({
    where: { role: "STUDENT", isActive: true, shopCode: { not: null } },
    select: { shopCode: true },
    distinct: ["shopCode"],
    orderBy: { shopCode: "asc" },
  });
}

function minutesBetween(checkInAt: Date, checkOutAt: Date) {
  return Math.max(
    0,
    Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 60000),
  );
}

// รายวัน: roster ทุกคน + attendance ของวันนั้น + ใบลาที่คลุมวันนั้น
export async function getDailyReport(
  dateISO: string,
  filter: ReportUserFilter,
) {
  const workDate = new Date(`${dateISO}T00:00:00.000Z`);
  const roster = await getRoster(filter);
  const ids = roster.map((u) => u.id);

  const [attendances, leaves] = await Promise.all([
    ids.length === 0
      ? []
      : prisma.attendance.findMany({
          where: { userId: { in: ids }, workDate },
          select: {
            userId: true,
            checkInAt: true,
            checkOutAt: true,
            workMinutes: true,
            checkInPhotoUrl: true,
            checkOutPhotoUrl: true,
            money: {
              select: { moneyType: true, direction: true, amount: true },
            },
          },
        }),
    ids.length === 0
      ? []
      : prisma.leave.findMany({
          where: {
            userId: { in: ids },
            startDate: { lte: workDate },
            endDate: { gte: workDate },
          },
          select: { userId: true, type: true },
        }),
  ]);

  const attendanceByUser = new Map(attendances.map((a) => [a.userId, a]));
  const leaveByUser = new Map(leaves.map((l) => [l.userId, l.type]));

  const rows: DailyRow[] = roster.map((user) => {
    const att = attendanceByUser.get(user.id) ?? null;
    const leaveType = leaveByUser.get(user.id) ?? null;
    const status: DailyRowStatus = att
      ? att.checkOutAt
        ? "COMPLETE"
        : "WORKING"
      : (leaveType ?? "NO_CHECKIN");
    return {
      user,
      checkInAt: att?.checkInAt ?? null,
      checkOutAt: att?.checkOutAt ?? null,
      workMinutes: att
        ? (att.workMinutes ??
          (att.checkOutAt
            ? minutesBetween(att.checkInAt, att.checkOutAt)
            : null))
        : null,
      checkInPhotoUrl: availablePhotoUrl(att?.checkInPhotoUrl ?? null, att?.checkInAt ?? null),
      checkOutPhotoUrl: availablePhotoUrl(att?.checkOutPhotoUrl ?? null, att?.checkOutAt ?? null),
      leaveType,
      status,
      moneySummary: att ? summarizeDailyMoney(att.money) : null,
    };
  });

  const checkedIn = rows.filter((r) => r.checkInAt).length;
  const complete = rows.filter((r) => r.status === "COMPLETE").length;
  const totalMinutes = rows.reduce((sum, r) => sum + (r.workMinutes ?? 0), 0);

  return {
    date: dateISO,
    rows,
    totals: {
      total: rows.length,
      checkedIn,
      complete,
      notCheckedOut: checkedIn - complete,
      totalMinutes,
      averageMinutes: complete > 0 ? Math.round(totalMinutes / complete) : 0,
    },
  };
}

// รายเดือน: roster ทุกคน + สรุป attendance + นับวันลาที่คาบเกี่ยวเดือน
export async function getMonthlyReportOverview(
  month: number,
  year: number,
  filter: ReportUserFilter,
) {
  const range = monthRange(year, month);
  const roster = await getRoster(filter);
  const ids = roster.map((u) => u.id);

  const [attendances, leaves] = await Promise.all([
    ids.length === 0
      ? []
      : prisma.attendance.findMany({
          where: { userId: { in: ids }, workDate: range },
          select: {
            userId: true,
            checkInAt: true,
            checkOutAt: true,
            workMinutes: true,
          },
        }),
    ids.length === 0
      ? []
      : prisma.leave.findMany({
          where: {
            userId: { in: ids },
            startDate: { lt: range.lt },
            endDate: { gte: range.gte },
          },
          select: { userId: true, startDate: true, endDate: true },
        }),
  ]);

  const stats = new Map<
    string,
    { attendanceDays: number; completeDays: number; totalMinutes: number }
  >();
  for (const a of attendances) {
    const s = stats.get(a.userId) ?? {
      attendanceDays: 0,
      completeDays: 0,
      totalMinutes: 0,
    };
    s.attendanceDays++;
    if (a.checkOutAt) {
      s.completeDays++;
      s.totalMinutes +=
        a.workMinutes ?? minutesBetween(a.checkInAt, a.checkOutAt);
    }
    stats.set(a.userId, s);
  }

  // นับวันลาที่คาบเกี่ยวเดือนนี้ (startDate–endDate ตัดให้อยู่แค่ในเดือน)
  const leaveDays = new Map<string, number>();
  for (const l of leaves) {
    const start = l.startDate < range.gte ? range.gte : l.startDate;
    const end =
      l.endDate >= range.lt ? new Date(range.lt.getTime() - 1) : l.endDate;
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > 0)
      leaveDays.set(l.userId, (leaveDays.get(l.userId) ?? 0) + days);
  }

  const rows: MonthlyRow[] = roster.map((user) => {
    const s = stats.get(user.id) ?? {
      attendanceDays: 0,
      completeDays: 0,
      totalMinutes: 0,
    };
    return { user, ...s, leaveDays: leaveDays.get(user.id) ?? 0 };
  });

  const totalMinutes = rows.reduce((sum, r) => sum + r.totalMinutes, 0);
  const completeDays = rows.reduce((sum, r) => sum + r.completeDays, 0);

  return {
    month,
    year,
    rows,
    totals: {
      total: rows.length,
      totalMinutes,
      completeDays,
      averageMinutes:
        rows.length > 0 ? Math.round(totalMinutes / rows.length) : 0,
    },
  };
}

export type UserMonthDay = {
  day: number;
  workDateISO: string;
  isWeekend: boolean;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  workMinutes: number | null;
  leaveType: "SICK" | "PERSONAL" | "HOLIDAY" | null;
  moneySummary: DailyMoneySummary | null;
};

// รายละเอียดรายบุคคล: แถวรายวันทั้งเดือน (ลงเวลา + วันที่ลาโดยไม่มีลงเวลา)
export async function getUserMonthlyDetail(
  userId: string,
  month: number,
  year: number,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: "STUDENT" },
    select: userSelect,
  });
  if (!user) return null;

  const range = monthRange(year, month);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const [attendances, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId, workDate: range },
      select: {
        workDate: true,
        checkInAt: true,
        checkOutAt: true,
        workMinutes: true,
        checkInPhotoUrl: true,
        checkOutPhotoUrl: true,
        money: {
          select: { moneyType: true, direction: true, amount: true },
        },
      },
      orderBy: { workDate: "asc" },
    }),
    prisma.leave.findMany({
      where: {
        userId,
        startDate: { lt: range.lt },
        endDate: { gte: range.gte },
      },
      select: { type: true, startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const byDate = new Map(
    attendances.map((a) => [a.workDate.toISOString().slice(0, 10), a]),
  );

  // วันที่ลาที่อยู่ในเดือนนี้ (ใช้ทำกราฟ + แถวตาราง)
  const leaveByDate = new Map<string, "SICK" | "PERSONAL" | "HOLIDAY">();
  for (const l of leaves) {
    const start = l.startDate < range.gte ? range.gte : l.startDate;
    const end =
      l.endDate >= range.lt ? new Date(range.lt.getTime() - 1) : l.endDate;
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      leaveByDate.set(new Date(t).toISOString().slice(0, 10), l.type);
    }
  }

  const days: UserMonthDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const att = byDate.get(iso) ?? null;
    days.push({
      day: d,
      workDateISO: iso,
      isWeekend: [0, 6].includes(
        new Date(Date.UTC(year, month - 1, d)).getUTCDay(),
      ),
      checkInAt: att?.checkInAt ?? null,
      checkOutAt: att?.checkOutAt ?? null,
      workMinutes: att
        ? (att.workMinutes ??
          (att.checkOutAt
            ? minutesBetween(att.checkInAt, att.checkOutAt)
            : null))
        : null,
      leaveType: leaveByDate.get(iso) ?? null,
      moneySummary: att ? summarizeDailyMoney(att.money) : null,
    });
  }

  const attendanceDays = attendances.length;
  const completeDays = attendances.filter((a) => a.checkOutAt).length;
  const totalMinutes = days.reduce((sum, d) => sum + (d.workMinutes ?? 0), 0);
  const leaveDays = days.filter((d) => !d.checkInAt && d.leaveType).length;
  const leaveTypes = [...new Set(leaves.map((l) => l.type))];
  // ยอดใช้เงินรวมเดือนนี้ (นับเฉพาะวันที่สรุปยอดได้)
  const totalSpent = centsToAmount(
    days.reduce(
      (sum, d) =>
        sum + (d.moneySummary?.complete ? amountToCents(d.moneySummary.totalSpent) : 0),
      0,
    ),
  );

  return {
    user,
    month,
    year,
    daysInMonth,
    days,
    attendances: attendances.map((a) => ({
      workDateISO: a.workDate.toISOString().slice(0, 10),
      checkInAt: a.checkInAt,
      checkOutAt: a.checkOutAt,
      workMinutes:
        a.workMinutes ??
        (a.checkOutAt ? minutesBetween(a.checkInAt, a.checkOutAt) : null),
      checkInPhotoUrl: availablePhotoUrl(a.checkInPhotoUrl, a.checkInAt),
      checkOutPhotoUrl: availablePhotoUrl(a.checkOutPhotoUrl, a.checkOutAt),
    })),
    leaves: leaves.map((l) => ({
      type: l.type,
      startDateISO: l.startDate.toISOString().slice(0, 10),
      endDateISO: l.endDate.toISOString().slice(0, 10),
    })),
    totals: {
      attendanceDays,
      completeDays,
      totalMinutes,
      leaveDays,
      leaveTypes,
      totalSpent,
      averageMinutes:
        attendanceDays > 0 ? Math.round(totalMinutes / attendanceDays) : 0,
    },
  };
}
