
import { requireUser } from "@/lib/auth";

import {
  handleError,
  json,
  requireSameOrigin,
} from "@/lib/api";

import {
  idSchema,
  userAdminSchema,
} from "@/validators/api";

import {
  getUserById,
  updateUserByAdmin,
} from "@/services/user.service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    await requireUser("ADMIN");

    const { id } = await context.params;

    return json({
      user: await getUserById(idSchema.parse(id)),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: Context,
) {
  try {
    requireSameOrigin(request);

    await requireUser("ADMIN");

    const { id } = await context.params;

    const input = userAdminSchema.parse(
      await request.json(),
    );

    return json({
      user: await updateUserByAdmin(
        idSchema.parse(id),
        input,
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}