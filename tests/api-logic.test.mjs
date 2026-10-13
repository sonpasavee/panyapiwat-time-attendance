import test from "node:test";
import assert from "node:assert/strict";
import { bangkokWorkDate, monthRange } from "../lib/time.ts";
import { summarizeShifts } from "../services/monthly-report.logic.ts";
import { summarizeMoneyEntries } from "../services/money-tracker.logic.ts";
import { checkOutRuleError } from "../services/attendance.logic.ts";
import { leaveSchema, moneyAmountSchema } from "../validators/api.ts";

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
