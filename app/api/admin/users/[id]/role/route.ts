
import { requireUser } from "@/lib/auth";

import {
  handleError,
  json,
  requireSameOrigin,
} from "@/lib/api";

import {
  idSchema,
  roleChangeSchema,
} from "@/validators/api";

import { changeUserRole } from "@/services/user.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);

    const actor = await requireUser("ADMIN");

    const { id } = await context.params;
    const userId = idSchema.parse(id);

    const { role } = roleChangeSchema.parse(
      await request.json(),
    );

    return json({
      user: await changeUserRole(
        userId,
        role,
        actor.id,
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}