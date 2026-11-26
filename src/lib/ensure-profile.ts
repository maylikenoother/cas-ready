import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function ensureProfile(userId: string, email: string | null): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const row: { id: string; email?: string } = { id: userId };
  if (email) row.email = email;
  const { error } = await admin.from("profiles").upsert(row, { onConflict: "id" });
  return !error;
}
