import { handleError, json, requireSameOrigin } from "@/lib/api";
import { logoutUser } from "@/services/auth.service";

export async function POST(request: Request) {
  try { requireSameOrigin(request); await logoutUser(); return json({ success: true }); }
  catch (error) { return handleError(error); }
}
