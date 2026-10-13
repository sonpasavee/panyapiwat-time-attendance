import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { idSchema, monthYear, pagination } from "@/validators/api";
import { buildAdminMoneyFilter, listAdminMoneyEntries } from "@/services/money-tracker.service";

export async function GET(request: Request) {
  try {
    await requireUser("ADMIN");
    const query = new URL(request.url).searchParams;
    const { month, year } = monthYear(query);
    const { page, pageSize, skip } = pagination(query);
    const userId = query.has("userId") ? idSchema.parse(query.get("userId")) : undefined;
    const where = buildAdminMoneyFilter(month, year, { userId, shopCode: query.get("shopCode") ?? undefined });
    const { items, total } = await listAdminMoneyEntries(where, skip, pageSize);
    return json({ month, year, items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { return handleError(error); }
}
