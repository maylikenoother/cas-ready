import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return true;
  const bucket = `${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const { data, error } = await admin
    .from("rate_limits")
    .select("count")
    .eq("bucket", bucket)
    .maybeSingle();
  if (error) {
    console.error("rate limit read failed");
    return true;
  }
  const count = typeof data?.count === "number" ? data.count : 0;
  if (count >= limit) return false;
  if (!data) {
    const { error: insertError } = await admin.from("rate_limits").insert({ bucket, count: 1, window_start: new Date().toISOString() });
    if (insertError) {
      const { data: raced } = await admin.from("rate_limits").select("count").eq("bucket", bucket).maybeSingle();
      const next = (typeof raced?.count === "number" ? raced.count : 0) + 1;
      if (next > limit) return false;
      await admin.from("rate_limits").update({ count: next }).eq("bucket", bucket);
    }
    return true;
  }
  const { error: updateError } = await admin.from("rate_limits").update({ count: count + 1 }).eq("bucket", bucket);
  return !updateError;
}
