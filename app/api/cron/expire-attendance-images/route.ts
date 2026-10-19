import { timingSafeEqual } from "node:crypto";

import { ApiError, handleError, json } from "@/lib/api";
import { expireAttendanceImages } from "@/services/attendance-image-retention.service";

export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !supplied) return false;

  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron authorization" } },
      401,
    );
  }

  try {
    return json(await expireAttendanceImages());
  } catch (error) {
    console.error("Attendance image expiration job failed", error);
    return handleError(
      new ApiError(500, "Image expiration job failed", "INTERNAL_ERROR"),
    );
  }
}
