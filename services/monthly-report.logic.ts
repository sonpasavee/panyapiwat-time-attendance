export function summarizeShifts(
  rows: { checkInAt: Date; checkOutAt: Date | null }[],
) {
  const complete = rows.filter((row) => row.checkOutAt !== null);
  const totalSeconds = complete.reduce(
    (sum, row) =>
      sum +
      Math.max(
        0,
        Math.floor(
          (row.checkOutAt!.getTime() - row.checkInAt.getTime()) / 1000,
        ),
      ),
    0,
  );
  return {
    attendanceDays: rows.length,
    checkInDays: rows.length,
    checkOutDays: complete.length,
    completeDays: complete.length,
    incompleteDays: rows.length - complete.length,
    totalSeconds,
    totalMinutes: Math.floor(totalSeconds / 60),
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    averageMinutesPerCompleteDay: complete.length
      ? Math.round(totalSeconds / 60 / complete.length)
      : 0,
  };
}
