import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

import {
  verifyPassword,
  setSession,
  assertLoginAllowed,
  recordLoginFailure,
  clearLoginFailures,
  clearSession,
} from "@/lib/auth";

// ========================================
// Login User
// ========================================

export async function loginUser(username: string, password: string) {
  // ตรวจสอบว่าบัญชีนี้ถูกจำกัดการเข้าสู่ระบบหรือไม่
  await assertLoginAllowed(username);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { studentId: username },
        { employeeCode: username, role: "ADMIN" },
      ],
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
