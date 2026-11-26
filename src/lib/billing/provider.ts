import "server-only";
import Stripe from "stripe";
import { billingProviderName, stripeEnv } from "@/lib/env";
import { planByCode, type PlanCode } from "@/lib/plans";
import { normaliseStripeEvent, type NormalizedBillingEvent } from "@/lib/billing/events";

export class BillingNotReadyError extends Error {}

export function assertBillingProvider() {
  const name = billingProviderName();
  if (name !== "stripe") {
    throw new BillingNotReadyError(
      `${name} is reserved for a later release. Set BILLING_PROVIDER=stripe and use Stripe test keys.`,
    );
  }
}

export async function createSubscriptionCheckout(input: {
  userId: string;
  email: string;
  planCode: PlanCode;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  assertBillingProvider();
  const env = stripeEnv();
  if (!env) throw new BillingNotReadyError("Stripe keys are not set.");
  const plan = planByCode(input.planCode);
  if (!plan) throw new BillingNotReadyError("Unknown plan.");
  const price = process.env[plan.stripePriceEnv];
  if (!price) throw new BillingNotReadyError(`${plan.stripePriceEnv} is not set.`);
  const stripe = new Stripe(env.secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email,
    client_reference_id: input.userId,
    line_items: [{ price, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { user_id: input.userId, plan_code: plan.code },
    subscription_data: { metadata: { user_id: input.userId, plan_code: plan.code } },
  });
  if (!session.url) throw new BillingNotReadyError("Stripe did not return a checkout URL.");
  return session.url;
}

export async function createPortalUrl(customerId: string, returnUrl: string): Promise<string> {
  assertBillingProvider();
  const env = stripeEnv();
  if (!env) throw new BillingNotReadyError("Stripe keys are not set.");
  const stripe = new Stripe(env.secretKey);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export function readStripeWebhook(rawBody: string, signature: string): NormalizedBillingEvent {
  assertBillingProvider();
  const env = stripeEnv();
  if (!env) throw new BillingNotReadyError("Stripe keys are not set.");
  const stripe = new Stripe(env.secretKey);
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.webhookSecret);
  const object = event.data.object;
  if (!object || typeof object !== "object") {
    return { kind: "ignored", eventId: event.id };
  }
  return normaliseStripeEvent({
    id: event.id,
    type: event.type,
    data: { object: object as unknown as Record<string, unknown> },
  });
}
