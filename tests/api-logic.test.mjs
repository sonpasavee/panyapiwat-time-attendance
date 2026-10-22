import test from "node:test";
import assert from "node:assert/strict";
import { bangkokWorkDate, monthRange } from "../lib/time.ts";
import { summarizeShifts } from "../services/monthly-report.logic.ts";
import { summarizeMoneyEntries, summarizeDailyMoney } from "../services/money-tracker.logic.ts";
import { checkOutRuleError } from "../services/attendance.logic.ts";
import { leaveRangeError, leaveRangesOverlap } from "../services/leave.logic.ts";
import { inferClassAndTerm } from "../lib/import-parse.ts";
import {
  leaveSchema,
  moneyAmountSchema,
  studentImportSchema,
} from "../validators/api.ts";
import { decodeCsvBytes } from "../lib/csv-encoding.ts";
import { formatSpent } from "../lib/format.ts";

test("Bangkok work date rolls over at Bangkok midnight", () => {
  assert.equal(
    bangkokWorkDate(new Date("2026-10-12T17:00:00.000Z")).toISOString(),
    "2026-10-13T00:00:00.000Z",
  );
  assert.equal(
    bangkokWorkDate(new Date("2026-10-12T16:59:59.000Z")).toISOString(),
    "2026-10-12T00:00:00.000Z",
  );
});

test("month range handles leap February and 31 day months", () => {
  assert.deepEqual(monthRange(2024, 2), {
    gte: new Date("2024-02-01T00:00:00.000Z"),
    lt: new Date("2024-03-01T00:00:00.000Z"),
  });
  assert.equal(
    (monthRange(2026, 10).lt.getTime() - monthRange(2026, 10).gte.getTime()) /
      86400000,
    31,
  );
});

test("monthly summary excludes incomplete shifts and sums exact elapsed seconds", () => {
  const summary = summarizeShifts([
    {
      checkInAt: new Date("2026-10-01T01:00:00Z"),
      checkOutAt: new Date("2026-10-01T09:30:30Z"),
    },
    { checkInAt: new Date("2026-10-02T01:00:00Z"), checkOutAt: null },
  ]);
  assert.equal(summary.completeDays, 1);
  assert.equal(summary.incompleteDays, 1);
  assert.equal(summary.totalSeconds, 30630);
});

test("attendance service rejects checkout without an open shift or before check-in", () => {
  const checkInAt = new Date("2026-10-13T03:00:00Z");
  assert.equal(checkOutRuleError(null, new Date("2026-10-13T04:00:00Z")), "CHECK_IN_REQUIRED");
  assert.equal(checkOutRuleError({ checkInAt, checkOutAt: null }, new Date("2026-10-13T02:59:59Z")), "INVALID_TIME_ORDER");
  assert.equal(checkOutRuleError({ checkInAt, checkOutAt: new Date() }, new Date()), "ALREADY_CHECKED_OUT");
});

test("money tracker service totals remain exact and separate by payment type", () => {
  const totals = summarizeMoneyEntries([
    { moneyType: "CASH", direction: "IN", amount: "10.05" },
    { moneyType: "CASH", direction: "OUT", amount: "2.01" },
    { moneyType: "TRUEMONEY", direction: "IN", amount: "3.00" },
    { moneyType: "TRUEMONEY", direction: "OUT", amount: "1.25" },
  ]);
  assert.deepEqual(totals, { CASH: { in: "10.05", out: "2.01", net: "8.04" }, TRUEMONEY: { in: "3.00", out: "1.25", net: "1.75" }, net: "9.79" });
});

test("monthly money totals format negative net amounts correctly", () => {
  const totals = summarizeMoneyEntries([
    { moneyType: "CASH", direction: "IN", amount: "1.00" },
    { moneyType: "CASH", direction: "OUT", amount: "2.25" },
    { moneyType: "TRUEMONEY", direction: "IN", amount: "0.25" },
    { moneyType: "TRUEMONEY", direction: "OUT", amount: "1.00" },
  ]);

  assert.deepEqual(totals, {
    CASH: { in: "1.00", out: "2.25", net: "-1.25" },
    TRUEMONEY: { in: "0.25", out: "1.00", net: "-0.75" },
    net: "-2.00",
  });
});

