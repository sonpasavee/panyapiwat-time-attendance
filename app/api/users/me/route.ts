
import { requireUser } from "@/lib/auth";

import {
  handleError,
  json,
  requireSameOrigin,
} from "@/lib/api";

import { profileSchema } from "@/validators/api";

import {
  getUserProfile,
  updateUserProfile,
} from "@/services/user.service";

export async function GET() {
  try {
    const user = await requireUser();

    return json({
      user: await getUserProfile(user.id),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);

    const user = await requireUser();

    const input = profileSchema.parse(
      await request.json(),
    );

    return json({
      user: await updateUserProfile(user.id, input),
    });
  } catch (error) {
    return handleError(error);
  }
}