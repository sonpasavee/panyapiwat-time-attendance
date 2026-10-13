export type CheckOutRuleError =
  | "CHECK_IN_REQUIRED"
  | "ALREADY_CHECKED_OUT"
  | "INVALID_TIME_ORDER";

export function checkOutRuleError(
  attendance: {
    checkInAt: Date;
    checkOutAt: Date | null;
  } | null,
  now: Date,
): CheckOutRuleError | null {
  // ยังไม่มีรายการลงเวลาเข้า
  if (!attendance) {
    return "CHECK_IN_REQUIRED";
  }

  // ลงเวลาออกไปแล้ว
  if (attendance.checkOutAt) {
    return "ALREADY_CHECKED_OUT";
  }

  // เวลาลงออกต้องไม่อยู่ก่อนเวลาลงเข้า
  if (now < attendance.checkInAt) {
    return "INVALID_TIME_ORDER";
  }

  // ผ่านเงื่อนไขทั้งหมด
  return null;
}
