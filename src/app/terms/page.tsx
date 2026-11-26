import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section prose">
        <h1>Terms of use</h1>
        <p>These terms have not been reviewed by a lawyer. Do not treat them as final legal wording for a public launch.</p>
        <h2>The service</h2>
        <p>CAS Ready lets you rehearse a recorded pre-CAS style interview and read practice feedback. It is not the interview a university runs, and it is not a visa application.</p>
        <h2>No prediction</h2>
        <p>Scores, bands, and written notes are practice feedback. They do not predict or guarantee a CAS, a visa, an interview pass, or an offer. A Green band means the practice answers were specific. It means nothing about a real decision.</p>
        <h2>Your answers</h2>
        <p>You agree that the answers are your own practice, that you will not ask someone else to speak for you, and that you understand a real interview is taken alone. You are responsible for checking fees, visa figures, and course details on the official pages. Some figures in the app are flagged because they still need verification.</p>
        <h2>Accounts</h2>
        <p>You need an email address you can open. One free question is included. Further mock interviews and practice mode require a subscription. We grant that access only after the payment provider confirms it. If a mock ends with no saved answer because of a technical failure, the allowance is returned.</p>
        <h2>Acceptable use</h2>
        <p>Do not upload someone else&apos;s recording, attempt to break the service, or use it to mislead a university. We may suspend an account that does.</p>
        <h2>Subscriptions</h2>
        <p>Plans renew monthly until you cancel in the billing portal. Fees already paid are not refunded automatically. The operator should add a refund policy before taking live payments.</p>
        <h2>Liability</h2>
        <p>The service is provided as practice software. To the extent the law allows, the operator is not liable for a refused CAS, a refused visa, or a decision you take from a practice score. Nothing in these terms limits liability that cannot legally be limited.</p>
        <h2>Changes</h2>
        <p>The question bank, the rubric, and these pages can change. The version you see on the site is the current one.</p>
      </main>
      <SiteFooter />
    </>
  );
}
