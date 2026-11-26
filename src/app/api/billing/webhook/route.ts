import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingNotReadyError, readStripeWebhook } from "@/lib/billing/provider";
import { planByCode } from "@/lib/plans";
import {
  subscriptionFromCheckout,
  subscriptionFromDeletion,
  subscriptionFromUpdate,
  type StoredSubscription,
} from "@/lib/billing/events";
import { asNumber, asRow, asRows, asString } from "@/lib/text";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const raw = await request.text();
  let event;
  try {
    event = readStripeWebhook(raw, signature);
  } catch (error) {
    const message = error instanceof BillingNotReadyError ? error.message : "The webhook signature was rejected.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Database key is not configured." }, { status: 500 });

  const { error: insertError } = await admin.from("billing_events").insert({
    provider: "stripe",
    event_id: event.eventId,
    event_type: event.kind,
    payload: { kind: event.kind },
  });
  if (insertError && insertError.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (insertError) return NextResponse.json({ error: "The event could not be stored." }, { status: 500 });

  try {
    if (event.kind === "checkout_completed") {
      const plan = planByCode(event.planCode);
      const row = plan ? subscriptionFromCheckout(event, { code: plan.code, mockQuota: plan.mockQuota }) : null;
      if (row) await upsertSubscription(admin, row);
    }
    if (event.kind === "subscription_updated") {
      const existing = await loadSubscription(admin, event.subscriptionId);
      const plan = event.planCode ? planByCode(event.planCode) : existing ? planByCode(existing.planCode) : undefined;
      const row = subscriptionFromUpdate(
        event,
        existing,
        plan ? { code: plan.code, mockQuota: plan.mockQuota } : null,
      );
      if (row?.userId) await upsertSubscription(admin, row);
    }
    if (event.kind === "subscription_deleted") {
      const existing = await loadSubscription(admin, event.subscriptionId);
      if (existing) await upsertSubscription(admin, subscriptionFromDeletion(existing));
    }
  } catch (error) {
    console.error("billing apply failed", error instanceof Error ? error.name : "unknown");
    await admin.from("billing_events").delete().eq("provider", "stripe").eq("event_id", event.eventId);
    return NextResponse.json({ error: "The event could not be applied." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function loadSubscription(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  subscriptionId: string,
): Promise<StoredSubscription | null> {
  const { data } = await admin.from("subscriptions").select("*").eq("provider_subscription_id", subscriptionId).maybeSingle();
  const row = asRow(data);
  if (!row) return null;
  const planCode = asString(row.plan_code);
  if (planCode !== "starter_monthly" && planCode !== "ready_monthly") return null;
  const status = asString(row.status);
  return {
    userId: asString(row.user_id) ?? "",
    provider: "stripe",
    providerCustomerId: asString(row.provider_customer_id),
    providerSubscriptionId: asString(row.provider_subscription_id) ?? subscriptionId,
    planCode,
    status: status === "active" || status === "trialing" || status === "past_due" || status === "canceled" || status === "unpaid" || status === "incomplete" ? status : "incomplete",
    currentPeriodEnd: asString(row.current_period_end),
    mockQuota: asNumber(row.mock_quota),
    mocksRemaining: asNumber(row.mocks_remaining),
  };
}

async function upsertSubscription(admin: NonNullable<ReturnType<typeof createAdminClient>>, row: StoredSubscription) {
  if (row.status === "active" || row.status === "trialing") {
    await admin
      .from("subscriptions")
      .update({ status: "canceled", mocks_remaining: 0 })
      .eq("user_id", row.userId)
      .in("status", ["active", "trialing"])
      .neq("provider_subscription_id", row.providerSubscriptionId);
  }
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("provider_subscription_id", row.providerSubscriptionId)
    .maybeSingle();
  const payload = {
    user_id: row.userId,
    provider: row.provider,
    provider_customer_id: row.providerCustomerId,
    provider_subscription_id: row.providerSubscriptionId,
    plan_code: row.planCode,
    status: row.status,
    current_period_end: row.currentPeriodEnd,
    mock_quota: row.mockQuota,
    mocks_remaining: row.mocksRemaining,
  };
  if (asRows(existing ? [existing] : []).length > 0) {
    const { error } = await admin.from("subscriptions").update(payload).eq("provider_subscription_id", row.providerSubscriptionId);
    if (error) throw error;
    return;
  }
  const { error } = await admin.from("subscriptions").insert(payload);
  if (error) throw error;
}
