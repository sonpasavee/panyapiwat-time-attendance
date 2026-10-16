
import { requireUser } from "@/lib/auth";

import {
  handleError,
  json,
  requireSameOrigin,
} from "@/lib/api";

import { idSchema } from "@/validators/api";

import { resetUserPassword } from "@/services/user.service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: Context,
) {
  try {
    requireSameOrigin(request);

    await requireUser("ADMIN");

    const { id } = await context.params;

    return json(
      await resetUserPassword(idSchema.parse(id)),
    );
  } catch (error) {
    return handleError(error);
  }
}
