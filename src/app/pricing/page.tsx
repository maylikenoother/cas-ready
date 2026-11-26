import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer, SiteFooter, SiteHeader } from "@/components/site";
import { PLANS, formatPrice } from "@/lib/plans";

export const metadata: Metadata = { title: "Pricing" };

const faqs = [
  ["When does a plan start?", "After Stripe confirms the payment. The success page does not unlock anything by itself."],
  ["What if a mock fails to start?", "If no answer was saved, that interview goes back on your allowance."],
  ["Can I cancel?", "Yes. Cancelling stops the next renewal. Stripe keeps the card."],
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section stack-lg">
        <div>
          <h1>One free question.</h1>
          <p className="lede">Then a monthly plan for full mocks.</p>
          <Disclaimer />
        </div>
        <div className="grid-3">
          <article className="card stack">
            <h2>Free</h2>
            <p className="score-figure" style={{ fontSize: "2.4rem" }}>£0</p>
            <p>One timed answer, with notes.</p>
            <Link className="btn btn-secondary" href="/sign-up">Create an account</Link>
          </article>
          {PLANS.map((plan) => (
            <article className="card stack" key={plan.code}>
              <h2>{plan.name}</h2>
              <p className="score-figure" style={{ fontSize: "2.4rem" }}>{formatPrice(plan.amountPence)}</p>
              <p>{plan.mockQuota == null ? "Unlimited mocks." : `${plan.mockQuota} mocks a month.`}</p>
              <Link className="btn btn-primary" href="/billing">Subscribe</Link>
            </article>
          ))}
        </div>
        <section className="faq stack">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
