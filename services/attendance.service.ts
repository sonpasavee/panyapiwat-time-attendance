import { ApiError } from "@/lib/api";
import type { Prisma } from "@/app/generated/prisma/client";
import { findUserIdsByLatestEnrollment } from "@/repositories/user.repository";
import {
  checkoutAttendance,
  countAttendance,
  countMonthlyAttendanceDays as countMonthlyAttendanceDaysRecord,
  createAttendance,
  findAdminAttendanceById,
  findAttendanceByIdAndUser,
  findAttendanceByUserAndDate,
  findAttendanceByUserAndDateWithMoney,
  findLatestOpenAttendance,
  findLatestOpenAttendanceWithMoney,
  listAdminAttendance as listAdminAttendanceRecords,
  listMyAttendance as listMyAttendanceRecords,
  listUserAttendance as listUserAttendanceRecords,
} from "@/repositories/attendance.repository";

import { bangkokWorkDate } from "@/lib/time";
import { hideExpiredAttendancePhotos } from "@/lib/attendance-image-retention";
import { deleteAttendanceImage, uploadAttendanceImage } from "@/lib/cloudinary";
import { findLeaveCoveringDate } from "@/repositories/leave.repository";

import { checkOutRuleError } from "@/services/attendance.logic";

type MoneyType = "CASH" | "TRUEMONEY";

type MoneyInput = {
  cashAmount?: string;
  truemoneyAmount?: string;
};

// อนุญาตให้กะที่เริ่มก่อนเที่ยงคืนเช็กเอาท์ต่อได้ไม่เกิน 24 ชั่วโมง
const MAX_OPEN_SHIFT_MS = 24 * 60 * 60 * 1000;

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
  const now = new Date();
  const workDate = bangkokWorkDate(now);

  const leave = await findLeaveCoveringDate(userId, workDate);
  if (leave) {
    throw new ApiError(
      409,
      "วันนี้มีวันหยุดหรือการลา ไม่สามารถเช็กอินได้",
      "ON_LEAVE",
    );
  }

  const openShift = await findLatestOpenAttendance(
    userId,
    new Date(now.getTime() - MAX_OPEN_SHIFT_MS),
  );
  if (openShift) {
    throw new ApiError(
      409,
      "กรุณาเช็กเอาท์กะที่ยังค้างอยู่ก่อนเช็กอินใหม่",
      "OPEN_ATTENDANCE_EXISTS",
    );
  }

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

    return await createAttendance({
      userId,
      workDate,
      checkInAt: now,
      checkInPhotoUrl: image.url,
      checkInImagePublicId: image.publicId,
      checkInNote: input.note,
      money: {
        create: moneyRows("IN", input),
      },
    });
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
    const now = new Date();
    const openShift = await findLatestOpenAttendance(
      userId,
      new Date(now.getTime() - MAX_OPEN_SHIFT_MS),
    );

    if (!openShift) {
      const today = await findAttendanceByUserAndDate(
        userId,
        bangkokWorkDate(now),
      );

      if (today?.checkOutAt) {
        throw new ApiError(
          409,
          "Already checked out today",
          "ALREADY_CHECKED_OUT",
        );
      }

      throw new ApiError(
        409,
        "Check in before checking out",
        "CHECK_IN_REQUIRED",
      );
    }

    const leave = await findLeaveCoveringDate(userId, openShift.workDate);
    if (leave) {
      throw new ApiError(
        409,
        "วันที่ของกะนี้มีวันหยุดหรือการลา ไม่สามารถเช็กเอาท์ได้",
        "ON_LEAVE",
      );
    }

    const checkoutError = checkOutRuleError(openShift, now);

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

    const attendance = await checkoutAttendance(
      openShift.id,
      {
        checkOutAt: now,
        checkOutPhotoUrl: image.url,
        checkOutImagePublicId: image.publicId,
        checkOutNote: input.note,
        workMinutes: Math.floor(
          (now.getTime() - openShift.checkInAt.getTime()) / 60000,
        ),
      },
      (attendanceId) =>
        moneyRows("OUT", input).map((row) => ({
          attendanceId,
          ...row,
        })),
    );
    if (!attendance) {
      throw new ApiError(
        409,
        "Already checked out today",
        "ALREADY_CHECKED_OUT",
      );
    }
    return attendance;
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
  const { items, total } = await listMyAttendanceRecords(
    where,
    {
      userId,
      ...(where.workDate ? { workDate: where.workDate } : {}),
    },
    skip,
    take,
  );

  return {
    items: items.map((item) => hideExpiredAttendancePhotos(item)),
    total,
  };
}

// ========================================
// Get Today's Attendance
// ========================================

