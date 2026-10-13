import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { adminUsersQuerySchema, pagination } from "@/validators/api";
import { buildUserFilter, listUsers } from "@/services/user.service";

export async function GET(request: Request) {
  try { await requireUser("ADMIN"); const query = new URL(request.url).searchParams; const filters = adminUsersQuerySchema.parse(Object.fromEntries(query)); const { page, pageSize, skip } = pagination(query); const where = buildUserFilter({ role: filters.role, shopCode: filters.shopCode, gradeLevel: filters.gradeLevel, query: filters.q }); const { items, total } = await listUsers(where, skip, pageSize); return json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }); }
  catch (error) { return handleError(error); }
}
