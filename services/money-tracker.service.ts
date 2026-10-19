import { monthRange } from "@/lib/time";
import {
  listAdminMoneyEntries as listAdminMoneyEntriesRecord,
  listMonthlyFinanceEntries,
  listMyDailyMoneyAttendances,
  listMyMoneyEntries,
  sumAdminMoneyEntries as sumAdminMoneyEntriesRecord,
} from "@/repositories/money-tracker.repository";
import {
  amountToCents,
  centsToAmount,
  summarizeDailyMoney,
  summarizeMoneyEntries,
  type DailyMoneySummary,
} from "@/services/money-tracker.logic";

export type FinanceUserRow = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    shopCode: string | null;
  };
  inCash: string;
  inTrue: string;
  inTotal: string;
  outCash: string;
  outTrue: string;
  outTotal: string;
  spentCash: string;
  spentTrue: string;
  spentTotal: string;
  completeDays: number;
  incompleteDays: number;
};

export type FinanceDayRow = {
  dateISO: string;
  students: number;
  inCash: string;
  inTrue: string;
  inTotal: string;
  outCash: string;
  outTrue: string;
  outTotal: string;
  spentCash: string;
  spentTrue: string;
  spentTotal: string;
};

// สรุปการเงินรายเดือนทั้งระบบ (หน้า /admin/finance)
// - ใช้ไปรวมนับเฉพาะวันที่ข้อมูลครบ (มีทั้ง IN และ OUT อย่างน้อยหนึ่งประเภท)
// - ช่องที่เว้นว่างตอนกรอก = ไม่มีแถว สูตรถือเป็น 0
export async function getMonthlyFinance(month: number, year: number) {
  const entries = await listMonthlyFinanceEntries(monthRange(year, month));

  // จับกลุ่มตาม attendance (1 วันของ 1 คน) แล้วสรุป IN−OUT
  const byAttendance = new Map<
    string,
    {
      user: (typeof entries)[number]["attendance"]["user"];
      dateISO: string;
      entries: Array<{
        moneyType: "CASH" | "TRUEMONEY";
        direction: "IN" | "OUT";
        amount: { toString(): string };
      }>;
    }
  >();
  for (const e of entries) {
    const key = e.attendanceId;
    let group = byAttendance.get(key);
    if (!group) {
      group = {
        user: e.attendance.user,
        dateISO: e.attendance.workDate.toISOString().slice(0, 10),
        entries: [],
      };
      byAttendance.set(key, group);
    }
    group.entries.push({
      moneyType: e.moneyType,
      direction: e.direction,
      amount: { toString: () => String(e.amount) },
    });
  }

  const users = new Map<string, FinanceUserRow & { user: FinanceUserRow["user"] }>();

  type DayAcc = {
    students: Set<string>;
    inCash: number;
    inTrue: number;
    outCash: number;
    outTrue: number;
    spentCash: number;
    spentTrue: number;
  };
  const days = new Map<string, DayAcc>();

  for (const group of byAttendance.values()) {
    const summary = summarizeDailyMoney(group.entries);
    let row = users.get(group.user.id);
    if (!row) {
      row = {
        user: group.user,
        inCash: "0.00",
        inTrue: "0.00",
        inTotal: "0.00",
        outCash: "0.00",
        outTrue: "0.00",
        outTotal: "0.00",
        spentCash: "0.00",
        spentTrue: "0.00",
        spentTotal: "0.00",
        completeDays: 0,
        incompleteDays: 0,
      };
      users.set(group.user.id, row);
    }
    const add = (field: "inCash" | "inTrue" | "outCash" | "outTrue" | "spentCash" | "spentTrue", v: string) => {
      row[field] = centsToAmount(amountToCents(row[field]) + amountToCents(v));
    };
    add("inCash", summary.CASH.in);
    add("inTrue", summary.TRUEMONEY.in);
    add("outCash", summary.CASH.out);
    add("outTrue", summary.TRUEMONEY.out);
    if (summary.complete) {
      row.completeDays += 1;
      add("spentCash", summary.CASH.spent);
      add("spentTrue", summary.TRUEMONEY.spent);
    } else {
      row.incompleteDays += 1;
    }

    let day = days.get(group.dateISO);
    if (!day) {
      day = {
        students: new Set<string>(),
        inCash: 0,
        inTrue: 0,
        outCash: 0,
        outTrue: 0,
        spentCash: 0,
        spentTrue: 0,
      };
      days.set(group.dateISO, day);
    }
    day.students.add(group.user.id);
    day.inCash += amountToCents(summary.CASH.in);
    day.inTrue += amountToCents(summary.TRUEMONEY.in);
    day.outCash += amountToCents(summary.CASH.out);
    day.outTrue += amountToCents(summary.TRUEMONEY.out);
    if (summary.complete) {
      day.spentCash += amountToCents(summary.CASH.spent);
      day.spentTrue += amountToCents(summary.TRUEMONEY.spent);
    }
  }

  const userRows: FinanceUserRow[] = [...users.values()].map((row) => ({
    ...row,
    inTotal: centsToAmount(amountToCents(row.inCash) + amountToCents(row.inTrue)),
    outTotal: centsToAmount(amountToCents(row.outCash) + amountToCents(row.outTrue)),
    spentTotal: centsToAmount(amountToCents(row.spentCash) + amountToCents(row.spentTrue)),
  }));
  userRows.sort((a, b) =>
    `${a.user.firstName} ${a.user.lastName}`.localeCompare(
      `${b.user.firstName} ${b.user.lastName}`,
      "th",
    ),
  );

  const dayRows: FinanceDayRow[] = [...days.entries()]
    .map(([dateISO, d]) => ({
      dateISO,
      students: d.students.size,
      inCash: centsToAmount(d.inCash),
      inTrue: centsToAmount(d.inTrue),
      inTotal: centsToAmount(d.inCash + d.inTrue),
      outCash: centsToAmount(d.outCash),
      outTrue: centsToAmount(d.outTrue),
      outTotal: centsToAmount(d.outCash + d.outTrue),
      spentCash: centsToAmount(d.spentCash),
      spentTrue: centsToAmount(d.spentTrue),
      spentTotal: centsToAmount(d.spentCash + d.spentTrue),
    }))
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));

  return { users: userRows, days: dayRows };
}

