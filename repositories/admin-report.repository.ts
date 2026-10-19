import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

const reportUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  studentId: true,
  employeeCode: true,
  shopCode: true,
} as const;

export function listReportRoster(where: Prisma.UserWhereInput) {
  return prisma.user.findMany({
    where,
    select: reportUserSelect,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export function listActiveReportShopCodes() {
  return prisma.user.findMany({
    where: { role: "STUDENT", isActive: true, shopCode: { not: null } },
    select: { shopCode: true },
    distinct: ["shopCode"],
    orderBy: { shopCode: "asc" },
  });
}

export function listDailyReportAttendance(ids: string[], workDate: Date) {
  return prisma.attendance.findMany({
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
  });
}

export function listDailyReportLeaves(ids: string[], workDate: Date) {
  return prisma.leave.findMany({
    where: {
      userId: { in: ids },
      startDate: { lte: workDate },
      endDate: { gte: workDate },
    },
    select: { userId: true, type: true },
  });
}

export function listMonthlyReportAttendance(
  ids: string[],
  range: { gte: Date; lt: Date },
) {
  return prisma.attendance.findMany({
    where: { userId: { in: ids }, workDate: range },
    select: {
      userId: true,
      checkInAt: true,
      checkOutAt: true,
      workMinutes: true,
    },
  });
}

export function listMonthlyReportLeaves(
  ids: string[],
  range: { gte: Date; lt: Date },
) {
  return prisma.leave.findMany({
    where: {
      userId: { in: ids },
      startDate: { lt: range.lt },
      endDate: { gte: range.gte },
    },
    select: { userId: true, startDate: true, endDate: true },
  });
}

export function findReportStudent(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, role: "STUDENT" },
    select: reportUserSelect,
  });
}

export function listUserMonthlyDetailAttendance(
  userId: string,
  range: { gte: Date; lt: Date },
) {
  return prisma.attendance.findMany({
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
  });
}

export function listUserMonthlyDetailLeaves(
  userId: string,
  range: { gte: Date; lt: Date },
) {
  return prisma.leave.findMany({
    where: {
      userId,
      startDate: { lt: range.lt },
      endDate: { gte: range.gte },
    },
    select: { type: true, startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
  });
}
