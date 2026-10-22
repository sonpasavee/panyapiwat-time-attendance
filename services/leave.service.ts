import { ApiError } from "@/lib/api";
import { bangkokWorkDate } from "@/lib/time";
import type { Prisma } from "@/app/generated/prisma/client";
import { findUserIdsByLatestEnrollment } from "@/repositories/user.repository";
import {
  countAdminLeaveTypes,
  createLeave as createLeaveRecord,
  deleteMyLeave as deleteMyLeaveRecord,
  findLeaveCoveringDate,
  findMyLeave as findMyLeaveRecord,
  listAdminLeaveUserIds as listAdminLeaveUserIdsRecord,
  listAdminLeaves as listAdminLeavesRecord,
  listMyLeaves as listMyLeavesRecord,
  updateMyLeave as updateMyLeaveRecord,
} from "@/repositories/leave.repository";
import { leaveRangeError } from "@/services/leave.logic";

type LeaveInput = {
  leaveType?: "HOLIDAY" | "SICK" | "PERSONAL";
  type?: "HOLIDAY" | "SICK" | "PERSONAL";
  startDate: string;
  endDate: string;
  reason?: string | null;
};

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

// กันชนกันตอนสร้าง/แก้ไขพร้อมกัน: PostgreSQL อาจ abort transaction แบบ Serializable
async function withLeaveTransactionRetry<T>(operation: () => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: unknown }).code
          : undefined;
      if (code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }

  throw new ApiError(
    409,
    "มีรายการลาหรือวันหยุดถูกบันทึกพร้อมกัน กรุณาลองใหม่อีกครั้ง",
    "LEAVE_CONFLICT",
  );
}

function validateLeaveDates(input: LeaveInput) {
  const startDate = date(input.startDate);
  const endDate = date(input.endDate);
  const error = leaveRangeError({ startDate, endDate }, bangkokWorkDate());

  if (error === "INVALID_LEAVE_RANGE") {
    throw new ApiError(
      400,
      "ถึงวันที่ต้องไม่ก่อนวันที่เริ่มลา",
      "VALIDATION_ERROR",
    );
  }

  if (error === "PAST_LEAVE_NOT_ALLOWED") {
    throw new ApiError(
      400,
      "ไม่สามารถลาหรือหยุดย้อนหลังได้",
      "PAST_LEAVE_NOT_ALLOWED",
    );
  }

  return { startDate, endDate };
}

function leaveConflictError(kind: "leave_overlap" | "attendance_exists") {
  if (kind === "leave_overlap") {
    return new ApiError(
      409,
      "ช่วงวันที่นี้ทับกับรายการลาหรือวันหยุดที่มีอยู่แล้ว",
      "LEAVE_OVERLAP",
    );
  }

  return new ApiError(
    409,
    "ช่วงวันที่นี้มีการลงเวลาทำงานอยู่แล้ว ไม่สามารถลาหรือหยุดทับได้",
    "ATTENDANCE_EXISTS",
  );
}

export async function createLeave(userId: string, input: LeaveInput) {
  const { startDate, endDate } = validateLeaveDates(input);
  const result = await withLeaveTransactionRetry(() =>
    createLeaveRecord(userId, {
      type: input.leaveType ?? input.type!,
      startDate,
      endDate,
      reason: input.reason ?? null,
    }),
  );

  if (result.kind !== "ok") {
    throw leaveConflictError(result.kind);
  }

  return result.leave;
}

export function getLeaveForDate(userId: string, workDate: Date) {
  return findLeaveCoveringDate(userId, workDate);
}

export async function listMyLeaves(userId: string, skip: number, take: number) {
  return listMyLeavesRecord(userId, skip, take);
}

export async function getMyLeave(userId: string, id: string) {
  const leave = await findMyLeaveRecord(id, userId);

  if (!leave) {
    throw new ApiError(404, "Leave record not found", "NOT_FOUND");
  }

  return leave;
}

export async function updateMyLeave(
  userId: string,
  id: string,
  input: LeaveInput,
) {
  const { startDate, endDate } = validateLeaveDates(input);
  const result = await withLeaveTransactionRetry(() =>
    updateMyLeaveRecord(id, userId, {
      type: input.leaveType ?? input.type!,
      startDate,
      endDate,
      reason: input.reason ?? null,
    }),
  );

  if (result.kind === "not_found") {
    throw new ApiError(404, "Leave record not found", "NOT_FOUND");
  }

  if (result.kind !== "ok") {
    throw leaveConflictError(result.kind);
  }

  return result.leave;
}

export async function deleteMyLeave(userId: string, id: string) {
  const result = await deleteMyLeaveRecord(id, userId);

  if (!result.count) {
    throw new ApiError(404, "Leave record not found", "NOT_FOUND");
  }
}

export async function listAdminLeaves(
  where: Parameters<typeof listAdminLeavesRecord>[0],
  skip: number,
  take: number,
  academicTermId?: string,
) {
  return listAdminLeavesRecord(where, skip, take, academicTermId);
}

export function listAdminLeaveUserIds(where: Prisma.LeaveWhereInput) {
  return listAdminLeaveUserIdsRecord(where);
}

export function listAdminLeaveTypeCounts(where: Prisma.LeaveWhereInput) {
  return countAdminLeaveTypes(where);
}

export async function buildAdminLeaveFilter(input: {
  type?: "HOLIDAY" | "SICK" | "PERSONAL";
  month?: number;
  year?: number;
  userId?: string;
  shopCode?: string;
  academicTermId?: string;
  gradeLevel?: number;
  section?: string;
  q?: string;
}) {
  const hasEnrollmentFilter = Boolean(input.shopCode || input.gradeLevel || input.section);
  const latestIds = !input.academicTermId && hasEnrollmentFilter
    ? await findUserIdsByLatestEnrollment({ branchName: input.shopCode, yearLevel: input.gradeLevel, section: input.section })
    : undefined;

  const userConditions: Prisma.UserWhereInput = {};
  if (input.academicTermId) {
    userConditions.enrollments = {
      some: {
        academicTermId: input.academicTermId,
        ...(input.shopCode ? { branch: { name: input.shopCode } } : {}),
        ...(input.gradeLevel || input.section ? { classGroup: {
          ...(input.gradeLevel ? { yearLevel: input.gradeLevel } : {}),
          ...(input.section ? { section: input.section } : {}),
        } } : {}),
      },
    };
  } else if (hasEnrollmentFilter) {
    userConditions.id = { in: latestIds ?? [] };
  }
  if (input.q) {
    userConditions.OR = [
      { firstName: { contains: input.q, mode: "insensitive" } },
      { lastName: { contains: input.q, mode: "insensitive" } },
      { studentId: { contains: input.q, mode: "insensitive" } },
    ];
  }

  return {
    ...(input.type ? { type: input.type } : {}),

    ...(input.month && input.year
      ? {
          AND: [
            { startDate: { lt: new Date(Date.UTC(input.year, input.month, 1)) } },
            { endDate: { gte: new Date(Date.UTC(input.year, input.month - 1, 1)) } },
          ],
        }
      : {}),

    ...(input.userId ? { userId: input.userId } : {}),

    ...(Object.keys(userConditions).length > 0 ? { user: userConditions } : {}),
  };
}
