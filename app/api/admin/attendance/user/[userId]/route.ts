import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { idSchema, pagination } from "@/validators/api";
import { listUserAttendance } from "@/services/attendance.service";

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  try { await requireUser("ADMIN"); const { userId } = await context.params; const id = idSchema.parse(userId); const { page, pageSize, skip } = pagination(new URL(request.url).searchParams); const { items, total } = await listUserAttendance(id, skip, pageSize); return json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }); }
  catch (error) { return handleError(error); }
}
