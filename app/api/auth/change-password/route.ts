import { handleError, json, requireSameOrigin } from "@/lib/api";

import { currentSessionTokenHash, requireUser } from "@/lib/auth";
import { changePassword, logoutUser } from "@/services/auth.service";
import { changePasswordSchema } from "@/validators/api";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);

    const session = await requireUser();
    const input = changePasswordSchema.parse(await request.json());
    const currentTokenHash = await currentSessionTokenHash();

    const result = await changePassword(
      session.id,
      input.currentPassword,
      input.newPassword,
      input.sessionAction,
      currentTokenHash,
    );
    if (input.sessionAction === "REVOKE_ALL") await logoutUser();

    return json(result);
  } catch (error) {
    return handleError(error);
  }
}
