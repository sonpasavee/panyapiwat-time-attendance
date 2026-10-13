
import { registerSchema } from "@/validators/api";

import { handleError, json } from "@/lib/api";

import { registerStudent } from "@/services/auth.service";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(
      await request.json(),
    );

    return json(
      {
        user: await registerStudent(input),
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}