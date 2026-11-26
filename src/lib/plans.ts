export type PlanCode = "starter_monthly" | "ready_monthly";

export type PublicPlan = {
  code: PlanCode;
  name: string;
  description: string;
  amountPence: number;
  currency: string;
  interval: "month";
  mockQuota: number | null;
  practiceUnlimited: boolean;
  stripePriceEnv: string;
};

export const PLANS: PublicPlan[] = [
  {
    code: "starter_monthly",
    name: "Starter",
    description: "Four full mock interviews each month, plus practice mode with hints and re-recording.",
    amountPence: 999,
    currency: "gbp",
    interval: "month",
    mockQuota: 4,
    practiceUnlimited: true,
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  {
    code: "ready_monthly",
    name: "Ready",
    description: "Unlimited full mock interviews and practice mode, for the weeks before the real interview.",
    amountPence: 2499,
    currency: "gbp",
    interval: "month",
    mockQuota: null,
    practiceUnlimited: true,
    stripePriceEnv: "STRIPE_PRICE_READY",
  },
];

export function formatPrice(amountPence: number, currency = "gbp"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase() }).format(amountPence / 100);
}

export function planByCode(code: string): PublicPlan | undefined {
  return PLANS.find((plan) => plan.code === code);
}
