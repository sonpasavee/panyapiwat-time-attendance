import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { pagination } from "@/validators/api";
import { listMyLeaves } from "@/services/leave.service";

export async function GET(request: Request) {
  try { const user = await requireUser("STUDENT"); const { page, pageSize, skip } = pagination(new URL(request.url).searchParams); const { items, total } = await listMyLeaves(user.id, skip, pageSize); return json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }); }
  catch (error) { return handleError(error); }
}
