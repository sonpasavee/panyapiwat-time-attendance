import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { currentEnrollmentSelect, enrollmentSelectForTerm, withEnrollmentView } from "@/repositories/enrollment-view";

export type LeaveWriteInput = {
  type: "HOLIDAY" | "SICK" | "PERSONAL";
  startDate: Date;
  endDate: Date;
  reason: string | null;
};

function findOverlappingLeave(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
  range: { startDate: Date; endDate: Date },
  excludeId?: string,
) {
  return db.leave.findFirst({
    where: {
      userId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startDate: { lte: range.endDate },
      endDate: { gte: range.startDate },
    },
    select: { id: true },
  });
}

function findAttendanceInRange(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
  range: { startDate: Date; endDate: Date },
) {
  return db.attendance.findFirst({
    where: {
      userId,
      workDate: { gte: range.startDate, lte: range.endDate },
    },
    select: { id: true },
  });
}

export function createLeave(
  userId: string,
  input: LeaveWriteInput,
) {
  return prisma.$transaction(async (tx) => {
    if (await findOverlappingLeave(tx, userId, input)) {
      return { kind: "leave_overlap" as const };
    }

    if (await findAttendanceInRange(tx, userId, input)) {
      return { kind: "attendance_exists" as const };
    }

    const leave = await tx.leave.create({
      data: { userId, ...input },
    });
    return { kind: "ok" as const, leave };
  }, { isolationLevel: "Serializable" });
}

export function findLeaveCoveringDate(userId: string, workDate: Date) {
  return prisma.leave.findFirst({
    where: {
      userId,
      startDate: { lte: workDate },
      endDate: { gte: workDate },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMyLeaves(
  userId: string,
  skip: number,
  take: number,
) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip,
      take,
    }),
    prisma.leave.count({ where }),
  ]);
  return { items, total };
}

export function findMyLeave(id: string, userId: string) {
  return prisma.leave.findFirst({ where: { id, userId } });
}

export function updateMyLeave(
  id: string,
  userId: string,
  input: LeaveWriteInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.leave.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return { kind: "not_found" as const };

    if (await findOverlappingLeave(tx, userId, input, id)) {
      return { kind: "leave_overlap" as const };
    }

    if (await findAttendanceInRange(tx, userId, input)) {
      return { kind: "attendance_exists" as const };
    }

    const leave = await tx.leave.update({
      where: { id },
      data: input,
    });
    return { kind: "ok" as const, leave };
  }, { isolationLevel: "Serializable" });
}

export function findLeaveById(id: string) {
  return prisma.leave.findUniqueOrThrow({ where: { id } });
}

export function deleteMyLeave(id: string, userId: string) {
  return prisma.leave.deleteMany({ where: { id, userId } });
}

export async function listAdminLeaveUserIds(where: Prisma.LeaveWhereInput) {
  const rows = await prisma.leave.findMany({
    where,
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((row) => row.userId);
}

export async function countAdminLeaveTypes(where: Prisma.LeaveWhereInput) {
  const rows = await prisma.leave.groupBy({
    by: ["type"],
    where,
    _count: { _all: true },
  });
  return rows.map((row) => ({ type: row.type, count: row._count._all }));
}

export async function listAdminLeaves(
  where: Prisma.LeaveWhereInput,
  skip: number,
  take: number,
  academicTermId?: string,
) {
  const [items, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentId: true,
            ...(academicTermId ? enrollmentSelectForTerm(academicTermId) : currentEnrollmentSelect),
          },
        },
      },
      orderBy: { startDate: "desc" },
      skip,
      take,
    }),
    prisma.leave.count({ where }),
  ]);
  return {
    items: items.map((item) => ({ ...item, user: withEnrollmentView(item.user) })),
    total,
  };
}
