import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Disclaimer, SiteFooter, SiteHeader } from "@/components/site";

export const metadata: Metadata = {
  title: { absolute: "CAS Ready · Practise the UK Pre-CAS credibility interview" },
  description: "Rehearse the UK university Pre-CAS credibility interview. Answer by voice or text and get scored feedback before the real call. Practice only: it does not predict a CAS or a visa.",
  openGraph: {
    title: "CAS Ready · Practise the UK Pre-CAS credibility interview",
    description: "International students rehearse the real interview format, answer by voice or text, and get scored feedback before the real call.",
    type: "website",
    locale: "en_GB",
  },
};

const steps = [
  ["Choose your course", "Add your university and course so the questions match your plan."],
  ["Answer on a timer", "A short pause, then a timed answer by voice or by typing."],
  ["Read your report", "Scores, strengths, and what to improve. You can save a PDF."],
];

const themes = [
  ["course", "Why this course"],
  ["university", "Why this university"],
  ["uk", "Why the UK"],
  ["finance", "Finances and funding"],
  ["career", "Career plans"],
  ["history", "Study and immigration history"],
];

const perks = [
  "A score for each answer, with notes on clarity and consistency.",
  "An outline to help you shape a fuller answer, in your own words.",
  "Scores kept across your mocks, so you can see what changed.",
  "Recordings stored for you. You can play them back or delete them.",
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <div className="wrap">
          <section className="hero section">
            <div className="rise">
              <p className="kicker">For international students</p>
              <h1>Practise the UK Pre-CAS credibility interview.</h1>
              <p className="lede">International students rehearse the real interview format, answer by voice or text, and get scored feedback before the real call.</p>
              <div className="actions">
                <Link className="btn btn-primary" href="/sign-in">Try a free question</Link>
                <Link className="btn btn-secondary" href="#how">See how it works</Link>
              </div>
              <Disclaimer />
            </div>
            <Image unoptimized className="hero-art rise" src="/illustrations/hero.svg" alt="" width={480} height={420} priority />
          </section>

          <section className="section" aria-labelledby="what-heading">
            <h2 id="what-heading">What is a Pre-CAS interview?</h2>
            <div className="measure">
              <p>UK universities interview many international applicants before they issue a Confirmation of Acceptance for Studies (CAS).</p>
              <p>They want to hear that you are a genuine student, with a clear reason for the course.</p>
              <p>A weak interview can delay the CAS, or stop it.</p>
            </div>
          </section>

          <section className="section" id="how" aria-labelledby="how-heading">
            <div className="grid-2" style={{ alignItems: "center", marginBottom: 32 }}>
              <div>
                <h2 id="how-heading">How it works</h2>
                <p className="muted">Three steps. Then you know what to practise.</p>
              </div>
              <Image unoptimized src="/illustrations/steps.svg" alt="" width={160} height={160} />
            </div>
            <div className="grid-3">
              {steps.map(([title, body], index) => (
                <article className="step" key={title}>
                  <div className="num">{index + 1}</div>
                  <div>
                    <h3>{title}</h3>
                    <p className="small muted">{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="practise-heading">
            <h2 id="practise-heading">What you&apos;ll practise</h2>
            <p className="muted">The themes a credibility interview usually covers.</p>
            <div className="theme-grid" style={{ marginTop: 32 }}>
              {themes.map(([id, label]) => (
                <article className="card icon-card" key={id}>
                  <ThemeIcon id={id} />
                  <h3>{label}</h3>
                </article>
              ))}
            </div>
          </section>

          <section className="section grid-2" aria-labelledby="get-heading" style={{ alignItems: "center" }}>
            <Image unoptimized src="/illustrations/report.svg" alt="" width={160} height={160} />
            <div>
              <h2 id="get-heading">What you get</h2>
              <ul className="perk-list">
                {perks.map((perk) => <li key={perk}>{perk}</li>)}
              </ul>
            </div>
          </section>

          <section className="section" aria-labelledby="who-heading">
            <div className="who-strip">
              <h2 id="who-heading">Who it&apos;s for</h2>
              <p>Students waiting for a CAS interview.</p>
              <p className="muted">Education agents and university staff can follow practice scores for students linked to their account.</p>
            </div>
          </section>

          <section className="section" aria-labelledby="price-heading">
            <div className="teaser stack">
              <h2 id="price-heading">Start with one free question</h2>
              <p>You get the score and the notes for that answer. A subscription covers full mocks.</p>
              <Link className="btn btn-secondary" href="/pricing">See plans</Link>
            </div>
          </section>

          <section className="section faq" aria-labelledby="faq-heading">
            <h2 id="faq-heading">Questions</h2>
            <details>
              <summary>Is this the official interview?</summary>
              <p>No. CAS Ready is independent practice. It is not affiliated with UKVI, Enroly, or any university, and it does not predict a CAS or a visa outcome.</p>
            </details>
            <details>
              <summary>How is my data used?</summary>
              <p>Answers and recordings are stored so you can review them, and you can delete them. Read the <Link href="/privacy">privacy notice</Link>.</p>
            </details>
            <details>
              <summary>Can I use it on my phone?</summary>
              <p>Yes. It runs in the phone browser. Speak to the camera, or type if the camera is blocked.</p>
            </details>
            <details>
              <summary>How long is a mock?</summary>
              <p>Each answer is 45, 60, or 90 seconds, after a short pause to read the question. A full mock is 4 to 10 questions.</p>
            </details>
            <details>
              <summary>What&apos;s in the free trial?</summary>
              <p>One timed question, with the score and notes for that answer. A full mock needs a subscription.</p>
            </details>
          </section>
        </div>

        <section className="cta-band">
          <div className="wrap stack">
            <h2>Rehearse before the real call.</h2>
            <p>One question is free.</p>
            <div className="actions">
              <Link className="btn btn-gold" href="/sign-in">Try a free question</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function ThemeIcon({ id }: { id: string }) {
  const common = { viewBox: "0 0 40 40", fill: "none", "aria-hidden": true } as const;
  if (id === "course") {
    return (
      <svg {...common}>
        <rect x="8" y="6" width="24" height="28" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M13 16h14M13 22h10" stroke="#F5B700" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "university") {
    return (
      <svg {...common}>
        <path d="M8 16l12-8 12 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 16v12h16V16" stroke="currentColor" strokeWidth="2" />
        <path d="M18 28v-6h4v6" stroke="#F5B700" strokeWidth="2" />
      </svg>
    );
  }
  if (id === "uk") {
    return (
      <svg {...common}>
        <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="2" />
        <path d="M8 20h24M20 8c3 3.5 3 20.5 0 24M20 8c-3 3.5-3 20.5 0 24" stroke="#F5B700" strokeWidth="2" />
      </svg>
    );
  }
  if (id === "finance") {
    return (
      <svg {...common}>
        <rect x="8" y="10" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M8 16h24" stroke="#F5B700" strokeWidth="2" />
        <path d="M14 23h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "career") {
    return (
      <svg {...common}>
        <rect x="7" y="14" width="26" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M15 14v-2a5 5 0 0 1 10 0v2" stroke="#F5B700" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="20" cy="14" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 30c1.5-6 6-8 10-8s8.5 2 10 8" stroke="#F5B700" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
