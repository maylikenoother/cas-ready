import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { apiUserId, clerkServerConfigured } from "@/lib/api-user";
import { deleteAccountData } from "@/lib/delete-account-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccountSchema, sameOrigin } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const userId = await apiUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const parsed = deleteAccountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin || !clerkServerConfigured()) {
    return NextResponse.json({ error: "Account deletion needs the server keys." }, { status: 500 });
  }

  const removed = await deleteAccountData(admin, userId);
  const clerk = await clerkClient();
  await clerk.users.deleteUser(userId);
  return NextResponse.json({ ok: true, removedFiles: removed });
}
