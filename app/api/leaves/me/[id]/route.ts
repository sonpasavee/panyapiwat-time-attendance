
import { requireUser } from "@/lib/auth";

import {
  handleError,
  json,
  requireSameOrigin,
} from "@/lib/api";

import {
  idSchema,
  leaveSchema,
} from "@/validators/api";

import {
  deleteMyLeave,
  getMyLeave,
  updateMyLeave,
} from "@/services/leave.service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: Context,
) {
  try {
    const user = await requireUser("STUDENT");

    const { id } = await context.params;

    return json({
      leave: await getMyLeave(
        user.id,
        idSchema.parse(id),
      ),
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

    const user = await requireUser("STUDENT");

    const { id } = await context.params;

    const input = leaveSchema.parse(
      await request.json(),
    );

    return json({
      leave: await updateMyLeave(
        user.id,
        idSchema.parse(id),
        input,
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: Request,
  context: Context,
) {
  try {
    requireSameOrigin(request);

    const user = await requireUser("STUDENT");

    const { id } = await context.params;

    await deleteMyLeave(
      user.id,
      idSchema.parse(id),
    );

    return json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}