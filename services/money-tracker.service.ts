import { prisma } from "@/lib/db";

import { monthRange } from "@/lib/time";
import { summarizeMoneyEntries } from "@/services/money-tracker.logic";

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