test("daily money summary computes spent per type and total", () => {
  const summary = summarizeDailyMoney([
    { moneyType: "CASH", direction: "IN", amount: "100.00" },
    { moneyType: "CASH", direction: "OUT", amount: "60.50" },
    { moneyType: "TRUEMONEY", direction: "IN", amount: "50.00" },
    { moneyType: "TRUEMONEY", direction: "OUT", amount: "20.00" },
  ]);
  assert.deepEqual(summary, {
    CASH: { in: "100.00", out: "60.50", spent: "39.50", complete: true },
    TRUEMONEY: { in: "50.00", out: "20.00", spent: "30.00", complete: true },
    totalSpent: "69.50",
    complete: true,
  });
});

test("daily money summary tolerates missing type or missing checkout", () => {
  // มีแค่เงินสดขาเข้า (ยังไม่เช็กเอาท์) + ไม่มี TrueMoney เลย
  const summary = summarizeDailyMoney([
    { moneyType: "CASH", direction: "IN", amount: "100.00" },
  ]);
  assert.equal(summary.CASH.complete, false);
  assert.equal(summary.TRUEMONEY.complete, false);
  assert.equal(summary.complete, false);
  assert.equal(summary.totalSpent, "100.00");

  // OUT มากกว่า IN (ได้เงินเพิ่มระหว่างวัน) = ใช้ไปติดลบ
  const negative = summarizeDailyMoney([
    { moneyType: "CASH", direction: "IN", amount: "100.00" },
    { moneyType: "CASH", direction: "OUT", amount: "120.50" },
  ]);
  assert.equal(negative.CASH.spent, "-20.50");
  assert.equal(negative.complete, true);
});

test("spent display never shows a minus sign to users", () => {
  assert.deepEqual(formatSpent("230.00"), { text: "฿230.00", isGain: false });
  assert.deepEqual(formatSpent("-60.00"), { text: "เงินเพิ่ม ฿60.00", isGain: true });
  assert.deepEqual(formatSpent("0.00"), { text: "฿0.00", isGain: false });
});

test("money validation accepts exact decimal strings and rejects negative/over precision", () => {
  assert.equal(moneyAmountSchema.parse("150.00"), "150.00");
  assert.equal(moneyAmountSchema.parse("0"), "0");
  assert.equal(moneyAmountSchema.safeParse("-0.01").success, false);
  assert.equal(moneyAmountSchema.safeParse("1.001").success, false);
});

test("leave validation rejects reversed dates and accepts all supported kinds", () => {
  assert.equal(
    leaveSchema.safeParse({
      leaveType: "SICK",
      startDate: "2026-10-14",
      endDate: "2026-10-13",
    }).success,
    false,
  );
  for (const leaveType of ["HOLIDAY", "SICK", "PERSONAL"]) {
    assert.equal(
      leaveSchema.safeParse({
        leaveType,
        startDate: "2026-10-13",
        endDate: "2026-10-13",
      }).success,
      true,
    );
  }
});

test("student import requires employee codes and rejects duplicate identifiers across the file", () => {
  const row = (line, studentId, employeeCode, overrides = {}) => ({
    line,
    studentId,
    firstName: "สมชาย",
    lastName: "ใจดี",
    employeeCode,
    branchName: "สาขาทดสอบ",
    programLevel: "ปวช",
    yearLevel: 1,
    section: "A",
    academicYear: 2569,
    semester: 1,
    ...overrides,
  });

  const duplicateEmployee = studentImportSchema.safeParse({
    rows: [row(2, "68001", "EMP01"), row(3, "68002", "EMP01")],
  });
  assert.equal(duplicateEmployee.success, false);
  assert.ok(
    duplicateEmployee.error.issues.some((issue) =>
      issue.path.join(".").endsWith("employeeCode"),
    ),
  );

  assert.equal(
    studentImportSchema.safeParse({
      rows: [row(2, "68001", "EMP01"), row(3, "EMP02", "68001")],
    }).success,
    false,
  );

  const missingEmployee = studentImportSchema.safeParse({
    rows: [row(2, "68001", "", { employeeCode: "" })],
  });
  assert.equal(missingEmployee.success, false);
  assert.ok(
    missingEmployee.error.issues.some((issue) =>
      issue.path.join(".").endsWith("employeeCode"),
    ),
  );
});

