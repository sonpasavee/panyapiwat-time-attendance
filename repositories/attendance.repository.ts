import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { currentEnrollmentSelect, enrollmentSelectForTerm, withEnrollmentView } from "@/repositories/enrollment-view";

export function createAttendance(data: Prisma.AttendanceCreateArgs["data"]) {
  return prisma.attendance.create({
    data,
    include: { money: true },
  });
}

export function findAttendanceByUserAndDate(userId: string, workDate: Date) {
  return prisma.attendance.findUnique({
    where: { userId_workDate: { userId, workDate } },
  });
}

export function checkoutAttendance(
  id: string,
  data: Prisma.AttendanceUpdateManyMutationInput,
  createMoneyEntries: (
    attendanceId: string,
  ) => Prisma.MoneyEntryCreateManyInput[],
) {
  return prisma.$transaction(async (tx) => {
    const changed = await tx.attendance.updateMany({
      where: { id, checkOutAt: null },
      data,
    });

    if (changed.count !== 1) return null;

    await tx.moneyEntry.createMany({ data: createMoneyEntries(id) });

    return tx.attendance.findUniqueOrThrow({
      where: { id },
      include: { money: true },
    });
  });
}

export async function listMyAttendance(
  where: Prisma.AttendanceWhereInput,
  countWhere: Prisma.AttendanceWhereInput,
  skip: number,
  take: number,
) {
  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { money: true },
      orderBy: { workDate: "desc" },
      skip,
      take,
    }),
    prisma.attendance.count({ where: countWhere }),
  ]);
  return { items, total };
}

export function findAttendanceByUserAndDateWithMoney(
  userId: string,
  workDate: Date,
) {
  return prisma.attendance.findUnique({
    where: { userId_workDate: { userId, workDate } },
    include: { money: true },
  });
}

// รับกะที่ยังไม่เช็กเอาท์ ซึ่งอาจเริ่มเมื่อวานและเพิ่งข้ามเที่ยงคืน
export function findLatestOpenAttendance(userId: string, since: Date) {
  return prisma.attendance.findFirst({
    where: {
      userId,
      checkOutAt: null,
      checkInAt: { gte: since },
    },
    orderBy: { checkInAt: "desc" },
  });
}

export function findLatestOpenAttendanceWithMoney(userId: string, since: Date) {
  return prisma.attendance.findFirst({
    where: {
      userId,
      checkOutAt: null,
      checkInAt: { gte: since },
    },
    include: { money: true },
    orderBy: { checkInAt: "desc" },
  });
}

export function findAttendanceByIdAndUser(id: string, userId: string) {
  return prisma.attendance.findFirst({
    where: { id, userId },
    include: { money: true },
  });
}

export async function listAdminAttendance(
  where: Prisma.AttendanceWhereInput,
  skip: number,
  take: number,
  sort: "asc" | "desc",
  academicTermId?: string,
) {
  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        money: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            employeeCode: true,
            ...(academicTermId ? enrollmentSelectForTerm(academicTermId) : currentEnrollmentSelect),
          },
        },
      },
      orderBy: [{ workDate: sort }, { id: sort }],
      skip,
      take,
    }),
    prisma.attendance.count({ where }),
  ]);
  return {
    items: items.map((item) => ({ ...item, user: withEnrollmentView(item.user) })),
    total,
  };
}

export function countAttendance(where: Prisma.AttendanceWhereInput) {
  return prisma.attendance.count({ where });
}

export function countMonthlyAttendanceDays(range: {
  gte: Date;
  lt: Date;
}, academicTermId?: string) {
  return prisma.attendance.groupBy({
    by: ["userId"],
    where: {
      workDate: range,
      user: {
        role: "STUDENT",
        isActive: true,
        ...(academicTermId ? { enrollments: { some: { academicTermId } } } : {}),
      },
    },
    _count: { _all: true },
  });
}

export function findAdminAttendanceById(id: string, academicTermId?: string) {
  return prisma.attendance.findUnique({
    where: { id },
    include: {
      money: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentId: true,
          employeeCode: true,
          ...(academicTermId ? enrollmentSelectForTerm(academicTermId) : currentEnrollmentSelect),
        },
      },
    },
  }).then((item) => item ? { ...item, user: withEnrollmentView(item.user) } : null);
}

export async function listUserAttendance(
  userId: string,
  skip: number,
  take: number,
) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { money: true },
      orderBy: { workDate: "desc" },
      skip,
      take,
    }),
    prisma.attendance.count({ where }),
  ]);
  return { items, total };
}
