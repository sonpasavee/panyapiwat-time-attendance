import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { currentEnrollmentSelect, enrollmentSelectForTerm, withEnrollmentView } from "@/repositories/enrollment-view";

const publicUserSelectBase = {
  id: true,
  username: true,
  role: true,
  firstName: true,
  lastName: true,
  studentId: true,
  employeeCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const publicUserSelect = {
  ...publicUserSelectBase,
  ...currentEnrollmentSelect,
} as const;

export type AdminUserUpdateInput = {
  firstName?: string;
  lastName?: string;
  employeeCode?: string | null;
  studentId?: string | null;
  isActive?: boolean;
  role?: "ADMIN" | "STUDENT";
  enrollment?: UserEnrollmentInput;
  // ใช้ภายใน service เท่านั้น เพื่อ sync username กับรหัสล็อกอินหลัก
  username?: string;
};

export type UserEnrollmentInput = {
  branchName: string;
  programLevel: string;
  yearLevel: number;
  section: string;
  academicYear: number;
  semester: number;
};

async function upsertEnrollment(
  tx: Prisma.TransactionClient,
  userId: string,
  input: UserEnrollmentInput,
) {
  const academicTerm = await tx.academicTerm.upsert({
    where: { academicYear_semester: { academicYear: input.academicYear, semester: input.semester } },
    update: {},
    create: { academicYear: input.academicYear, semester: input.semester },
  });
  const classGroup = await tx.classGroup.upsert({
    where: { academicTermId_programLevel_yearLevel_section: {
      academicTermId: academicTerm.id,
      programLevel: input.programLevel,
      yearLevel: input.yearLevel,
      section: input.section,
    } },
    update: {},
    create: { academicTermId: academicTerm.id, programLevel: input.programLevel, yearLevel: input.yearLevel, section: input.section },
  });
  const branch = await tx.branch.upsert({
    where: { name: input.branchName },
    update: {},
    create: { name: input.branchName },
  });
  await tx.studentEnrollment.upsert({
    where: { userId_academicTermId: { userId, academicTermId: academicTerm.id } },
    update: { classGroupId: classGroup.id, branchId: branch.id },
    create: { userId, academicTermId: academicTerm.id, classGroupId: classGroup.id, branchId: branch.id },
  });
}

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
  }).then(withEnrollmentView);
}

export function listAcademicTerms() {
  return prisma.academicTerm.findMany({
    select: { id: true, academicYear: true, semester: true },
    orderBy: [{ academicYear: "desc" }, { semester: "desc" }],
  });
}

export function findUserProfileForTerm(id: string, academicTermId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: { ...publicUserSelectBase, ...enrollmentSelectForTerm(academicTermId) },
  }).then(withEnrollmentView);
}

export function updateUserProfile(
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
  },
) {
  return prisma.user.update({
    where: { id },
    data: { firstName: input.firstName, lastName: input.lastName },
    select: publicUserSelect,
  }).then(withEnrollmentView);
}

export async function listUsers(
  where: Prisma.UserWhereInput,
  skip: number,
  take: number,
  academicTermId?: string,
) {
  const select = academicTermId
    ? { ...publicUserSelectBase, ...enrollmentSelectForTerm(academicTermId) }
    : publicUserSelect;
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select,
      orderBy: { firstName: "asc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return { items: items.map(withEnrollmentView), total };
}

export function findUserById(id: string, academicTermId?: string) {
  return prisma.user.findUnique({
    where: { id },
    select: academicTermId
      ? { ...publicUserSelectBase, ...enrollmentSelectForTerm(academicTermId) }
      : publicUserSelect,
  }).then((user) => (user ? withEnrollmentView(user) : null));
}

export function withSerializableAdminUserTransaction<T>(
  operation: (repository: {
    findTarget: (
      id: string,
    ) => Promise<{
      id: string;
      role: "ADMIN" | "STUDENT";
      isActive: boolean;
      username: string;
      studentId: string | null;
      employeeCode: string | null;
      _count: { enrollments: number };
    } | null>;
    countOtherActiveAdmins: (id: string) => Promise<number>;
    findConflictingIdentifiers: (
      identifiers: string[],
      excludeUserId: string,
    ) => Promise<{ id: string } | null>;
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
            select: {
              id: true,
              role: true,
              isActive: true,
              username: true,
              studentId: true,
              employeeCode: true,
              _count: { select: { enrollments: true } },
            },
          }),
        countOtherActiveAdmins: (id) =>
          tx.user.count({
            where: {
              id: { not: id },
              role: "ADMIN",
              isActive: true,
            },
          }),
        findConflictingIdentifiers: (identifiers, excludeUserId) =>
          tx.user.findFirst({
            where: {
              id: { not: excludeUserId },
              OR: [
                { username: { in: identifiers } },
                { studentId: { in: identifiers } },
                { employeeCode: { in: identifiers } },
              ],
            },
            select: { id: true },
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
  return (async () => {
    const user = await tx.user.update({
      where: { id },
      data: {
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        employeeCode: input.employeeCode,
        studentId: input.studentId,
        isActive: input.isActive,
        role: input.role,
      },
      select: { id: true },
    });
    if (input.enrollment) await upsertEnrollment(tx, id, input.enrollment);
    return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUserSelect }).then(withEnrollmentView);
  })();
}

export async function findConflictingUserIdentifiers(
  identifiers: string[],
  excludeUserId?: string,
) {
  return prisma.user.findFirst({
    where: {
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
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
  return prisma.user.create({ data, select: publicUserSelect }).then(withEnrollmentView);
}

export async function createUserAndEnrollment(
  data: Prisma.UserCreateInput,
  enrollment: UserEnrollmentInput,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data, select: { id: true } });
    await upsertEnrollment(tx, user.id, enrollment);
    return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUserSelect }).then(withEnrollmentView);
  });
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

