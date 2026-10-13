
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

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

export function updateUserByAdmin(
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
// 7. Change User Role
// ============================================

export function changeUserRole(
  id: string,
  role: "ADMIN" | "STUDENT",
  actorId: string,
) {
  if (actorId === id && role !== "ADMIN") {
    throw new ApiError(
      409,
      "Administrators cannot remove their own role",
      "LAST_ADMIN_PROTECTION",
    );
  }

  return prisma.user.update({
    where: { id },

    data: {
      role,
    },

    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
    },
  });
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