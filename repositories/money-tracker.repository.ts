import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

export function listMonthlyFinanceEntries(range: {
  gte: Date;
  lt: Date;
}) {
  return prisma.moneyEntry.findMany({
    where: {
      attendance: {
        user: { role: "STUDENT" },
        workDate: range,
      },
    },
    select: {
      attendanceId: true,
      direction: true,
      moneyType: true,
      amount: true,
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
    take: 20000,
  });
}

export function listMyMoneyEntries(
  userId: string,
  range: { gte: Date; lt: Date },
) {
  return prisma.moneyEntry.findMany({
    where: { attendance: { userId, workDate: range } },
    include: { attendance: { select: { workDate: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function listMyDailyMoneyAttendances(
  userId: string,
  range: { gte: Date; lt: Date },
) {
  return prisma.attendance.findMany({
    where: { userId, workDate: range },
    select: {
      workDate: true,
      money: {
        select: { moneyType: true, direction: true, amount: true },
      },
    },
    orderBy: { workDate: "desc" },
  });
}

export async function listAdminMoneyEntries(
  where: Prisma.MoneyEntryWhereInput,
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
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.moneyEntry.count({ where }),
  ]);
  return { items, total };
}

export function sumAdminMoneyEntries(where: Prisma.MoneyEntryWhereInput) {
  return prisma.moneyEntry.groupBy({
    by: ["direction"],
    where,
    _sum: { amount: true },
  });
}
