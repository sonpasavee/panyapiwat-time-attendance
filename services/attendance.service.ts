import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

import { bangkokWorkDate } from "@/lib/time";
import { deleteAttendanceImage, uploadAttendanceImage } from "@/lib/cloudinary";

import { checkOutRuleError } from "@/services/attendance.logic";

type MoneyType = "CASH" | "TRUEMONEY";

type MoneyInput = {
  cashAmount?: string;
  truemoneyAmount?: string;
};

function moneyRows(direction: "IN" | "OUT", input: MoneyInput) {
  const rows = [
    ...(input.cashAmount
      ? [{ direction, amount: input.cashAmount, moneyType: "CASH" as MoneyType }]
      : []),
    ...(input.truemoneyAmount
      ? [{ direction, amount: input.truemoneyAmount, moneyType: "TRUEMONEY" as MoneyType }]
      : []),
  ];

  if (rows.length === 0) {
    throw new ApiError(
      400,
      "กรุณากรอกเงินสดหรือ TrueMoney อย่างน้อยหนึ่งช่อง",
      "VALIDATION_ERROR",
    );
  }

  return rows;
}

// ========================================
// Check In
// ========================================

export async function checkIn(
  userId: string,
  input: {
    image: File;
    note?: string;
    cashAmount?: string;
    truemoneyAmount?: string;
  },
) {
  let image:
    | {
        url: string;
        publicId: string;
      }
    | undefined;

  try {
    image = await uploadAttendanceImage(
      input.image,
      `attendance/${userId}/check-in`,
    );

    const now = new Date();

    return await prisma.$transaction((tx) =>
      tx.attendance.create({
        data: {
          userId,
          workDate: bangkokWorkDate(now),
          checkInAt: now,
          checkInPhotoUrl: image!.url,
          checkInImagePublicId: image!.publicId,
          checkInNote: input.note,

          money: {
            create: moneyRows("IN", input),
          },
        },
        include: {
          money: true,
        },
      }),
    );
  } catch (error) {
    if (image) {
      await deleteAttendanceImage(image.publicId).catch(() => undefined);
    }

    throw error;
  }
}

// ========================================
// Check Out
// ========================================

export async function checkOut(
  userId: string,
  input: {
    image: File;
    note?: string;
    cashAmount?: string;
    truemoneyAmount?: string;
  },
) {
  let image:
    | {
        url: string;
        publicId: string;
      }
    | undefined;

  try {
    const workDate = bangkokWorkDate();

    const existing = await prisma.attendance.findUnique({
      where: {
        userId_workDate: {
          userId,
          workDate,
        },
      },
    });

    if (!existing) {
      throw new ApiError(
        409,
        "Check in before checking out",
        "CHECK_IN_REQUIRED",
      );
    }

    const now = new Date();

    const checkoutError = checkOutRuleError(existing, now);

    if (checkoutError === "CHECK_IN_REQUIRED") {
      throw new ApiError(409, "Check in before checking out", checkoutError);
    }

    if (checkoutError === "ALREADY_CHECKED_OUT") {
      throw new ApiError(409, "Already checked out today", checkoutError);
    }

    if (checkoutError === "INVALID_TIME_ORDER") {
      throw new ApiError(
        409,
        "Check-out cannot be before check-in",
        checkoutError,
      );
    }

    image = await uploadAttendanceImage(
      input.image,
      `attendance/${userId}/check-out`,
    );

    return await prisma.$transaction(async (tx) => {
      const changed = await tx.attendance.updateMany({
        where: {
          id: existing.id,
          checkOutAt: null,
        },
        data: {
          checkOutAt: now,
          checkOutPhotoUrl: image!.url,
          checkOutImagePublicId: image!.publicId,
          checkOutNote: input.note,
          workMinutes: Math.floor(
            (now.getTime() - existing.checkInAt.getTime()) / 60000,
          ),
        },
      });

      if (changed.count !== 1) {
        throw new ApiError(
          409,
          "Already checked out today",
          "ALREADY_CHECKED_OUT",
        );
      }

      await tx.moneyEntry.createMany({
        data: moneyRows("OUT", input).map((row) => ({
          attendanceId: existing.id,
          ...row,
        })),
      });

      return tx.attendance.findUniqueOrThrow({
        where: {
          id: existing.id,
        },
        include: {
          money: true,
        },
      });
    });
  } catch (error) {
    if (image) {
      await deleteAttendanceImage(image.publicId).catch(() => undefined);
    }

    throw error;
  }
}

// ========================================
// List My Attendance
// ========================================

export async function listMyAttendance(
  userId: string,
  where: {
    userId: string;
    workDate?: {
      gte: Date;
      lt: Date;
    };
  },
  skip: number,
  take: number,
) {
  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        money: true,
      },
      orderBy: {
        workDate: "desc",
      },
      skip,
      take,
    }),

    prisma.attendance.count({
      where: {
        userId,
        ...(where.workDate
          ? {
              workDate: where.workDate,
            }
          : {}),
      },
    }),
  ]);

  return {
    items,
    total,
  };
}

// ========================================
// Get Today's Attendance
// ========================================

export function getTodayAttendance(userId: string) {
  return prisma.attendance.findUnique({
    where: {
      userId_workDate: {
        userId,
        workDate: bangkokWorkDate(),
      },
    },
    include: {
      money: true,
    },
  });
}

// ========================================
// Get My Attendance By ID
// ========================================

export function getMyAttendanceById(userId: string, id: string) {
  return prisma.attendance.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      money: true,
    },
  });
}

// ========================================
// List Admin Attendance
// ========================================

export async function listAdminAttendance(
  where: object,
  skip: number,
  take: number,
  sort: "asc" | "desc" = "desc",
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
            shopCode: true,
          },
        },
      },
      orderBy: {
        workDate: sort,
      },
      skip,
      take,
    }),

    prisma.attendance.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

// ========================================
// Get Admin Attendance By ID
// ========================================

export function getAdminAttendanceById(id: string) {
  return prisma.attendance.findUnique({
    where: {
      id,
    },
    include: {
      money: true,
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

// ========================================
// List User Attendance
// ========================================

export async function listUserAttendance(
  userId: string,
  skip: number,
  take: number,
) {
  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        userId,
      },
      include: {
        money: true,
      },
      orderBy: {
        workDate: "desc",
      },
      skip,
      take,
    }),

    prisma.attendance.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    items,
    total,
  };
}

// ========================================
// Build Admin Attendance Filter
// ========================================

export function buildAdminAttendanceFilter(input: {
  date?: string;
  monthRange?: {
    gte: Date;
    lt: Date;
  };
  shopCode?: string;
  status?: string;
  query?: string;
}) {
  return {
    ...(input.date
      ? {
          workDate: new Date(`${input.date}T00:00:00.000Z`),
        }
      : input.monthRange
        ? {
            workDate: input.monthRange,
          }
        : {}),

    ...(input.status === "checked-in"
      ? {
          checkOutAt: null,
        }
      : input.status === "checked-out"
        ? {
            checkOutAt: {
              not: null,
            },
          }
        : {}),

    user: {
      ...(input.shopCode
        ? {
            shopCode: input.shopCode,
          }
        : {}),

      ...(input.query
        ? {
            OR: [
              {
                studentId: {
                  contains: input.query,
                },
              },
              {
                employeeCode: {
                  contains: input.query,
                },
              },
              {
                firstName: {
                  contains: input.query,
                  mode: "insensitive" as const,
                },
              },
              {
                lastName: {
                  contains: input.query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    },
  };
}
