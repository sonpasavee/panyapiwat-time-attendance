import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { monthRange } from "@/lib/time";
import { adminAttendanceQuerySchema, monthYear, pagination } from "@/validators/api";
import { buildAdminAttendanceFilter, listAdminAttendance } from "@/services/attendance.service";

export async function GET(request: Request) {
  try {
    await requireUser("ADMIN");
    const query = new URL(request.url).searchParams;
    const { page, pageSize, skip } = pagination(query);
    const filters = adminAttendanceQuerySchema.parse(Object.fromEntries(query));
    const month = query.has("month") || query.has("year") ? monthYear(query) : undefined;
    const where = buildAdminAttendanceFilter({ date: filters.date, monthRange: month ? monthRange(month.year, month.month) : undefined, shopCode: filters.shopCode, status: filters.status, query: filters.q });
    const sort = filters.sort ?? "desc";
    const { items, total } = await listAdminAttendance(where, skip, pageSize, sort);
    return json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { return handleError(error); }
}
