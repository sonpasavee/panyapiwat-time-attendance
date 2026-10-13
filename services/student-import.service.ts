import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import type { StudentImportRow } from "@/validators/api";

const HASH_CONCURRENCY = 4;

export async function importStudents(rows: StudentImportRow[]) {
  const identifiers = rows.flatMap((row) => [row.studentId, row.employeeCode]);

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        { username: { in: identifiers } },
        { studentId: { in: identifiers } },
        { employeeCode: { in: identifiers } },
      ],
    },
    select: {
      username: true,
      studentId: true,
      employeeCode: true,
    },
  });

  const existingIdentifiers = new Set(
    existingUsers.flatMap((user) =>
      [user.username, user.studentId, user.employeeCode].filter(
        (value): value is string => value !== null,
      ),
    ),
  );
  const conflictingLines = rows
    .filter(
      (row) =>
        existingIdentifiers.has(row.studentId) ||
        existingIdentifiers.has(row.employeeCode),
    )
    .map((row) => row.line);

  if (conflictingLines.length > 0) {
    throw new ApiError(
      409,
      `ข้อมูลซ้ำกับบัญชีในระบบที่แถว ${conflictingLines.join(", ")}`,
      "IMPORT_CONFLICT",
    );
  }

  const passwordHashes: string[] = [];
  for (let start = 0; start < rows.length; start += HASH_CONCURRENCY) {
    const batch = rows.slice(start, start + HASH_CONCURRENCY);
    passwordHashes.push(
      ...(await Promise.all(
        batch.map((row) => hashPassword(row.employeeCode)),
      )),
    );
  }

  await prisma.user.createMany({
    data: rows.map((row, index) => ({
      username: row.studentId,
      studentId: row.studentId,
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      shopCode: row.shopCode || null,
      gradeLevel: row.gradeLevel,
      yearLevel: row.gradeLevel,
      passwordHash: passwordHashes[index],
      role: "STUDENT",
    })),
  });

  return { importedCount: rows.length };
}
