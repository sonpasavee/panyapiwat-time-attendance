
import { monthRange } from "@/lib/time";
import { summarizeShifts } from "@/services/monthly-report.logic";
import {
  listAdminMonthlyAttendance,
  listMyMonthlyAttendance,
} from "@/repositories/monthly-report.repository";

export async function getMyMonthlySummary(
  userId: string,
  month: number,
  year: number,
) {
  const rows = await listMyMonthlyAttendance(userId, monthRange(year, month));

  return {
    month,
    year,
    ...summarizeShifts(rows),
    durationPolicy:
      "Elapsed time between check-in and check-out; breaks are not deducted",
  };
}

export async function getAdminMonthlyReport(
  month: number,
  year: number,
  filter: {
    shopCode?: string;
    userId?: string;
    academicTermId?: string;
  },
) {
  const rows = await listAdminMonthlyAttendance(
    monthRange(year, month),
    filter,
  );

  const result = new Map<
    string,
    {
      user: (typeof rows)[number]["user"];
      attendanceDays: number;
      completeDays: number;
      incompleteDays: number;
      totalSeconds: number;
    }
  >();

  for (const row of rows) {
    const item = result.get(row.userId) ?? {
      user: row.user,
      attendanceDays: 0,
      completeDays: 0,
      incompleteDays: 0,
      totalSeconds: 0,
    };

    item.attendanceDays++;

    if (row.checkOutAt) {
      item.completeDays++;

      item.totalSeconds += Math.max(
        0,
        Math.floor(
          (row.checkOutAt.getTime() - row.checkInAt.getTime()) /
            1000,
        ),
      );
    } else {
      item.incompleteDays++;
    }

    result.set(row.userId, item);
  }

  const users = [...result.values()].map((row) => ({
    ...row,
    totalMinutes: Math.floor(row.totalSeconds / 60),
    hours: Math.floor(row.totalSeconds / 3600),
    minutes: Math.floor((row.totalSeconds % 3600) / 60),
  }));

  return {
    month,
    year,
    users,
    totals: {
      attendanceDays: rows.length,
      completeDays: users.reduce(
        (sum, row) => sum + row.completeDays,
        0,
      ),
      incompleteDays: users.reduce(
        (sum, row) => sum + row.incompleteDays,
        0,
      ),
      totalSeconds: users.reduce(
        (sum, row) => sum + row.totalSeconds,
        0,
      ),
      durationPolicy:
        "Elapsed time between check-in and check-out; breaks are not deducted",
    },
  };
}
