import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

export function createLeave(data: Prisma.LeaveCreateArgs["data"]) {
  return prisma.leave.create({ data });
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
  data: Prisma.LeaveUpdateManyMutationInput,
) {
  return prisma.leave.updateMany({ where: { id, userId }, data });
}

export function findLeaveById(id: string) {
  return prisma.leave.findUniqueOrThrow({ where: { id } });
}

export function deleteMyLeave(id: string, userId: string) {
  return prisma.leave.deleteMany({ where: { id, userId } });
}

export async function listAdminLeaves(
  where: Prisma.LeaveWhereInput,
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
      orderBy: { startDate: "desc" },
      skip,
      take,
    }),
    prisma.leave.count({ where }),
  ]);
  return { items, total };
}
