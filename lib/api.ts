
import { Prisma } from "@/app/generated/prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function handleError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    error.digest === "HANGING_PROMISE_REJECTION"
  ) {
    throw error;
  }

  if (error instanceof ApiError) {
    return json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      error.status,
    );
  }

  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError
  ) {
    if (error.code === "P2002") {
      return json(
        {
          error: {
            code: "CONFLICT",
            message:
              "A record with these details already exists",
          },
        },
        409,
      );
    }

    if (error.code === "P2025") {
      return json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Record not found",
          },
        },
        404,
      );
    }
  }

  console.error("API request failed", error);

  return json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500,
  );
}

export async function route<T>(
  fn: () => Promise<T>,
  status = 200,
) {
  try {
    return json(await fn(), status);
  } catch (error) {
    return handleError(error);
  }
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (
    !origin ||
    new URL(origin).host !== new URL(request.url).host
  ) {
    throw new ApiError(
      403,
      "Invalid request origin",
      "CSRF_REJECTED",
    );
  }
}