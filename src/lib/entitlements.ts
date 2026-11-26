export type SessionMode = "trial" | "practice" | "mock";

export type SubscriptionSnapshot = {
  status: string;
  mockQuota: number | null;
  mocksRemaining: number | null;
  periodEnd: string | null;
};

export type AccessDecision =
  | { ok: true; consume: "trial" | "mock" | "practice" }
  | { ok: false; reason: "trial_used" | "subscription_required" | "no_mocks_left" };

const OPEN_STATUSES = new Set(["active", "trialing"]);

export function decideAccess(input: {
  mode: SessionMode;
  trialConsumed: boolean;
  subscription: SubscriptionSnapshot | null;
  now?: Date;
}): AccessDecision {
  if (input.mode === "trial") {
    return input.trialConsumed ? { ok: false, reason: "trial_used" } : { ok: true, consume: "trial" };
  }

  const subscription = input.subscription;
  const now = input.now ?? new Date();
  const periodOk =
    !subscription?.periodEnd || new Date(subscription.periodEnd).getTime() > now.getTime();
  const open = Boolean(subscription && OPEN_STATUSES.has(subscription.status) && periodOk);
  if (!open) return { ok: false, reason: "subscription_required" };

  if (input.mode === "practice") return { ok: true, consume: "practice" };

  if (subscription?.mockQuota == null) return { ok: true, consume: "mock" };
  if ((subscription?.mocksRemaining ?? 0) > 0) return { ok: true, consume: "mock" };
  return { ok: false, reason: "no_mocks_left" };
}

export function accessMessage(reason: "trial_used" | "subscription_required" | "no_mocks_left"): string {
  if (reason === "trial_used") {
    return "The free question has already been used. A subscription unlocks full mock interviews and practice.";
  }
  if (reason === "no_mocks_left") {
    return "The mock interviews included in this billing period have been used. Practice mode is still open, or you can wait until the subscription renews.";
  }
  return "A full mock interview and further practice need an active subscription. The free question stays available until it is used.";
}
