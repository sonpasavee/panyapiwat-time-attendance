import { prisma } from "@/lib/db";

export function listMyMonthlyAttendance(
  userId: string,
  range: { gte: Date; lt: Date },
) {
  return prisma.attendance.findMany({
    where: { userId, workDate: range },
    select: { checkInAt: true, checkOutAt: true },
  });
}

export function listAdminMonthlyAttendance(
  range: { gte: Date; lt: Date },
  filter: { shopCode?: string; userId?: string },
) {
  return prisma.attendance.findMany({
    where: {
      workDate: range,
      ...(filter.shopCode ? { user: { shopCode: filter.shopCode } } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentId: true,
          employeeCode: true,
          shopCode: true,
        },
      },
    },
  });
}
