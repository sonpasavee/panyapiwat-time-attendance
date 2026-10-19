const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type AttendancePhotos = {
  checkInAt: Date;
  checkOutAt: Date | null;
  checkInPhotoUrl: string | null;
  checkOutPhotoUrl: string | null;
};

export function hideExpiredAttendancePhotos<T extends AttendancePhotos>(
  attendance: T,
  now = new Date(),
): T {
  return {
    ...attendance,
    checkInPhotoUrl:
      now.getTime() - attendance.checkInAt.getTime() < RETENTION_MS
        ? attendance.checkInPhotoUrl
        : null,
    checkOutPhotoUrl:
      attendance.checkOutAt &&
      now.getTime() - attendance.checkOutAt.getTime() < RETENTION_MS
        ? attendance.checkOutPhotoUrl
        : null,
  };
}
