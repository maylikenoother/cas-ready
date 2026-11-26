import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asNumber, asRow, asString } from "@/lib/text";

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

export async function loadProfile(userId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, home_country, recording_consent_at, terms_accepted_at, trial_consumed")
    .eq("id", userId)
    .maybeSingle();
  const row = asRow(data);
  return {
    id: userId,
    email: asString(row?.email),
    fullName: asString(row?.full_name) ?? "",
    role: asString(row?.role) ?? "student",
    homeCountry: asString(row?.home_country) ?? "",
    recordingConsentAt: asString(row?.recording_consent_at),
    termsAcceptedAt: asString(row?.terms_accepted_at),
    trialConsumed: row?.trial_consumed === true,
  };
}

export type LoadedProfile = Awaited<ReturnType<typeof loadProfile>>;

export async function loadSubscription(userId: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan_code, mock_quota, mocks_remaining, current_period_end, provider_customer_id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due", "canceled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = asRow(data);
  if (!row) return null;
  return {
    status: asString(row.status) ?? "",
    planCode: asString(row.plan_code),
    mockQuota: asNumber(row.mock_quota),
    mocksRemaining: asNumber(row.mocks_remaining),
    periodEnd: asString(row.current_period_end),
    customerId: asString(row.provider_customer_id),
  };
}