test("student import accepts valid rows and enforces the batch cap", () => {
  const row = (line) => ({
    line,
    studentId: `680${line}`,
    firstName: "สมชาย",
    lastName: "ใจดี",
    employeeCode: `EMP${line}`,
    branchName: "สาขาทดสอบ",
    programLevel: "ปวช",
    yearLevel: 1,
    section: "A",
    academicYear: 2569,
    semester: 1,
  });

  const parsed = studentImportSchema.parse({ rows: [row(2)] });
  assert.equal(parsed.rows[0].academicYear, 2569);
  assert.equal(parsed.rows[0].semester, 1);
  assert.equal(parsed.rows[0].branchName, "สาขาทดสอบ");
  assert.equal(
    studentImportSchema.safeParse({
      rows: Array.from({ length: 501 }, (_, index) => row(index + 2)),
    }).success,
    false,
  );
});

test("import title parser supports common Thai academic-year formats", () => {
  assert.deepEqual(inferClassAndTerm("รายชื่อนักเรียน ปวช.1B ปีการศึกษา 2569 ภาคเรียนที่ 1"), {
    programLevel: "ปวช",
    yearLevel: "1",
    section: "B",
    semester: "1",
    academicYear: "2569",
  });
  assert.deepEqual(inferClassAndTerm("ปีการศึกษา 1/2569 ปวส.2A"), {
    programLevel: "ปวส",
    yearLevel: "2",
    section: "A",
    semester: "1",
    academicYear: "2569",
  });
  assert.deepEqual(inferClassAndTerm("ภาคเรียนที่ 2 ปีการศึกษา 2569"), {
    programLevel: "",
    yearLevel: "",
    section: "",
    semester: "2",
    academicYear: "2569",
  });
});

test("leave rules reject past dates and detect overlapping ranges", () => {
  const today = new Date("2026-10-22T00:00:00.000Z");
  assert.equal(
    leaveRangeError(
      {
        startDate: new Date("2026-10-21T00:00:00.000Z"),
        endDate: new Date("2026-10-22T00:00:00.000Z"),
      },
      today,
    ),
    "PAST_LEAVE_NOT_ALLOWED",
  );
  assert.equal(
    leaveRangeError(
      {
        startDate: new Date("2026-10-22T00:00:00.000Z"),
        endDate: new Date("2026-10-22T00:00:00.000Z"),
      },
      today,
    ),
    null,
  );
  assert.equal(
    leaveRangesOverlap(
      {
        startDate: new Date("2026-10-20T00:00:00.000Z"),
        endDate: new Date("2026-10-22T00:00:00.000Z"),
      },
      {
        startDate: new Date("2026-10-22T00:00:00.000Z"),
        endDate: new Date("2026-10-23T00:00:00.000Z"),
      },
    ),
    true,
  );
});

test("CSV decoding supports UTF-8 BOM and Thai Windows-874 files", () => {
  const utf8Bom = new TextEncoder().encode("\uFEFFstudentId,firstName");
  assert.deepEqual(decodeCsvBytes(utf8Bom.buffer), {
    text: "studentId,firstName",
    encoding: "UTF-8",
  });

  const thaiWindows874 = new Uint8Array([0xca, 0xc1, 0xaa, 0xd2, 0xc2]);
  assert.deepEqual(decodeCsvBytes(thaiWindows874.buffer), {
    text: "สมชาย",
    encoding: "Windows-874",
  });
});
