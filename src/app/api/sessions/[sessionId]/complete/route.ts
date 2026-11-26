import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/validation";
import { completeInterview } from "@/lib/interview";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const { sessionId } = await context.params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const allowed = await rateLimit(`complete:${data.user.id}`, 20, 3600);
  if (!allowed) return NextResponse.json({ error: "Too many report requests. Wait an hour and try again." }, { status: 429 });
  const result = await completeInterview(data.user.id, sessionId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
