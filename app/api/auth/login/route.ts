
import { loginSchema } from "@/validators/api";

import {
  handleError,
  json,
  requireSameOrigin,
} from "@/lib/api";

import { loginUser } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);

    const input = loginSchema.parse(
      await request.json(),
    );

    return json({
      user: await loginUser(
        input.username,
        input.password,
      ),
    });
  } catch (error) {
    return handleError(error);
  }
}