export async function getTodayAttendance(userId: string) {
  const now = new Date();
  const attendance = await findAttendanceByUserAndDateWithMoney(
    userId,
    bangkokWorkDate(now),
  );

  if (attendance) return hideExpiredAttendancePhotos(attendance);

  // หลังเที่ยงคืน กะของเมื่อวานอาจยังเปิดอยู่ ต้องแสดงเพื่อให้เช็กเอาท์ต่อได้
  const openShift = await findLatestOpenAttendanceWithMoney(
    userId,
    new Date(now.getTime() - MAX_OPEN_SHIFT_MS),
  );
  return openShift ? hideExpiredAttendancePhotos(openShift) : null;
}

// ========================================
// Get My Attendance By ID
// ========================================

export async function getMyAttendanceById(userId: string, id: string) {
  const attendance = await findAttendanceByIdAndUser(id, userId);
  return attendance ? hideExpiredAttendancePhotos(attendance) : null;
}

// ========================================
// List Admin Attendance
// ========================================

export async function listAdminAttendance(
  where: Prisma.AttendanceWhereInput,
  skip: number,
  take: number,
  sort: "asc" | "desc" = "desc",
  academicTermId?: string,
) {
  const { items, total } = await listAdminAttendanceRecords(
    where,
    skip,
    take,
    sort,
    academicTermId,
  );

  return {
    items: items.map((item) => hideExpiredAttendancePhotos(item)),
    total,
  };
}

export async function getAdminAttendanceStats(
  where: Prisma.AttendanceWhereInput,
  today: Date,
) {
  const [total, complete, working, missed] = await Promise.all([
    countAttendance(where),
    countAttendance({ AND: [where, { checkOutAt: { not: null } }] }),
    countAttendance({
      AND: [where, { checkOutAt: null }, { workDate: { gte: today } }],
    }),
    countAttendance({
      AND: [where, { checkOutAt: null }, { workDate: { lt: today } }],
    }),
  ]);

  return { total, complete, working, missed };
}

export function countMonthlyAttendanceDays(
  range: { gte: Date; lt: Date },
  academicTermId?: string,
) {
  return countMonthlyAttendanceDaysRecord(range, academicTermId);
}

// ========================================
// Get Admin Attendance By ID
// ========================================

export async function getAdminAttendanceById(id: string, academicTermId?: string) {
  const attendance = await findAdminAttendanceById(id, academicTermId);
  return attendance ? hideExpiredAttendancePhotos(attendance) : null;
}

// ========================================
// List User Attendance
// ========================================

export async function listUserAttendance(
  userId: string,
  skip: number,
  take: number,
) {
  const { items, total } = await listUserAttendanceRecords(
    userId,
    skip,
    take,
  );

  return {
    items: items.map((item) => hideExpiredAttendancePhotos(item)),
    total,
  };
}

// ========================================
// Build Admin Attendance Filter
// ========================================

export async function buildAdminAttendanceFilter(input: {
  date?: string;
  monthRange?: {
    gte: Date;
    lt: Date;
  };
  shopCode?: string;
  academicTermId?: string;
  gradeLevel?: number;
  section?: string;
  status?: "checked-in" | "checked-out" | "complete" | "working" | "missed";
  today?: Date;
  query?: string;
}): Promise<Prisma.AttendanceWhereInput> {
  const conditions: Prisma.AttendanceWhereInput[] = [];

  if (input.date) {
    conditions.push({
      workDate: new Date(`${input.date}T00:00:00.000Z`),
    });
  } else if (input.monthRange) {
    conditions.push({ workDate: input.monthRange });
  }

  if (input.status === "checked-in") {
    conditions.push({ checkOutAt: null });
  } else if (input.status === "checked-out" || input.status === "complete") {
    conditions.push({ checkOutAt: { not: null } });
  } else if (input.status === "working") {
    conditions.push({ checkOutAt: null });
    if (input.today) conditions.push({ workDate: { gte: input.today } });
  } else if (input.status === "missed") {
    conditions.push({ checkOutAt: null });
    if (input.today) conditions.push({ workDate: { lt: input.today } });
  }

  const hasEnrollmentFilter = Boolean(input.shopCode || input.gradeLevel || input.section);
  const latestIds = !input.academicTermId && hasEnrollmentFilter
    ? await findUserIdsByLatestEnrollment({ branchName: input.shopCode, yearLevel: input.gradeLevel, section: input.section })
    : undefined;
  const userFilter: Prisma.UserScalarRelationFilter = {
    is: {
      ...(input.academicTermId
        ? { enrollments: { some: {
            academicTermId: input.academicTermId,
            ...(input.shopCode ? { branch: { name: input.shopCode } } : {}),
            ...(input.gradeLevel || input.section ? { classGroup: {
              ...(input.gradeLevel ? { yearLevel: input.gradeLevel } : {}),
              ...(input.section ? { section: input.section } : {}),
            } } : {}),
          } } }
        : latestIds ? { id: { in: latestIds } } : {}),
      ...(input.query
        ? {
            OR: [
              { studentId: { contains: input.query } },
              { employeeCode: { contains: input.query } },
              { firstName: { contains: input.query, mode: "insensitive" } },
              { lastName: { contains: input.query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  };

  conditions.push({ user: userFilter });

  return {
    AND: conditions,
  };
}
