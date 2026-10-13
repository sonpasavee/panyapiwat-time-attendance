
import { requireUser } from "@/lib/auth";

import {
  ApiError,
  handleError,
  json,
  requireSameOrigin,
} from "@/lib/api";

import { attendanceFieldsSchema } from "@/validators/api";

import { checkOut } from "@/services/attendance.service";

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
      moneyAmount: form.get("moneyAmount"),
      moneyType: form.get("moneyType"),
      note: form.get("note") || undefined,
    });

    const attendance = await checkOut(user.id, {
      image,
      ...input,
    });

    return json({ attendance });
  } catch (error) {
    return handleError(error);
  }
}