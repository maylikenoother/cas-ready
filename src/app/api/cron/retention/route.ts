import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asRows, asString } from "@/lib/text";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database key is not configured." }, { status: 500 });

  const { data } = await admin
    .from("answers")
    .select("id, video_path")
    .lt("retain_until", new Date().toISOString())
    .not("transcript", "is", null)
    .limit(100);
  const rows = asRows(data);
  const paths = rows.map((row) => asString(row.video_path)).filter((path): path is string => Boolean(path));
  if (paths.length > 0) await admin.storage.from("recordings").remove(paths);
  const ids = rows.map((row) => asString(row.id)).filter((id): id is string => Boolean(id));
  if (ids.length > 0) {
    await admin
      .from("answers")
      .update({ transcript: null, typed_notes: null, ai_feedback: null, video_path: null })
      .in("id", ids);
  }
  return NextResponse.json({ cleared: ids.length });
}
