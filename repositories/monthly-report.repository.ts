import { prisma } from "@/lib/db";
import { currentEnrollmentSelect, enrollmentSelectForTerm, withEnrollmentView } from "@/repositories/enrollment-view";
import { findUserIdsByLatestEnrollment } from "@/repositories/user.repository";

export function listMyMonthlyAttendance(
  userId: string,
  range: { gte: Date; lt: Date },
) {
  return prisma.attendance.findMany({
    where: { userId, workDate: range },
    select: { checkInAt: true, checkOutAt: true },
  });
}

export async function listAdminMonthlyAttendance(
  range: { gte: Date; lt: Date },
  filter: { shopCode?: string; userId?: string; academicTermId?: string },
) {
  const latestIds = !filter.academicTermId && filter.shopCode
    ? await findUserIdsByLatestEnrollment({ branchName: filter.shopCode })
    : undefined;
  return prisma.attendance.findMany({
    where: {
      workDate: range,
      ...(filter.academicTermId
        ? { user: { enrollments: { some: { academicTermId: filter.academicTermId, ...(filter.shopCode ? { branch: { name: filter.shopCode } } : {}) } } } }
        : latestIds ? { userId: { in: latestIds } } : {}),
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
          ...(filter.academicTermId ? enrollmentSelectForTerm(filter.academicTermId) : currentEnrollmentSelect),
        },
      },
    },
  }).then((items) => items.map((item) => ({ ...item, user: withEnrollmentView(item.user) })));
}
