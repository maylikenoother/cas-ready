import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdminEnv } from "@/lib/env";

export function createAdminClient() {
  const env = supabaseAdminEnv();
  if (!env) return null;
  return createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
