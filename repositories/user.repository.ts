import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

export const publicUserSelect = {
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

export type AdminUserUpdateInput = {
  firstName?: string;
  lastName?: string;
  gradeLevel?: number | null;
  shopCode?: string | null;
  employeeCode?: string | null;
  studentId?: string | null;
  isActive?: boolean;
  role?: "ADMIN" | "STUDENT";
};

export function findLoginUser(username: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { studentId: username },
        { employeeCode: username, role: "ADMIN" },
      ],
      isActive: true,
    },
  });
}

export function findUserPassword(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, passwordHash: true },
  });
}

export function updateUserPassword(id: string, passwordHash: string) {
  return prisma.user.update({
    where: { id },
    data: { passwordHash },
  });
}

export function findUserProfile(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: publicUserSelect,
  });
}

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
    data: { ...input, yearLevel: input.gradeLevel },
    select: publicUserSelect,
  });
}

export async function listUsers(
  where: Prisma.UserWhereInput,
  skip: number,
  take: number,
) {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: { firstName: "asc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });
}

export function withSerializableAdminUserTransaction<T>(
  operation: (repository: {
    findTarget: (
      id: string,
    ) => Promise<{ id: string; role: "ADMIN" | "STUDENT"; isActive: boolean } | null>;
    countOtherActiveAdmins: (id: string) => Promise<number>;
    updateTarget: (
      id: string,
      input: AdminUserUpdateInput,
    ) => ReturnType<typeof updateUserByAdminInTransaction>;
  }) => Promise<T>,
) {
  return prisma.$transaction(
    (tx) =>
      operation({
        findTarget: (id) =>
          tx.user.findUnique({
            where: { id },
            select: { id: true, role: true, isActive: true },
          }),
        countOtherActiveAdmins: (id) =>
          tx.user.count({
            where: {
              id: { not: id },
              role: "ADMIN",
              isActive: true,
            },
          }),
        updateTarget: (id, input) =>
          updateUserByAdminInTransaction(tx, id, input),
      }),
    { isolationLevel: "Serializable" },
  );
}

function updateUserByAdminInTransaction(
  tx: Prisma.TransactionClient,
  id: string,
  input: AdminUserUpdateInput,
) {
  return tx.user.update({
    where: { id },
    data: { ...input, yearLevel: input.gradeLevel },
    select: publicUserSelect,
  });
}

export async function findConflictingUserIdentifiers(
  identifiers: string[],
) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { username: { in: identifiers } },
        { studentId: { in: identifiers } },
        { employeeCode: { in: identifiers } },
      ],
    },
    select: { id: true },
  });
}

export function createUserByAdmin(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data, select: publicUserSelect });
}

export function findUserForDeletion(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
}

export function countUserAttendance(id: string) {
  return prisma.attendance.count({ where: { userId: id } });
}

export function countUserLeaves(id: string) {
  return prisma.leave.count({ where: { userId: id } });
}

export function deleteUserSessions(id: string) {
  return prisma.session.deleteMany({ where: { userId: id } });
}

export function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

export function findUserForPasswordReset(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, studentId: true, employeeCode: true },
  });
}

export function updatePasswordAndRevokeSessions(
  id: string,
  passwordHash: string,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { passwordHash },
      select: publicUserSelect,
    });
    await tx.session.deleteMany({ where: { userId: id } });
    return user;
  });
}

export function updatePasswordAndManageSessions(
  id: string,
  passwordHash: string,
  action: "KEEP_CURRENT" | "REVOKE_ALL",
  currentTokenHash: string,
) {
  return prisma.$transaction(async (tx) => {
    const where =
      action === "KEEP_CURRENT"
        ? { userId: id, tokenHash: { not: currentTokenHash } }
        : { userId: id };
    const revokedSessions = await tx.session.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    await tx.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true },
    });
    await tx.session.deleteMany({ where });

    return revokedSessions;
  });
}

export function listDistinctShopCodes() {
  return prisma.user.findMany({
    where: { shopCode: { not: null } },
    select: { shopCode: true },
    distinct: ["shopCode"],
    orderBy: { shopCode: "asc" },
  });
}

export function listStudentUsersForImport(identifiers: string[]) {
  return prisma.user.findMany({
    where: {
      OR: [
        { username: { in: identifiers } },
        { studentId: { in: identifiers } },
        { employeeCode: { in: identifiers } },
      ],
    },
    select: { username: true, studentId: true, employeeCode: true },
  });
}

export function createImportedStudents(
  data: Prisma.UserCreateManyInput[],
) {
  return prisma.user.createMany({ data });
}
