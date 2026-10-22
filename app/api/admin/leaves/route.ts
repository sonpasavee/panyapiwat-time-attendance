import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import {
  adminLeavesQuerySchema,
  monthYear,
  pagination,
} from "@/validators/api";
import {
  buildAdminLeaveFilter,
  listAdminLeaves,
} from "@/services/leave.service";

export async function GET(request: Request) {
  try {
    await requireUser("ADMIN");
    const query = new URL(request.url).searchParams;
    const { page, pageSize, skip } = pagination(query);
    const filters = adminLeavesQuerySchema.parse(Object.fromEntries(query));
    const monthYearFilter =
      query.has("month") || query.has("year") ? monthYear(query) : undefined;
    const where = await buildAdminLeaveFilter({
      type: filters.type,
      month: monthYearFilter?.month,
      year: monthYearFilter?.year,
      userId: filters.userId,
      shopCode: filters.shopCode,
      gradeLevel: filters.gradeLevel,
      section: filters.section,
      academicTermId: filters.academicTermId,
      q: filters.q,
    });
    const { items, total } = await listAdminLeaves(where, skip, pageSize, filters.academicTermId);
    return json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
