
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { randomBytes } from "node:crypto";

// ============================================
// 1. Public User Fields
// ============================================

const publicUser = {
  id: true,
  username: true,
  role: true,
  firstName: true,
  lastName: true,
  studentId: true,
  employeeCode: true,
  shopCode: true,
  gradeLevel: true,
  yearLevel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ============================================
// 2. Get User Profile
// ============================================

export function getUserProfile(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: publicUser,
  });
}

// ============================================
// 3. Update User Profile
// ============================================

export function updateUserProfile(
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    gradeLevel?: number | null;
    shopCode?: string | null;
  },
) {
  return prisma.user.update({
    where: { id },

    data: {
      ...input,
      yearLevel: input.gradeLevel,
    },

    select: publicUser,
  });
}

// ============================================
// 4. List Users
// ============================================

export async function listUsers(
  where: object,
  skip: number,
  take: number,
) {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicUser,
      orderBy: {
        firstName: "asc",
      },
      skip,
      take,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    items,
    total,
  };
}

// ============================================
// 5. Get User By ID
// ============================================

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUser,
  });

  if (!user) {
    throw new ApiError(
      404,
      "User not found",
      "NOT_FOUND",
    );
  }

  return user;
}

// ============================================
// 6. Update User By Admin
// ============================================

export async function updateUserByAdmin(
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    gradeLevel?: number | null;
    shopCode?: string | null;
    employeeCode?: string | null;
    studentId?: string | null;
    isActive?: boolean;
    role?: "ADMIN" | "STUDENT";
  },
  actorId: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const target = await tx.user.findUnique({
            where: { id },
            select: { id: true, role: true, isActive: true },
          });

          if (!target) {
            throw new ApiError(404, "User not found", "NOT_FOUND");
          }

          if (actorId === id && input.role && input.role !== "ADMIN") {
            throw new ApiError(
              409,
              "Administrators cannot remove their own role",
              "LAST_ADMIN_PROTECTION",
            );
          }

          if (actorId === id && input.isActive === false) {
            throw new ApiError(
              409,
              "Administrators cannot deactivate their own account",
              "SELF_DEACTIVATION_PROTECTION",
            );
          }

          const nextRole = input.role ?? target.role;
          const nextIsActive = input.isActive ?? target.isActive;
          const removesActiveAdmin =
            target.role === "ADMIN" &&
            target.isActive &&
            (nextRole !== "ADMIN" || !nextIsActive);

          if (removesActiveAdmin) {
            const otherActiveAdmins = await tx.user.count({
              where: {
                id: { not: id },
                role: "ADMIN",
                isActive: true,
              },
            });

            if (otherActiveAdmins === 0) {
              throw new ApiError(
                409,
                "At least one active administrator must remain",
                "LAST_ADMIN_PROTECTION",
              );
            }
          }

          return tx.user.update({
            where: { id },
            data: {
              ...input,
              yearLevel: input.gradeLevel,
            },
            select: publicUser,
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      const isSerializationConflict =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034";

      if (isSerializationConflict && attempt < 2) continue;
      throw error;
    }
  }

  throw new ApiError(
    409,
    "Could not safely update administrator account; please retry",
    "ADMIN_UPDATE_CONFLICT",
  );
}

// ============================================
// 7. Change User Role
// ============================================

export function changeUserRole(
  id: string,
  role: "ADMIN" | "STUDENT",
  actorId: string,
) {
  return updateUserByAdmin(id, { role }, actorId).then(
    ({ id: userId, role: updatedRole, firstName, lastName }) => ({
      id: userId,
      role: updatedRole,
      firstName,
      lastName,
    }),
  );
}

// ============================================
// 9. Create User By Admin (POST /api/admin/users)
// ============================================