// ลบ session + enrollment (ข้อมูลทะเบียน/โปรไฟล์) พร้อม user ใน transaction เดียว
// โดยไม่แตะ Attendance/Leave ซึ่งยังถูกกันด้วย onDelete: Restrict และการตรวจใน service
export function deleteUserWithRelations(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.studentEnrollment.deleteMany({ where: { userId: id } });
    return tx.user.delete({ where: { id } });
  });
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

export function listDistinctShopCodes(academicTermId?: string) {
  if (academicTermId) {
    return prisma.branch.findMany({
      where: { enrollments: { some: { academicTermId, user: { role: "STUDENT", isActive: true } } } },
      select: { name: true },
      orderBy: { name: "asc" },
    });
  }
  return prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    select: currentEnrollmentSelect,
  }).then((users) => [...new Set(users.flatMap((user) => user.enrollments[0]?.branch.name ?? []))]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name })));
}

export function listClassGroupFilters(academicTermId?: string) {
  if (!academicTermId) return Promise.resolve([]);
  return prisma.classGroup.findMany({
    where: {
      academicTermId,
      enrollments: { some: { user: { role: "STUDENT", isActive: true } } },
    },
    select: { yearLevel: true, section: true },
    distinct: ["yearLevel", "section"],
    orderBy: [{ yearLevel: "asc" }, { section: "asc" }],
  });
}

export async function findUserIdsByLatestEnrollment(filter: {
  branchName?: string;
  yearLevel?: number;
  section?: string;
}) {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { user: { role: "STUDENT", isActive: true } },
    orderBy: [
      { userId: "asc" },
      { academicTerm: { academicYear: "desc" } },
      { academicTerm: { semester: "desc" } },
    ],
    select: {
      userId: true,
      branch: { select: { name: true } },
      classGroup: { select: { yearLevel: true, section: true } },
    },
  });
  const latestByUser = new Map<string, (typeof enrollments)[number]>();
  for (const enrollment of enrollments) {
    if (!latestByUser.has(enrollment.userId)) latestByUser.set(enrollment.userId, enrollment);
  }
  return [...latestByUser]
    .filter(([, enrollment]) =>
      (!filter.branchName || enrollment.branch.name === filter.branchName) &&
      (filter.yearLevel === undefined || enrollment.classGroup.yearLevel === filter.yearLevel) &&
      (filter.section === undefined || enrollment.classGroup.section === filter.section),
    )
    .map(([userId]) => userId);
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

export function withStudentImportTransaction<T>(
  operation: (repository: {
    createUsers: (data: Prisma.UserCreateManyInput[]) => Promise<unknown>;
    findUsersByStudentIds: (studentIds: string[]) => Promise<Array<{ id: string; studentId: string | null }>>;
    ensureAcademicTerms: (data: Array<{ academicYear: number; semester: number }>) => Promise<Array<{ id: string; academicYear: number; semester: number }>>;
    ensureClassGroups: (data: Array<{ academicTermId: string; programLevel: string; yearLevel: number; section: string }>) => Promise<Array<{ id: string; academicTermId: string; programLevel: string; yearLevel: number; section: string }>>;
    ensureBranches: (names: string[]) => Promise<Array<{ id: string; name: string }>>;
    createEnrollments: (data: Prisma.StudentEnrollmentCreateManyInput[]) => Promise<unknown>;
  }) => Promise<T>,
) {
  return prisma.$transaction((tx) =>
    operation({
      createUsers: (data) => tx.user.createMany({ data }),
      findUsersByStudentIds: (studentIds) =>
        tx.user.findMany({
          where: { studentId: { in: studentIds } },
          select: { id: true, studentId: true },
        }),
      ensureAcademicTerms: async (data) => {
        await tx.academicTerm.createMany({ data, skipDuplicates: true });
        return tx.academicTerm.findMany({
          where: { OR: data.map(({ academicYear, semester }) => ({ academicYear, semester })) },
          select: { id: true, academicYear: true, semester: true },
        });
      },
      ensureClassGroups: async (data) => {
        await tx.classGroup.createMany({ data, skipDuplicates: true });
        return tx.classGroup.findMany({
          where: {
            OR: data.map(({ academicTermId, programLevel, yearLevel, section }) => ({
              academicTermId,
              programLevel,
              yearLevel,
              section,
            })),
          },
          select: { id: true, academicTermId: true, programLevel: true, yearLevel: true, section: true },
        });
      },
      ensureBranches: async (names) => {
        await tx.branch.createMany({ data: names.map((name) => ({ name })), skipDuplicates: true });
        return tx.branch.findMany({
          where: { name: { in: names } },
          select: { id: true, name: true },
        });
      },
      createEnrollments: (data) => tx.studentEnrollment.createMany({ data }),
    }),
    { maxWait: 10_000, timeout: 15_000 },
  );
}
