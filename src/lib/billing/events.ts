import type { PlanCode } from "@/lib/plans";

export type SubscriptionStatus = "incomplete" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";

export type NormalizedBillingEvent =
  | {
      kind: "checkout_completed";
      eventId: string;
      userId: string;
      planCode: PlanCode;
      customerId: string;
      subscriptionId: string;
      periodEnd: string | null;
      paid: boolean;
    }
  | {
      kind: "subscription_updated";
      eventId: string;
      subscriptionId: string;
      userId: string | null;
      status: SubscriptionStatus;
      periodEnd: string | null;
      planCode: PlanCode | null;
    }
  | {
      kind: "subscription_deleted";
      eventId: string;
      subscriptionId: string;
    }
  | { kind: "ignored"; eventId: string };

export type StoredSubscription = {
  userId: string;
  provider: "stripe";
  providerCustomerId: string | null;
  providerSubscriptionId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  mockQuota: number | null;
  mocksRemaining: number | null;
};

type PlanQuota = { code: PlanCode; mockQuota: number | null };

export function subscriptionFromCheckout(
  event: Extract<NormalizedBillingEvent, { kind: "checkout_completed" }>,
  plan: PlanQuota,
): StoredSubscription | null {
  if (!event.paid) return null;
  if (event.planCode !== plan.code) return null;
  return {
    userId: event.userId,
    provider: "stripe",
    providerCustomerId: event.customerId,
    providerSubscriptionId: event.subscriptionId,
    planCode: plan.code,
    status: "active",
    currentPeriodEnd: event.periodEnd,
    mockQuota: plan.mockQuota,
    mocksRemaining: plan.mockQuota,
  };
}

export function subscriptionFromUpdate(
  event: Extract<NormalizedBillingEvent, { kind: "subscription_updated" }>,
  existing: StoredSubscription | null,
  plan: PlanQuota | null,
): StoredSubscription | null {
  const userId = existing?.userId || event.userId || "";
  if (!userId) return null;
  const planCode = event.planCode ?? existing?.planCode ?? plan?.code ?? null;
  if (!planCode) return null;
  const quota = plan && plan.code === planCode ? plan.mockQuota : (existing?.mockQuota ?? plan?.mockQuota ?? null);
  const periodChanged = Boolean(event.periodEnd && existing?.currentPeriodEnd && event.periodEnd !== existing.currentPeriodEnd);
  const refill = event.status === "active" && periodChanged;
  return {
    userId,
    provider: "stripe",
    providerCustomerId: existing?.providerCustomerId ?? null,
    providerSubscriptionId: event.subscriptionId,
    planCode,
    status: event.status,
    currentPeriodEnd: event.periodEnd ?? existing?.currentPeriodEnd ?? null,
    mockQuota: quota,
    mocksRemaining: refill ? quota : (existing?.mocksRemaining ?? quota),
  };
}

export function subscriptionFromDeletion(existing: StoredSubscription): StoredSubscription {
  return {
    ...existing,
    status: "canceled",
    mocksRemaining: 0,
  };
}

type StripeLikeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function periodEndIso(value: unknown): string | null {
  if (typeof value !== "number") return null;
  return new Date(value * 1000).toISOString();
}

function statusOf(value: unknown): SubscriptionStatus {
  const allowed: SubscriptionStatus[] = ["incomplete", "trialing", "active", "past_due", "canceled", "unpaid"];
  return allowed.includes(value as SubscriptionStatus) ? (value as SubscriptionStatus) : "incomplete";
}

function planCodeOf(value: unknown): PlanCode | null {
  return value === "starter_monthly" || value === "ready_monthly" ? value : null;
}

export function normaliseStripeEvent(event: StripeLikeEvent): NormalizedBillingEvent {
  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    const userId = asString(object.client_reference_id) ?? asString(metadata(object).user_id);
    const planCode = planCodeOf(metadata(object).plan_code);
    const subscriptionId = asString(object.subscription);
    const customerId = asString(object.customer);
    if (!userId || !planCode || !subscriptionId || !customerId) {
      return { kind: "ignored", eventId: event.id };
    }
    return {
      kind: "checkout_completed",
      eventId: event.id,
      userId,
      planCode,
      customerId,
      subscriptionId,
      periodEnd: null,
      paid: object.payment_status === "paid",
    };
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const subscriptionId = asString(object.id);
    if (!subscriptionId) return { kind: "ignored", eventId: event.id };
    return {
      kind: "subscription_updated",
      eventId: event.id,
      subscriptionId,
      userId: asString(metadata(object).user_id),
      status: statusOf(object.status),
      periodEnd: periodEndIso(object.current_period_end),
      planCode: planCodeOf(metadata(object).plan_code),
    };
  }

  if (event.type === "customer.subscription.deleted") {
    const subscriptionId = asString(object.id);
    if (!subscriptionId) return { kind: "ignored", eventId: event.id };
    return { kind: "subscription_deleted", eventId: event.id, subscriptionId };
  }

  return { kind: "ignored", eventId: event.id };
}

function metadata(object: Record<string, unknown>): Record<string, unknown> {
  const value = object.metadata;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
