import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { getTodayAttendance } from "@/services/attendance.service";
import { summarizeDailyMoney } from "@/services/money-tracker.logic";

export async function GET() {
  try {
    const user = await requireUser("STUDENT");
    const attendance = await getTodayAttendance(user.id);
    return json({
      checkedIn: !!attendance,
      checkedOut: !!attendance?.checkOutAt,
      attendance,
      moneySummary: attendance ? summarizeDailyMoney(attendance.money) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
