
import { ApiError, handleError } from "@/lib/api";

export async function POST() {
  return handleError(
    new ApiError(
      410,
      "Student self-registration is disabled",
      "REGISTRATION_DISABLED",
    ),
  );
}