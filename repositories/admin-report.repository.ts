import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { currentEnrollmentSelect, withEnrollmentView } from "@/repositories/enrollment-view";

function reportUserSelect(academicTermId?: string) {
  const enrollmentSelection = academicTermId
    ? {
        enrollments: {
          where: { academicTermId },
          take: 1,
          select: {
            academicTerm: { select: { academicYear: true, semester: true } },
            branch: { select: { name: true } },
            classGroup: { select: { programLevel: true, yearLevel: true, section: true } },
          },
        },
      }
    : currentEnrollmentSelect;
  return {
  id: true,
  firstName: true,
  lastName: true,
  studentId: true,
  employeeCode: true,
  ...enrollmentSelection,
  } as const;
}

export function listReportRoster(where: Prisma.UserWhereInput, academicTermId: string) {
  return prisma.user.findMany({
    where,
    select: reportUserSelect(academicTermId),
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  }).then((users) => users.map(withEnrollmentView));
}

export function listActiveReportShopCodes() {
  return prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    select: currentEnrollmentSelect,
  }).then((users) => [...new Set(users.flatMap((user) => user.enrollments[0]?.branch.name ?? []))]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name })));
}

export function listReportAcademicTerms() {
  return prisma.academicTerm.findMany({
    select: { id: true, academicYear: true, semester: true },
    orderBy: [{ academicYear: "desc" }, { semester: "desc" }],
  });
}

export function listReportShopCodesForTerm(academicTermId: string) {
  return prisma.branch.findMany({
    where: { enrollments: { some: { academicTermId, user: { role: "STUDENT", isActive: true } } } },
    select: { name: true },
    orderBy: { name: "asc" },
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

export function findReportStudent(userId: string, academicTermId?: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      role: "STUDENT",
      ...(academicTermId ? { enrollments: { some: { academicTermId } } } : {}),
    },
    select: reportUserSelect(academicTermId),
  }).then((user) => user ? withEnrollmentView(user) : null);
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
