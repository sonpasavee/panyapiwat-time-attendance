import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { monthRange } from "@/lib/time";
import { monthYear, pagination } from "@/validators/api";
import { listMyAttendance } from "@/services/attendance.service";

export async function GET(request: Request) {
  try {
    const user = await requireUser("STUDENT");
    const url = new URL(request.url);
    const { page, pageSize, skip } = pagination(url.searchParams);
    const where: { userId: string; workDate?: ReturnType<typeof monthRange> } = { userId: user.id };
    if (url.searchParams.has("month") || url.searchParams.has("year")) {
      const { month, year } = monthYear(url.searchParams);
      where.workDate = monthRange(year, month);
    }
    const { items, total } = await listMyAttendance(user.id, where, skip, pageSize);
    return json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (error) { return handleError(error); }
}
