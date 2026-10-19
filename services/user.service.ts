
import { ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import {
  countUserAttendance,
  countUserLeaves,
  createUserByAdmin as createUserRecord,
  deleteUser,
  deleteUserSessions,
  findConflictingUserIdentifiers,
  findUserById,
  findUserProfile as findUserProfileRecord,
  findUserForDeletion,
  findUserForPasswordReset,
  listDistinctShopCodes,
  listUsers as listUserRecords,
  updatePasswordAndRevokeSessions,
  updateUserProfile as updateUserProfileRecord,
  withSerializableAdminUserTransaction,
  type AdminUserUpdateInput,
} from "@/repositories/user.repository";

// ============================================
// 1. Public User Fields
// ============================================

// ============================================
// 2. Get User Profile
// ============================================

export function getUserProfile(id: string) {
  return findUserProfileRecord(id);
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
  return updateUserProfileRecord(id, input);
}

// ============================================
// 4. List Users
// ============================================

export async function listUsers(
  where: Parameters<typeof listUserRecords>[0],
  skip: number,
  take: number,
) {
  return listUserRecords(where, skip, take);
}

// ============================================
// 5. Get User By ID
// ============================================

export async function getUserById(id: string) {
  const user = await findUserById(id);

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
  input: AdminUserUpdateInput,
  actorId: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await withSerializableAdminUserTransaction(
        async ({ findTarget, countOtherActiveAdmins, updateTarget }) => {
          const target = await findTarget(id);

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
            const otherActiveAdmins = await countOtherActiveAdmins(id);

            if (otherActiveAdmins === 0) {
              throw new ApiError(
                409,
                "At least one active administrator must remain",
                "LAST_ADMIN_PROTECTION",
              );
            }
          }

          return updateTarget(id, input);
        },
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
  const conflicting = await findConflictingUserIdentifiers(identifiers);
  if (conflicting) {
    throw new ApiError(
      409,
      "รหัสซ้ำกับบัญชีที่มีอยู่ในระบบ",
      "USER_CONFLICT",
    );
  }

  const initialPassword = employeeCode ?? studentId!;

  return createUserRecord({
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

  const existing = await findUserForDeletion(id);
  if (!existing) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  const [attendanceCount, leaveCount] = await Promise.all([
    countUserAttendance(id),
    countUserLeaves(id),
  ]);
  if (attendanceCount > 0 || leaveCount > 0) {
    throw new ApiError(
      409,
      "ไม่สามารถลบได้ เนื่องจากมีประวัติการลงเวลาหรือการลา",
      "USER_HAS_RECORDS",
    );
  }

  await deleteUserSessions(id);
  await deleteUser(id);

  return { id, deleted: true };
}

// ============================================
// 11. Reset User Password (POST /api/admin/users/[id]/reset-password)
// รีเซ็ตกลับเป็นรหัสเริ่มต้น (รหัสพนักงาน หรือรหัสนักศึกษา)
// ============================================

export async function resetUserPassword(id: string) {
  const user = await findUserForPasswordReset(id);
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  const temporaryPassword =
    user.employeeCode ?? user.studentId ?? randomBytes(6).toString("hex");

  const passwordHash = await hashPassword(temporaryPassword);
  const updated = await updatePasswordAndRevokeSessions(id, passwordHash);

  return { user: updated, temporaryPassword };
}

// ============================================
// 12. List Distinct Shop Codes (ตัวเลือก dropdown รหัสร้าน)
// ============================================

export async function listShopCodes() {
  const rows = await listDistinctShopCodes();
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
