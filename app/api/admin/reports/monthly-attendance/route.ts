import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { idSchema, monthYear } from "@/validators/api";
import { getAdminMonthlyReport } from "@/services/monthly-report.service";

export async function GET(request: Request) {
  try {
    await requireUser("ADMIN");
    const query = new URL(request.url).searchParams;
    const { month, year } = monthYear(query);
    const userId = query.has("userId")
      ? idSchema.parse(query.get("userId"))
      : undefined;
    return json(
      await getAdminMonthlyReport(month, year, {
        shopCode: query.get("shopCode") ?? undefined,
        userId,
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}
