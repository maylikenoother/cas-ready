import { NextResponse } from "next/server";
import { apiUserId } from "@/lib/api-user";
import { sameOrigin } from "@/lib/validation";
import { abandonInterview } from "@/lib/interview";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const { sessionId } = await context.params;
  const userId = await apiUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const result = await abandonInterview(userId, sessionId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
