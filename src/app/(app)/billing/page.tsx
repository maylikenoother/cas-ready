import { Disclaimer } from "@/components/site";
import { CheckoutButton, PortalButton } from "@/components/billing-actions";
import { loadSubscription, requireUser } from "@/lib/auth";
import { PLANS, formatPrice } from "@/lib/plans";
import { formatWhen } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const query = await searchParams;
  const { user } = await requireUser();
  const subscription = await loadSubscription(user.id);
  const open = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <div className="stack-lg">
      <div>
        <h1>Subscription</h1>
        <p className="muted">Paying opens Stripe. CAS Ready does not mark the subscription active until Stripe sends a signed webhook.</p>
        <Disclaimer compact />
      </div>
      {query.checkout === "return" ? <p className="banner">If you just paid, wait a moment and refresh. Access appears after the webhook, not when this page loads.</p> : null}
      {query.checkout === "cancel" ? <p className="banner">Checkout was cancelled. Nothing was charged by this app.</p> : null}
      {subscription ? (
        <article className="card stack">
          <h2>Current plan</h2>
          <p>Status: {subscription.status}. Plan: {subscription.planCode ?? "unknown"}.</p>
          <p>{subscription.mockQuota == null && open ? "Unlimited mock interviews while this is active." : `${subscription.mocksRemaining ?? 0} mock interviews left in this period.`}</p>
          {subscription.periodEnd ? <p className="small">Current period ends {formatWhen(subscription.periodEnd)}.</p> : null}
          {subscription.customerId ? <PortalButton /> : null}
        </article>
      ) : <p>No subscription is stored on this account yet.</p>}
      <div className="grid-2">
        {PLANS.map((plan) => (
          <article className="card stack" key={plan.code}>
            <h2>{plan.name}</h2>
            <p>{formatPrice(plan.amountPence)} a month</p>
            <p>{plan.description}</p>
            <CheckoutButton planCode={plan.code} label={`Subscribe to ${plan.name}`} />
          </article>
        ))}
      </div>
      <p className="small muted">Use Stripe test card 4242 4242 4242 4242 while the keys are test keys.</p>
    </div>
  );
}
