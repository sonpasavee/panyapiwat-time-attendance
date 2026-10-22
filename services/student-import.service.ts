import { ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import {
  listStudentUsersForImport,
  withStudentImportTransaction,
} from "@/repositories/user.repository";
import type { StudentImportRow } from "@/validators/api";

const HASH_CONCURRENCY = 4;

function termKey(academicYear: number, semester: number) {
  return `${academicYear}:${semester}`;
}

function classKey(academicTermId: string, programLevel: string, yearLevel: number, section: string) {
  return JSON.stringify([academicTermId, programLevel, yearLevel, section]);
}

export async function importStudents(rows: StudentImportRow[]) {
  const identifiers = rows.flatMap((row) => [row.studentId, row.employeeCode]);

  const existingUsers = await listStudentUsersForImport(identifiers);

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

  await withStudentImportTransaction(async (repository) => {
    await repository.createUsers(rows.map((row, index) => ({
      username: row.studentId,
      studentId: row.studentId,
      employeeCode: row.employeeCode,
      titlePrefix: row.titlePrefix || null,
      firstName: row.firstName,
      lastName: row.lastName,
      passwordHash: passwordHashes[index],
      role: "STUDENT",
    })));

    const importedUsers = await repository.findUsersByStudentIds(
      rows.map((row) => row.studentId),
    );
    const userIds = new Map(
      importedUsers.flatMap((user) => user.studentId ? [[user.studentId, user.id] as const] : []),
    );
    const requestedTerms = [...new Map(rows.map((row) => {
      const key = termKey(row.academicYear, row.semester);
      return [key, { academicYear: row.academicYear, semester: row.semester }] as const;
    })).values()];
    const storedTerms = await repository.ensureAcademicTerms(requestedTerms);
    const terms = new Map(storedTerms.map((term) => [termKey(term.academicYear, term.semester), term.id]));

    const requestedClasses = [...new Map(rows.map((row) => {
      const academicTermId = terms.get(termKey(row.academicYear, row.semester));
      if (!academicTermId) throw new Error(`Academic term ${row.academicYear}/${row.semester} was not found`);
      const value = { academicTermId, programLevel: row.programLevel, yearLevel: row.yearLevel, section: row.section };
      return [classKey(value.academicTermId, value.programLevel, value.yearLevel, value.section), value] as const;
    })).values()];
    const storedClasses = await repository.ensureClassGroups(requestedClasses);
    const classes = new Map(storedClasses.map((group) => [
      classKey(group.academicTermId, group.programLevel, group.yearLevel, group.section),
      group.id,
    ]));

    const requestedBranches = [...new Set(rows.map((row) => row.branchName))];
    const storedBranches = await repository.ensureBranches(requestedBranches);
    const branches = new Map(storedBranches.map((branch) => [branch.name, branch.id]));

    const enrollments = rows.map((row) => {
      const academicTermId = terms.get(termKey(row.academicYear, row.semester));
      const classGroupId = academicTermId
        ? classes.get(classKey(academicTermId, row.programLevel, row.yearLevel, row.section))
        : undefined;
      const branchId = branches.get(row.branchName);
      const userId = userIds.get(row.studentId);
      if (!userId) throw new Error(`Imported student ${row.studentId} was not found`);
      if (!academicTermId || !classGroupId || !branchId) {
        throw new Error(`Enrollment references for student ${row.studentId} were not found`);
      }
      return { userId, academicTermId, classGroupId, branchId };
    });

    await repository.createEnrollments(enrollments);
  });

  return { importedCount: rows.length };
}
