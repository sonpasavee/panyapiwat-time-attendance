import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { getTodayAttendance } from "@/services/attendance.service";

export async function GET() {
  try { const user = await requireUser("STUDENT"); const attendance = await getTodayAttendance(user.id); return json({ checkedIn: !!attendance, checkedOut: !!attendance?.checkOutAt, attendance }); }
  catch (error) { return handleError(error); }
}
