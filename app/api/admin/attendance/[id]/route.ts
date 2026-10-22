import { requireUser } from "@/lib/auth";
import { ApiError, handleError, json } from "@/lib/api";
import { idSchema } from "@/validators/api";
import { getAdminAttendanceById } from "@/services/attendance.service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser("ADMIN");
    const { id } = await context.params;
    const academicTermId = new URL(request.url).searchParams.get("academicTermId") ?? undefined;
    const attendance = await getAdminAttendanceById(idSchema.parse(id), academicTermId);
    if (!attendance)
      throw new ApiError(404, "Attendance not found", "NOT_FOUND");
    return json({ attendance });
  } catch (error) {
    return handleError(error);
  }
}
