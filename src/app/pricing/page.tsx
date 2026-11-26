import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, Disclaimer } from "@/components/site";
import { PLANS, formatPrice } from "@/lib/plans";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section stack-lg">
        <div>
          <h1>One free question. Then a subscription.</h1>
          <p className="lede">The free question includes the full feedback for that single answer. A full mock interview, and practice mode with hints, need a paid plan. Access is added only after Stripe confirms the payment.</p>
          <Disclaimer />
        </div>
        <div className="grid-2">
          <article className="card">
            <h2>Free question</h2>
            <p className="timer-fake" style={{ fontSize: "2rem" }}>£0</p>
            <p>One timed answer, chosen from the course questions. You get the transcript, the rubric score, and the written notes. It is marked as a single-question result.</p>
            <Link className="btn btn-secondary" href="/sign-up">Create an account</Link>
          </article>
          {PLANS.map((plan) => (
            <article className="card" key={plan.code}>
              <h2>{plan.name}</h2>
              <p className="timer-fake" style={{ fontSize: "2rem" }}>{formatPrice(plan.amountPence)} <span className="small">/ month</span></p>
              <p>{plan.description}</p>
              <p className="small muted">{plan.mockQuota == null ? "Unlimited mock interviews while the subscription is active." : `${plan.mockQuota} mock interviews each billing period. Unused interviews do not roll over.`}</p>
              <Link className="btn btn-primary" href="/billing">Subscribe</Link>
            </article>
          ))}
        </div>
        <p className="small muted">
          Prices are in pounds and are the amounts the owner asked to start from. They can be changed in Stripe and in the plans table.
          Payments use Stripe in test mode until live keys are added. Paystack and Flutterwave are named in the billing code so they can be added later; they do not take payment yet.
          A mock that fails before any answer is saved returns the interview to the allowance. Cancelling stops the next renewal; Stripe handles the card.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
