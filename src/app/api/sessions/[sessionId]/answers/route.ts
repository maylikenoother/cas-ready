import { NextResponse } from "next/server";
import { apiUserId } from "@/lib/api-user";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/validation";
import { saveAnswer } from "@/lib/interview";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const { sessionId } = await context.params;
  const userId = await apiUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const allowed = await rateLimit(`answer:${userId}`, 40, 3600);
  if (!allowed) return NextResponse.json({ error: "Too many answers were sent. Wait an hour and try again." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const result = await saveAnswer(userId, sessionId, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
