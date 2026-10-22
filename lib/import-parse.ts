const CLASS_PATTERN = /(ปวช|ปวส)\.?\s*(\d{1,2})\s*([A-Za-z\u0e01-\u0e2e\u0e30-\u0e3f0-9]+)/u;

function validSemester(value: string | undefined) {
  if (!value) return "";
  const semester = Number(value);
  return Number.isInteger(semester) && semester >= 1 && semester <= 3
    ? String(semester)
    : "";
}

function validAcademicYear(value: string | undefined) {
  if (!value) return "";
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2700
    ? String(year)
    : "";
}

export function inferClassAndTerm(title: string) {
  const classMatch = title.match(CLASS_PATTERN);

  let semester = "";
  let academicYear = "";

  // รูปแบบที่พบบ่อย: "ปีการศึกษา 1/2569", "ภาคเรียนที่ 1/2569"
  const termFirst = title.match(
    /(?:ปีการศึกษา|ภาคเรียน(?:ที่)?|เทอม)\s*(\d{1,2})\s*[/-]\s*(\d{4})/u,
  );
  if (termFirst) {
    semester = validSemester(termFirst[1]);
    academicYear = validAcademicYear(termFirst[2]);
  }

  // รูปแบบ: "ปีการศึกษา 2569/1"
  if (!semester || !academicYear) {
    const yearFirst = title.match(
      /ปีการศึกษา\s*(\d{4})\s*[/-]\s*(\d{1,2})/u,
    );
    if (yearFirst) {
      academicYear = validAcademicYear(yearFirst[1]);
      semester = validSemester(yearFirst[2]);
    }
  }

  // รูปแบบ: "ปีการศึกษา 2569 ภาคเรียนที่ 1"
  if (!semester || !academicYear) {
    const yearThenSemester = title.match(
      /ปีการศึกษา\s*(\d{4})(?:\s*(?:ภาคเรียน(?:ที่)?|เทอม)\s*(\d{1,2}))?/u,
    );
    if (yearThenSemester) {
      academicYear = validAcademicYear(yearThenSemester[1]);
      semester = validSemester(yearThenSemester[2]) || semester;
    }
  }

  // รูปแบบ: "ภาคเรียนที่ 1 ปีการศึกษา 2569"
  if (!semester || !academicYear) {
    const semesterThenYear = title.match(
      /(?:ภาคเรียน(?:ที่)?|เทอม)\s*(\d{1,2})(?:\s*ปีการศึกษา\s*(\d{4}))?/u,
    );
    if (semesterThenYear) {
      semester = validSemester(semesterThenYear[1]) || semester;
      academicYear = validAcademicYear(semesterThenYear[2]) || academicYear;
    }
  }

  return {
    programLevel: classMatch?.[1] ?? "",
    yearLevel: classMatch?.[2] ?? "",
    section: classMatch?.[3] ?? "",
    semester,
    academicYear,
  };
}

export function parseClassGroup(value: string) {
  const match = value.match(CLASS_PATTERN);
  if (!match) return null;
  return {
    programLevel: match[1],
    yearLevel: match[2],
    section: match[3],
  };
}
