import { timingSafeEqual } from "node:crypto";

import { json } from "@/lib/api";
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
      { ok: false, error: { code: "UNAUTHORIZED", message: "Invalid cron authorization" } },
      401,
    );
  }

  try {
    return json({ ok: true, data: await expireAttendanceImages() });
  } catch (error) {
    console.error("Attendance image expiration job failed", error);
    return json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Image expiration job failed" } },
      500,
    );
  }
}
