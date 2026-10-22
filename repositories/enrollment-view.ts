import type { Prisma } from "@/app/generated/prisma/client";

export const currentEnrollmentSelect = {
  enrollments: {
    take: 1,
    orderBy: [
      { academicTerm: { academicYear: "desc" } },
      { academicTerm: { semester: "desc" } },
    ],
    select: {
      academicTerm: { select: { academicYear: true, semester: true } },
      branch: { select: { name: true } },
      classGroup: {
        select: { programLevel: true, yearLevel: true, section: true },
      },
    },
  },
} satisfies Pick<Prisma.UserSelect, "enrollments">;

export function enrollmentSelectForTerm(academicTermId: string) {
  return {
    enrollments: {
      where: { academicTermId },
      take: 1,
      select: {
        academicTerm: { select: { academicYear: true, semester: true } },
        branch: { select: { name: true } },
        classGroup: { select: { programLevel: true, yearLevel: true, section: true } },
      },
    },
  } satisfies Pick<Prisma.UserSelect, "enrollments">;
}

type EnrollmentDisplay = {
  academicTerm: { academicYear: number; semester: number };
  branch: { name: string };
  classGroup: { programLevel: string; yearLevel: number; section: string };
};

export function withEnrollmentView<T extends { enrollments: EnrollmentDisplay[] }>(
  user: T,
) {
  const { enrollments, ...profile } = user;
  const enrollment = enrollments[0];

  return {
    ...profile,
    shopCode: enrollment?.branch.name ?? null,
    gradeLevel: enrollment?.classGroup.yearLevel ?? null,
    yearLevel: enrollment?.classGroup.yearLevel ?? null,
    programLevel: enrollment?.classGroup.programLevel ?? null,
    section: enrollment?.classGroup.section ?? null,
    academicYear: enrollment?.academicTerm.academicYear ?? null,
    semester: enrollment?.academicTerm.semester ?? null,
  };
}