export async function createUserByAdmin(input: {
  firstName: string;
  lastName: string;
  studentId?: string | null;
  employeeCode?: string | null;
  shopCode?: string | null;
  gradeLevel?: number | null;
  role?: "ADMIN" | "STUDENT";
  isActive?: boolean;
}) {
  const role = input.role ?? "STUDENT";
  const studentId = input.studentId?.trim() || null;
  const employeeCode = input.employeeCode?.trim() || null;

  if (role === "STUDENT" && (!studentId || !employeeCode)) {
    throw new ApiError(
      400,
      "STUDENT requires studentId and employeeCode",
      "VALIDATION_ERROR",
    );
  }
  if (!studentId && !employeeCode) {
    throw new ApiError(
      400,
      "studentId หรือ employeeCode อย่างน้อยหนึ่งอย่างต้องมีค่า",
      "VALIDATION_ERROR",
    );
  }

  const username = studentId ?? employeeCode!;

  const identifiers = [username, studentId, employeeCode].filter(
    (value): value is string => value !== null,
  );
  const conflicting = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { in: identifiers } },
        { studentId: { in: identifiers } },
        { employeeCode: { in: identifiers } },
      ],
    },
    select: { id: true },
  });
  if (conflicting) {
    throw new ApiError(
      409,
      "รหัสซ้ำกับบัญชีที่มีอยู่ในระบบ",
      "USER_CONFLICT",
    );
  }

  const initialPassword = employeeCode ?? studentId!;

  return prisma.user.create({
    data: {
      username,
      studentId,
      employeeCode,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      shopCode: input.shopCode?.trim() || null,
      gradeLevel: input.gradeLevel ?? null,
      yearLevel: input.gradeLevel ?? null,
      passwordHash: await hashPassword(initialPassword),
      role,
      isActive: input.isActive ?? true,
    },
    select: publicUser,
  });
}

// ============================================
// 10. Delete User By Admin (DELETE /api/admin/users/[id])
// ============================================

export async function deleteUserByAdmin(id: string, actorId: string) {
  if (actorId === id) {
    throw new ApiError(
      409,
      "ไม่สามารถลบบัญชีของตนเองได้",
      "SELF_DELETE_PROTECTION",
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!existing) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  const [attendanceCount, leaveCount] = await Promise.all([
    prisma.attendance.count({ where: { userId: id } }),
    prisma.leave.count({ where: { userId: id } }),
  ]);
  if (attendanceCount > 0 || leaveCount > 0) {
    throw new ApiError(
      409,
      "ไม่สามารถลบได้ เนื่องจากมีประวัติการลงเวลาหรือการลา",
      "USER_HAS_RECORDS",
    );
  }

  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return { id, deleted: true };
}

// ============================================
// 11. Reset User Password (POST /api/admin/users/[id]/reset-password)
// รีเซ็ตกลับเป็นรหัสเริ่มต้น (รหัสพนักงาน หรือรหัสนักศึกษา)
// ============================================

export async function resetUserPassword(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      employeeCode: true,
    },
  });
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  const temporaryPassword =
    user.employeeCode ?? user.studentId ?? randomBytes(6).toString("hex");

  const passwordHash = await hashPassword(temporaryPassword);
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { passwordHash },
      select: publicUser,
    });
    await tx.session.deleteMany({ where: { userId: id } });
    return user;
  });

  return { user: updated, temporaryPassword };
}

// ============================================
// 12. List Distinct Shop Codes (ตัวเลือก dropdown รหัสร้าน)
// ============================================

export async function listShopCodes() {
  const rows = await prisma.user.findMany({
    where: { shopCode: { not: null } },
    select: { shopCode: true },
    distinct: ["shopCode"],
    orderBy: { shopCode: "asc" },
  });
  return rows
    .map((row) => row.shopCode?.trim() ?? "")
    .filter((code) => code.length > 0);
}

// ============================================
// 8. Build User Filter
// ============================================

export function buildUserFilter(input: {
  role?: "STUDENT" | "ADMIN";
  shopCode?: string;
  gradeLevel?: number;
  query?: string;
}) {
  return {
    ...(input.role
      ? { role: input.role }
      : {}),

    ...(input.shopCode
      ? { shopCode: input.shopCode }
      : {}),

    ...(input.gradeLevel
      ? { gradeLevel: input.gradeLevel }
      : {}),

    ...(input.query
      ? {
          OR: [
            {
              username: {
                contains: input.query,
                mode: "insensitive" as const,
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
          ],
        }
      : {}),
  };
}
