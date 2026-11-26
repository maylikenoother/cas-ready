import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { profileFields } from "@/lib/clerk-public";
import { deleteAccountData } from "@/lib/delete-account-data";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database key is not configured." }, { status: 500 });

  if (event.type === "user.created" || event.type === "user.updated") {
    const fields = profileFields(event.data, event.type === "user.created" ? "created" : "updated");
    const { error } = await admin.from("profiles").upsert(fields, { onConflict: "id" });
    if (error) return NextResponse.json({ error: "The profile could not be saved." }, { status: 500 });
  }

  if (event.type === "user.deleted" && event.data.id) {
    await deleteAccountData(admin, event.data.id);
  }

  return NextResponse.json({ ok: true });
}
