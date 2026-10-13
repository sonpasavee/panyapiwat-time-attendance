import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { monthYear } from "@/validators/api";
import { getMyMonthlySummary } from "@/services/monthly-report.service";

export async function GET(request: Request) {
  try { const user = await requireUser("STUDENT"); const { month, year } = monthYear(new URL(request.url).searchParams); return json(await getMyMonthlySummary(user.id, month, year)); }
  catch (error) { return handleError(error); }
}
