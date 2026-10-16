
import { requireUser } from "@/lib/auth";

import {
  ApiError,
  handleError,
  json,
  requireSameOrigin,
} from "@/lib/api";

import { attendanceFieldsSchema } from "@/validators/api";

import { checkIn } from "@/services/attendance.service";
import { summarizeDailyMoney } from "@/services/money-tracker.logic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);

    const user = await requireUser("STUDENT");

    const form = await request.formData();

    const image = form.get("image");

    if (!(image instanceof File)) {
      throw new ApiError(
        400,
        "image is required",
        "INVALID_IMAGE",
      );
    }

    const input = attendanceFieldsSchema.parse({
      cashAmount: form.get("cashAmount") || undefined,
      truemoneyAmount: form.get("truemoneyAmount") || undefined,
      note: form.get("note") || undefined,
    });

    const attendance = await checkIn(user.id, {
      image,
      ...input,
    });

    return json(
      { attendance, moneySummary: summarizeDailyMoney(attendance.money) },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}