import { NextResponse } from "next/server";
import { apiUserEmail, apiUserId } from "@/lib/api-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { consentSchema, sameOrigin } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const userId = await apiUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Consent was not recorded." }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Consent could not be saved." }, { status: 500 });

  const email = await apiUserEmail();
  const at = new Date().toISOString();
  const profile: { id: string; email?: string; terms_accepted_at: string; recording_consent_at?: string } = {
    id: userId,
    terms_accepted_at: at,
  };
  if (email) profile.email = email;
  if (parsed.data.kind === "recording") profile.recording_consent_at = at;

  const { error: profileError } = await admin.from("profiles").upsert(profile, { onConflict: "id" });
  if (profileError) return NextResponse.json({ error: "Consent could not be saved on the profile." }, { status: 500 });

  const { error: eventError } = await admin.from("consent_events").insert({
    user_id: userId,
    kind: parsed.data.kind,
    accepted: true,
  });
  if (eventError) return NextResponse.json({ error: "Consent could not be saved." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
