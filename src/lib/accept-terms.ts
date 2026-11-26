import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export function safeNext(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/home";
  let url: URL;
  try {
    url = new URL(value, "http://local");
  } catch {
    return "/home";
  }
  if (url.origin !== "http://local") return "/home";
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/sign-up")) return "/home";
  url.searchParams.delete("error");
  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function withError(path: string, code: string): string {
  const url = new URL(safeNext(path), "http://local");
  url.searchParams.set("error", code);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function termsErrorMessage(code: string): string {
  if (code === "not_accepted") return "Tick the box to continue.";
  if (code === "origin") return "This action is not allowed from another site.";
  if (code === "save_profile" || code === "save_event" || code === "unavailable") return "The agreement could not be saved. Try again.";
  return "";
}

type ProfileError = { code?: string; message?: string } | null;

export async function acceptTerms(input: {
  userId: string | null;
  email: string | null;
  accepted: boolean;
  nextPath: string;
  sameOriginOk: boolean;
}): Promise<{ location: string; error: string | null }> {
  const nextPath = safeNext(input.nextPath);
  if (!input.sameOriginOk) {
    console.error("[consent] step=origin");
    return { location: withError(nextPath, "origin"), error: "origin" };
  }
  if (!input.userId) {
    return { location: `/sign-in?redirect_url=${encodeURIComponent(nextPath)}`, error: null };
  }
  if (!input.accepted) {
    return { location: withError(nextPath, "not_accepted"), error: "not_accepted" };
  }
  const admin = createAdminClient();
  if (!admin) {
    console.error("[consent] step=admin_client", "missing");
    return { location: withError(nextPath, "unavailable"), error: "unavailable" };
  }
  const profile: { id: string; email?: string; terms_accepted_at: string } = {
    id: input.userId,
    terms_accepted_at: new Date().toISOString(),
  };
  if (input.email) profile.email = input.email;
  const { error: profileError } = await admin.from("profiles").upsert(profile, { onConflict: "id" });
  if (profileError) {
    const failure = profileError as ProfileError;
    console.error("[consent] step=upsert_profile", failure?.code, failure?.message);
    return { location: withError(nextPath, "save_profile"), error: "save_profile" };
  }
  const { error: eventError } = await admin.from("consent_events").insert({
    user_id: input.userId,
    kind: "terms",
    accepted: true,
  });
  if (eventError) {
    const failure = eventError as ProfileError;
    console.error("[consent] step=insert_event", failure?.code, failure?.message);
    return { location: withError(nextPath, "save_event"), error: "save_event" };
  }
  return { location: nextPath, error: null };
}
