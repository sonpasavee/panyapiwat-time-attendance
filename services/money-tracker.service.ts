import { prisma } from "@/lib/db";

import { monthRange } from "@/lib/time";
import {
  amountToCents,
  centsToAmount,
  summarizeDailyMoney,
  summarizeMoneyEntries,
  type DailyMoneySummary,
} from "@/services/money-tracker.logic";

export async function getMyMoneyReport(
  userId: string,
  month: number,
  year: number,
) {
  const entries = await prisma.moneyEntry.findMany({
    where: {
      attendance: {
        userId,
        workDate: monthRange(year, month),
      },
    },
    include: {
      attendance: {
        select: {
          workDate: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

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
  const attendances = await prisma.attendance.findMany({
    where: {
      userId,
      workDate: monthRange(year, month),
    },
    select: {
      workDate: true,
      money: {
        select: { moneyType: true, direction: true, amount: true },
      },
    },
    orderBy: { workDate: "desc" },
  });

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
  where: object,
  skip: number,
  take: number,
) {
  const [items, total] = await Promise.all([
    prisma.moneyEntry.findMany({
      where,
      include: {
        attendance: {
          select: {
            workDate: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true,
                shopCode: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take,
    }),

    prisma.moneyEntry.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
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
