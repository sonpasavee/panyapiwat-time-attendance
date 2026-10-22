
import { ApiError } from "@/lib/api";
import type { Prisma } from "@/app/generated/prisma/client";
import { hashPassword } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import {
  countUserAttendance,
  countUserLeaves,
  createUserByAdmin as createUserRecord,
  createUserAndEnrollment,
  deleteUserWithRelations,
  findConflictingUserIdentifiers,
  findUserById,
  findUserProfile as findUserProfileRecord,
  findUserProfileForTerm,
  listAcademicTerms as listAcademicTermRecords,
  findUserForDeletion,
  findUserForPasswordReset,
  listDistinctShopCodes,
  listClassGroupFilters as listClassGroupFilterRecords,
  findUserIdsByLatestEnrollment,
  listUsers as listUserRecords,
  updatePasswordAndRevokeSessions,
  updateUserProfile as updateUserProfileRecord,
  withSerializableAdminUserTransaction,
  type AdminUserUpdateInput,
  type UserEnrollmentInput,
} from "@/repositories/user.repository";

// ============================================
// 1. Public User Fields
// ============================================

// ============================================
// 2. Get User Profile
// ============================================

export function getUserProfile(id: string, academicTermId?: string) {
  return academicTermId ? findUserProfileForTerm(id, academicTermId) : findUserProfileRecord(id);
}

export function getAcademicTerms() {
  return listAcademicTermRecords();
}

export function listClassGroupFilters(academicTermId?: string) {
  return listClassGroupFilterRecords(academicTermId);
}

// ============================================
// 3. Update User Profile
// ============================================

export function updateUserProfile(
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
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
  academicTermId?: string,
) {
  return listUserRecords(where, skip, take, academicTermId);
}

// ============================================
// 5. Get User By ID
// ============================================

export async function getUserById(id: string, academicTermId?: string) {
  const user = await findUserById(id, academicTermId);

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
        async ({
          findTarget,
          countOtherActiveAdmins,
          findConflictingIdentifiers,
          updateTarget,
        }) => {
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

          const nextStudentId =
            input.studentId === undefined
              ? target.studentId
              : input.studentId?.trim() || null;
          const nextEmployeeCode =
            input.employeeCode === undefined
              ? target.employeeCode
              : input.employeeCode?.trim() || null;

          if (nextRole === "STUDENT" && (!nextStudentId || !nextEmployeeCode)) {
            throw new ApiError(
              400,
              "นักศึกษาต้องมีทั้งรหัสนักศึกษาและรหัสพนักงาน",
              "VALIDATION_ERROR",
            );
          }

          if (
            nextRole === "STUDENT" &&
            target._count.enrollments === 0 &&
            !input.enrollment
          ) {
            throw new ApiError(
              400,
              "นักศึกษาต้องมีข้อมูลการลงทะเบียน/สาขาฝึกงาน",
              "ENROLLMENT_REQUIRED",
            );
          }

          // ADMIN รุ่นเก่าอาจมี username แต่ไม่มี studentId/employeeCode จึงคง username เดิมไว้ได้
          const nextUsername =
            nextStudentId ?? nextEmployeeCode ?? target.username;
          const identifiers = [
            ...new Set(
              [nextUsername, nextStudentId, nextEmployeeCode].filter(
                (value): value is string => Boolean(value),
              ),
            ),
          ];
          const conflicting = await findConflictingIdentifiers(identifiers, id);
          if (conflicting) {
            throw new ApiError(
              409,
              "รหัสซ้ำกับบัญชีที่มีอยู่ในระบบ",
              "USER_CONFLICT",
            );
          }

          return updateTarget(id, {
            ...input,
            studentId: nextStudentId,
            employeeCode: nextEmployeeCode,
            username: nextUsername,
            ...(nextRole === "ADMIN" ? { enrollment: undefined } : {}),
          });
        },
      );
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: unknown }).code
          : undefined;

      if (code === "P2034" && attempt < 2) continue;

      if (code === "P2002") {
        throw new ApiError(
          409,
          "รหัสซ้ำกับบัญชีที่มีอยู่ในระบบ",
          "USER_CONFLICT",
        );
      }

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
  branchName?: string | null;
  programLevel?: string | null;
  yearLevel?: number | null;
  section?: string | null;
  academicYear?: number | null;
  semester?: number | null;
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
  const userData = {
    username,
    studentId,
    employeeCode,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    passwordHash: await hashPassword(initialPassword),
    role,
    isActive: input.isActive ?? true,
  };
  if (role === "STUDENT") {
    const enrollment: UserEnrollmentInput = {
      branchName: input.branchName!.trim(),
      programLevel: input.programLevel!.trim(),
      yearLevel: input.yearLevel!,
      section: input.section!.trim(),
      academicYear: input.academicYear!,
      semester: input.semester!,
    };
    return createUserAndEnrollment(userData, enrollment);
  }
  return createUserRecord(userData);
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

  try {
    await deleteUserWithRelations(id);
  } catch (error) {
    // กันกรณีมีข้อมูลที่อ้างถึงผู้ใช้ถูกสร้างหลังการตรวจสอบก่อนลบ -> FK ยัง Restrict อยู่
    // ตรวจจาก code โดยตรงเพราะ Prisma 7 ผ่าน driver adapter อาจไม่ใช่ instance ของ PrismaClientKnownRequestError
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2003"
    ) {
      throw new ApiError(
        409,
        "ไม่สามารถลบผู้ใช้นี้ได้ เนื่องจากยังมีข้อมูลที่เกี่ยวข้องอยู่",
        "USER_HAS_RECORDS",
      );
    }
    throw error;
  }

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

export async function listShopCodes(academicTermId?: string) {
  const rows = await listDistinctShopCodes(academicTermId);
  return rows
    .map((row) => row.name.trim())
    .filter((code) => code.length > 0);
}

// ============================================
// 8. Build User Filter
// ============================================

export async function buildUserFilter(input: {
  role?: "STUDENT" | "ADMIN";
  shopCode?: string;
  gradeLevel?: number;
  section?: string;
  academicTermId?: string;
  query?: string;
}) {
  const conditions: Prisma.UserWhereInput[] = [];

  if (input.role) {
    conditions.push({ role: input.role });
  }

  if (input.academicTermId) {
    const enrollmentFilter: Prisma.StudentEnrollmentWhereInput = {
      academicTermId: input.academicTermId,
      ...(input.shopCode ? { branch: { name: input.shopCode } } : {}),
      ...(input.gradeLevel || input.section
        ? {
            classGroup: {
              ...(input.gradeLevel ? { yearLevel: input.gradeLevel } : {}),
              ...(input.section ? { section: input.section } : {}),
            },
          }
        : {}),
    };

    if (input.role === "STUDENT") {
      conditions.push({ enrollments: { some: enrollmentFilter } });
    } else if (input.role !== "ADMIN") {
      // ADMIN ไม่มี enrollment จึงต้องไม่ถูกกรองออกจากหน้ารวม
      conditions.push({
        OR: [
          { role: "ADMIN" },
          { enrollments: { some: enrollmentFilter } },
        ],
      });
    }
  } else if (input.shopCode || input.gradeLevel || input.section) {
    const latestEnrollmentUserIds = await findUserIdsByLatestEnrollment({
      branchName: input.shopCode,
      yearLevel: input.gradeLevel,
      section: input.section,
    });
    conditions.push({ id: { in: latestEnrollmentUserIds } });
  }

  if (input.query) {
    conditions.push({
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
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}
