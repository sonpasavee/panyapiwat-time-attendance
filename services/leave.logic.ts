export type LeaveRangeInput = {
  startDate: Date;
  endDate: Date;
};

export type LeaveRangeError = "INVALID_LEAVE_RANGE" | "PAST_LEAVE_NOT_ALLOWED";

// วันที่ลาเป็น UTC midnight ตาม workDate และ today ต้องเป็น Bangkok work date
export function leaveRangeError(
  range: LeaveRangeInput,
  today: Date,
): LeaveRangeError | null {
  if (range.endDate < range.startDate) {
    return "INVALID_LEAVE_RANGE";
  }

  if (range.startDate < today) {
    return "PAST_LEAVE_NOT_ALLOWED";
  }

  return null;
}

export function leaveRangesOverlap(
  left: LeaveRangeInput,
  right: LeaveRangeInput,
) {
  return left.startDate <= right.endDate && left.endDate >= right.startDate;
}
