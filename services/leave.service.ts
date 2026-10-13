import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

type LeaveInput = {
  leaveType?: "HOLIDAY" | "SICK" | "PERSONAL";
  type?: "HOLIDAY" | "SICK" | "PERSONAL";
  startDate: string;
  endDate: string;
  reason?: string | null;
};

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function createLeave(userId: string, input: LeaveInput) {
  return prisma.leave.create({
    data: {
      userId,
      type: input.leaveType ?? input.type!,
      startDate: date(input.startDate),
      endDate: date(input.endDate),
      reason: input.reason ?? null,
    },
  });
}

export async function listMyLeaves(userId: string, skip: number, take: number) {
  const where = { userId };

  const [items, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      orderBy: {
        startDate: "desc",
      },
      skip,
      take,
    }),

    prisma.leave.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

export async function getMyLeave(userId: string, id: string) {
  const leave = await prisma.leave.findFirst({
    where: {
      id,
      userId,
    },
  });

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
  const result = await prisma.leave.updateMany({
    where: {
      id,
      userId,
    },
    data: {
      type: input.leaveType ?? input.type!,
      startDate: date(input.startDate),
      endDate: date(input.endDate),
      reason: input.reason ?? null,
    },
  });

  if (!result.count) {
    throw new ApiError(404, "Leave record not found", "NOT_FOUND");
  }

  return prisma.leave.findUniqueOrThrow({
    where: { id },
  });
}

export async function deleteMyLeave(userId: string, id: string) {
  const result = await prisma.leave.deleteMany({
    where: {
      id,
      userId,
    },
  });

  if (!result.count) {
    throw new ApiError(404, "Leave record not found", "NOT_FOUND");
  }
}

export async function listAdminLeaves(
  where: object,
  skip: number,
  take: number,
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
            shopCode: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
      skip,
      take,
    }),

    prisma.leave.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
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
          startDate: {
            gte: new Date(Date.UTC(input.year, input.month - 1, 1)),
            lt: new Date(Date.UTC(input.year, input.month, 1)),
          },
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
