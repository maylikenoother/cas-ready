import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/validation";
import { saveAnswer } from "@/lib/interview";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const { sessionId } = await context.params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const allowed = await rateLimit(`answer:${data.user.id}`, 40, 3600);
  if (!allowed) return NextResponse.json({ error: "Too many answers were sent. Wait an hour and try again." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const result = await saveAnswer(data.user.id, sessionId, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
