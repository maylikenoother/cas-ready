import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clerkServerConfigured } from "@/lib/api-user";
import { supabasePublicEnv } from "@/lib/env";

export async function createClient() {
  const env = supabasePublicEnv();
  if (!env) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseClient(env.url, env.anonKey, {
    accessToken: async () => {
      if (!clerkServerConfigured()) return null;
      const { getToken } = await auth();
      return (await getToken()) ?? null;
    },
  });
}