export async function getMyMoneyReport(
  userId: string,
  month: number,
  year: number,
) {
  const entries = await listMyMoneyEntries(
    userId,
    monthRange(year, month),
  );

  const totals = summarizeMoneyEntries(entries);

  return {
    month,
    year,
    entries,
    totals: {
      ...totals,
      note: "Recorded personal money movements; may differ from actual wallet balances",
    },
  };
}

export type DailyMoneyDay = {
  dateISO: string;
  summary: DailyMoneySummary;
  // ยอดรวม 2 ประเภท (เอาเข้า / คงเหลือ)
  inTotal: string;
  outTotal: string;
  // มีแถว OUT อย่างน้อยหนึ่งแถวหรือไม่ (ไม่มี = ยังไม่ได้กรอกคงเหลือ)
  hasOut: boolean;
};

// สรุปรายวันของเดือน: 1 แถวต่อวันที่เช็กอิน (ใหม่ไปเก่า) + ยอดรวมเดือน
// - ช่องที่เว้นว่าง = ไม่มีแถวบันทึก สูตรถือเป็น 0
// - วันไม่ครบ (ไม่มีทั้ง IN+OUT อย่างน้อยหนึ่งประเภท) = ข้อมูลไม่ครบ ไม่นับยอดใช้รวม
// - OUT > IN = ยอมให้บันทึก ใช้ไปติดลบ = ได้เงินเพิ่มระหว่างวัน
export async function getMyDailyMoney(
  userId: string,
  month: number,
  year: number,
) {
  const attendances = await listMyDailyMoneyAttendances(
    userId,
    monthRange(year, month),
  );

  const days: DailyMoneyDay[] = attendances.map((att) => {
    const summary = summarizeDailyMoney(att.money);
    const hasOut = att.money.some((e) => e.direction === "OUT");
    return {
      dateISO: att.workDate.toISOString().slice(0, 10),
      summary,
      inTotal: centsToAmount(
        amountToCents(summary.CASH.in) + amountToCents(summary.TRUEMONEY.in),
      ),
      outTotal: centsToAmount(
        amountToCents(summary.CASH.out) + amountToCents(summary.TRUEMONEY.out),
      ),
      hasOut,
    };
  });

  let inCents = 0;
  let spentCents = 0;
  let completeDays = 0;
  for (const day of days) {
    inCents += amountToCents(day.inTotal);
    if (day.summary.complete) {
      completeDays += 1;
      spentCents += amountToCents(day.summary.totalSpent);
    }
  }

  return {
    month,
    year,
    days,
    stats: {
      totalIn: centsToAmount(inCents),
      // ใช้ไปรวมเดือนนี้ — นับเฉพาะวันที่ข้อมูลครบ
      totalSpent: centsToAmount(spentCents),
      completeDays,
      totalDays: days.length,
    },
  };
}

export async function listAdminMoneyEntries(
  where: Parameters<typeof listAdminMoneyEntriesRecord>[0],
  skip: number,
  take: number,
) {
  return listAdminMoneyEntriesRecord(where, skip, take);
}

export async function sumAdminMoneyEntries(
  where: Parameters<typeof sumAdminMoneyEntriesRecord>[0],
) {
  const totals = await sumAdminMoneyEntriesRecord(where);

  return totals.map((row) => ({
    direction: row.direction,
    amount: row._sum.amount?.toString() ?? "0",
  }));
}

export function buildAdminMoneyFilter(
  month: number,
  year: number,
  input: {
    userId?: string;
    shopCode?: string;
  },
) {
  const attendanceFilter = {
    workDate: monthRange(year, month),

    ...(input.userId
      ? {
          userId: input.userId,
        }
      : {}),

    ...(input.shopCode
      ? {
          user: {
            shopCode: input.shopCode,
          },
        }
      : {}),
  };

  return {
    attendance: attendanceFilter,
  };
}
