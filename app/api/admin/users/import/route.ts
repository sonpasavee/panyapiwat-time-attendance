import { ApiError, handleError, json, requireSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { importStudents } from "@/services/student-import.service";
import { studentImportSchema } from "@/validators/api";

const MAX_BODY_BYTES = 1024 * 1024;

async function readBodyWithinLimit(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new ApiError(413, "Request body is too large", "PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new ApiError(
      400,
      "Request body must be valid UTF-8",
      "INVALID_ENCODING",
    );
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await requireUser("ADMIN");

    const contentLengthHeader = request.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      throw new ApiError(413, "Request body is too large", "PAYLOAD_TOO_LARGE");
    }

    const body = await readBodyWithinLimit(request);
    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new ApiError(
        400,
        "Request body must be valid JSON",
        "INVALID_JSON",
      );
    }

    const { rows } = studentImportSchema.parse(payload);
    return json(await importStudents(rows), 201);
  } catch (error) {
    return handleError(error);
  }
}
