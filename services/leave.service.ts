import { ApiError } from "@/lib/api";
import {
  createLeave as createLeaveRecord,
  deleteMyLeave as deleteMyLeaveRecord,
  findLeaveById,
  findMyLeave as findMyLeaveRecord,
  listAdminLeaves as listAdminLeavesRecord,
  listMyLeaves as listMyLeavesRecord,
  updateMyLeave as updateMyLeaveRecord,
} from "@/repositories/leave.repository";

type LeaveInput = {
  leaveType?: "HOLIDAY" | "SICK" | "PERSONAL";
  type?: "HOLIDAY" | "SICK" | "PERSONAL";
  startDate: string;
  endDate: string;
  reason?: string | null;
};

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function createLeave(userId: string, input: LeaveInput) {
  return createLeaveRecord({
    userId,
    type: input.leaveType ?? input.type!,
    startDate: date(input.startDate),
    endDate: date(input.endDate),
    reason: input.reason ?? null,
  });
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
  const result = await updateMyLeaveRecord(id, userId, {
      type: input.leaveType ?? input.type!,
      startDate: date(input.startDate),
      endDate: date(input.endDate),
      reason: input.reason ?? null,
  });

  if (!result.count) {
    throw new ApiError(404, "Leave record not found", "NOT_FOUND");
  }

  return findLeaveById(id);
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
) {
  return listAdminLeavesRecord(where, skip, take);
}

export function buildAdminLeaveFilter(input: {
  type?: "HOLIDAY" | "SICK" | "PERSONAL";
  month?: number;
  year?: number;
  userId?: string;
  shopCode?: string;
}) {
  return {
    ...(input.type
      ? {
          type: input.type,
        }
      : {}),

    ...(input.month && input.year
      ? {
          AND: [
            { startDate: { lt: new Date(Date.UTC(input.year, input.month, 1)) } },
            { endDate: { gte: new Date(Date.UTC(input.year, input.month - 1, 1)) } },
          ],
        }
      : {}),

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
}
