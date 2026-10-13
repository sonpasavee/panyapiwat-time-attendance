import { requireUser } from "@/lib/auth";
import { handleError, json, requireSameOrigin } from "@/lib/api";
import { leaveSchema, pagination } from "@/validators/api";
import { createLeave, listMyLeaves } from "@/services/leave.service";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser("STUDENT");
    const input = leaveSchema.parse(await request.json());
    return json({ leave: await createLeave(user.id, input) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
export async function GET(request: Request) {
  try {
    const user = await requireUser("STUDENT");
    const { page, pageSize, skip } = pagination(
      new URL(request.url).searchParams,
    );
    const { items, total } = await listMyLeaves(user.id, skip, pageSize);
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
