import { NextResponse } from "next/server";
import { apiUserId } from "@/lib/api-user";
import { createClient } from "@/lib/supabase/server";
import { consentSchema, sameOrigin } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const userId = await apiUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const supabase = await createClient();
  const body = await request.json().catch(() => null);
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Consent was not recorded." }, { status: 400 });

  const { error: eventError } = await supabase.from("consent_events").insert({
    user_id: userId,
    kind: parsed.data.kind,
    accepted: true,
  });
  if (eventError) return NextResponse.json({ error: "Consent could not be saved." }, { status: 500 });

  const patch =
    parsed.data.kind === "terms"
      ? { terms_accepted_at: new Date().toISOString() }
      : parsed.data.kind === "recording"
        ? { recording_consent_at: new Date().toISOString(), terms_accepted_at: new Date().toISOString() }
        : { terms_accepted_at: new Date().toISOString() };
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return NextResponse.json({ error: "Consent could not be saved on the profile." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
