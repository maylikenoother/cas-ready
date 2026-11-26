import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccountSchema, sameOrigin } from "@/lib/validation";
import { asRows, asString } from "@/lib/text";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const parsed = deleteAccountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Account deletion needs the server database key." }, { status: 500 });

  const { data: files } = await admin.storage.from("recordings").list(data.user.id, { limit: 1000 });
  const paths = (files ?? [])
    .map((file) => file.name)
    .filter(Boolean)
    .map((name) => `${data.user.id}/${name}`);
  if (paths.length > 0) await admin.storage.from("recordings").remove(paths);

  const { data: nested } = await admin.storage.from("recordings").list(data.user.id, { limit: 100 });
  for (const folder of nested ?? []) {
    if (!folder.name) continue;
    const { data: inner } = await admin.storage.from("recordings").list(`${data.user.id}/${folder.name}`, { limit: 1000 });
    const innerPaths = (inner ?? []).map((file) => `${data.user.id}/${folder.name}/${file.name}`);
    if (innerPaths.length > 0) await admin.storage.from("recordings").remove(innerPaths);
  }

  await admin.from("deletion_requests").insert({ user_id: data.user.id, completed_at: new Date().toISOString() });
  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return NextResponse.json({ error: "The account could not be deleted. Try again or contact support." }, { status: 500 });
  return NextResponse.json({ ok: true, removedFiles: asRows(paths).length || paths.filter((path) => asString(path)).length });
}
