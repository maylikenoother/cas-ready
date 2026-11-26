import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function deleteAccountData(admin: SupabaseClient, userId: string): Promise<number> {
  const removed = await removeRecordings(admin, userId);
  await admin.from("deletion_requests").insert({ user_id: userId, completed_at: new Date().toISOString() });
  await admin.from("profiles").delete().eq("id", userId);
  return removed;
}

async function removeRecordings(admin: SupabaseClient, userId: string): Promise<number> {
  const paths: string[] = [];
  const { data: top } = await admin.storage.from("recordings").list(userId, { limit: 1000 });
  for (const entry of top ?? []) {
    if (!entry.name) continue;
    const nestedPath = `${userId}/${entry.name}`;
    const { data: inner } = await admin.storage.from("recordings").list(nestedPath, { limit: 1000 });
    if (inner && inner.length > 0) {
      for (const file of inner) {
        if (file.name) paths.push(`${nestedPath}/${file.name}`);
      }
    } else {
      paths.push(nestedPath);
    }
  }
  if (paths.length > 0) await admin.storage.from("recordings").remove(paths);
  return paths.length;
}
