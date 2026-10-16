import { requireUser } from "@/lib/auth";
import { ApiError, handleError, json } from "@/lib/api";
import { idSchema } from "@/validators/api";
import { getMyAttendanceById } from "@/services/attendance.service";
import { summarizeDailyMoney } from "@/services/money-tracker.logic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser("STUDENT");
    const { id } = await context.params;
    const attendance = await getMyAttendanceById(user.id, idSchema.parse(id));
    if (!attendance)
      throw new ApiError(404, "Attendance not found", "NOT_FOUND");
    return json({
      attendance,
      moneySummary: summarizeDailyMoney(attendance.money),
    });
  } catch (error) {
    return handleError(error);
  }
}
