import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

import {
  hashPassword,
  verifyPassword,
  setSession,
  assertLoginAllowed,
  recordLoginFailure,
  clearLoginFailures,
  clearSession,
} from "@/lib/auth";

// ========================================
// Register Student
// ========================================

export async function registerStudent(input: {
  firstName: string;
  lastName: string;
  studentId: string;
  employeeCode?: string;
  shopCode?: string;
  gradeLevel?: number;
  password: string;
}) {
  const duplicate = await prisma.user.findFirst({
    where: {
      OR: [
        { username: input.studentId },
        { studentId: input.studentId },
        ...(input.employeeCode ? [{ employeeCode: input.employeeCode }] : []),
      ],
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    throw new ApiError(409, "Account details already in use", "CONFLICT");
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      username: input.studentId,
      studentId: input.studentId,
      employeeCode: input.employeeCode || null,
      shopCode: input.shopCode || null,
      gradeLevel: input.gradeLevel,
      yearLevel: input.gradeLevel,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      role: "STUDENT",
    },
    select: {
      id: true,
      username: true,
      studentId: true,
      employeeCode: true,
      shopCode: true,
      gradeLevel: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });
}

// ========================================
// Login User
// ========================================

export async function loginUser(username: string, password: string) {
  // ตรวจสอบว่าบัญชีนี้ถูกจำกัดการเข้าสู่ระบบหรือไม่
  await assertLoginAllowed(username);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { studentId: username }, { employeeCode: username }],
      isActive: true,
    },
  });

  // ตรวจสอบรหัสผ่าน โดยใช้ dummy hash เมื่อไม่พบผู้ใช้
  // เพื่อลดความแตกต่างของเวลาในการตอบกลับ
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(
        password,
        "scrypt$MDEyMzQ1Njc4OWFiY2RlZg$" + "A".repeat(86),
      );

  if (!user || !valid) {
    await recordLoginFailure(username);

    throw new ApiError(
      401,
      "Invalid username or password",
      "INVALID_CREDENTIALS",
    );
  }

  // เข้าสู่ระบบสำเร็จ
  await clearLoginFailures(username);
  await setSession(user.id);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    role: user.role,
  };
}

// ========================================
// Logout User
// ========================================

export function logoutUser() {
  return clearSession();
}
