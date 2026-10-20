import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const specification = await readFile(
    path.join(process.cwd(), "documents", "openapi.yaml"),
    "utf8",
  );

  return new Response(specification, {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
