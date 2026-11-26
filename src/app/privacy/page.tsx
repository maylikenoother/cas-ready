import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site";
import { geminiTier } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy notice" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const tier = geminiTier();
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section prose">
        <h1>Privacy notice</h1>
        <p>This notice is written for students using CAS Ready. It is not a substitute for legal advice, and it has not been reviewed by a lawyer. Read it before you record anything.</p>
        <h2>Who we are</h2>
        <p>CAS Ready is an independent practice service for people preparing for a UK university pre-CAS interview. It is not a university, not UK Visas and Immigration, and not Enroly. The operator of the deployment is the person or organisation who hosts this copy of the app. Their contact address should be added here before a public launch.</p>
        <h2>What we collect</h2>
        <ul>
          <li>Account data: email address, name, home country, and the time you accepted the terms and the recording notice.</li>
          <li>Study profile: university, course, qualifications, English test, accommodation plans, and career goal.</li>
          <li>Money details you choose to type: tuition, deposit, sponsor name, occupation, and income. Sponsor income is stored in a separate table that the student can read and that the university and agent views cannot.</li>
          <li>Interview data: video, audio, a transcript, timing measurements, scores, and the written feedback.</li>
          <li>Payment references from Stripe: customer id, subscription id, plan, and status. Card numbers stay with Stripe.</li>
        </ul>
        <h2>Why</h2>
        <p>We use this information to run your account, score practice answers, show your history, and provide the subscription you pay for. The lawful bases to confirm before launch are contract (the account and the subscription) and consent (recording, and sending audio to the model provider). A data protection impact assessment is still required before a production launch that stores student video.</p>
        <h2>Recording</h2>
        <p>The camera and microphone start only after you accept the recording notice. Lighting is an average brightness check. The app does not detect faces, emotion, personality, or honesty. A count of times you leave the screen during a mock is stored as a reminder, not as an accusation.</p>
        <h2>The model provider</h2>
        {tier === "paid" ? (
          <p>This deployment is configured as the paid Gemini tier (`GEMINI_TIER=paid`). Google&apos;s paid Gemini API terms say that prompts and responses are not used to improve Google products. Setting the variable does not itself enable billing. The operator must turn billing on in the Google project. The model name is set with `GEMINI_MODEL` and currently defaults to Gemini 2.5 Flash.</p>
        ) : (
          <p>This deployment is configured as the free Gemini tier. Google may use content sent on the free tier to improve its products. Do not say anything in an answer that you would not want processed that way. Moving to the paid tier, which Google says is not used for training, is a configuration change: enable billing on the Google project and set `GEMINI_TIER=paid`. No application code has to change.</p>
        )}
        <p>Audio and the question are sent from the server. The API key never goes to the browser.</p>
        <h2>Where it is stored</h2>
        <p>Account data and scores are in Supabase Postgres. Recordings are in a private Storage bucket. The browser only receives a short-lived signed link for your own file. Row Level Security is enabled on every application table. Other students cannot read your rows.</p>
        <h2>How long</h2>
        <p>Recordings, transcripts, and model notes are removed after 90 days (or the `RETENTION_DAYS` value set on the server). Scores can remain so your progress history still makes sense. You can delete the whole account sooner from Settings. Deletion removes the login, the profile, the money details, the sessions, and the files in your folder.</p>
        <h2>Who else sees it</h2>
        <p>University and agent accounts, when those dashboards are switched on, can see a summary of linked students: name, country, number of finished sessions, and the latest practice score. They do not get sponsor income, transcripts, or video through that view. An admin can see account metadata and edit reference figures. The admin screen in this version does not play recordings.</p>
        <h2>Your rights</h2>
        <p>If the UK GDPR applies, you can ask for access, correction, deletion, and a copy of your data, and you can complain to the Information Commissioner&apos;s Office. Deletion is also built into Settings. There is no separate export button yet; ask the operator if you need a copy before you delete.</p>
        <h2>Children</h2>
        <p>CAS Ready is for university applicants. Do not use it if you are under 18.</p>
      </main>
      <SiteFooter />
    </>
  );
}
