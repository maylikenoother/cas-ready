import Image from "next/image";
import Link from "next/link";
import { Disclaimer, SiteFooter, SiteHeader } from "@/components/site";

const steps = [
  ["Read", "A question appears. You get a short pause."],
  ["Answer", "The camera records. A mock cannot be redone."],
  ["Continue", "The next question starts when the timer ends."],
  ["Review", "A topic score, a band, and a PDF."],
];

const topics = ["Course", "University", "UK", "Money", "Career", "Home"];

const faqs = [
  ["Is this the real interview?", "No. You practise the shape of it here. The university marks its own recording."],
  ["What is free?", "One timed question, with the notes for that answer. A full mock needs a subscription."],
  ["Does a high score mean I pass?", "No. The band is a practice guide. It does not predict a CAS or a visa."],
  ["What is recorded?", "Video and audio, after you agree. You can delete the account. Lighting is brightness only."],
  ["What if the camera fails?", "You can still run the timer and type the answer."],
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <div className="wrap">
          <section className="hero section">
            <div className="rise">
              <p className="kicker">For students heading to the UK</p>
              <h1>Practise the interview that is recorded once.</h1>
              <p className="lede">A question, a short pause, then a timed answer to the camera.</p>
              <div className="actions">
                <Link className="btn btn-primary" href="/sign-in">Start with one free question</Link>
                <Link className="btn btn-secondary" href="/pricing">See plans</Link>
              </div>
              <Disclaimer />
            </div>
            <Image unoptimized className="hero-art rise" src="/illustrations/hero.svg" alt="" width={480} height={420} priority />
          </section>

          <section className="section">
            <div className="grid-2" style={{ alignItems: "center", marginBottom: 32 }}>
              <div>
                <h2>How it works</h2>
                <p className="muted">Four short steps. Then you know what to fix.</p>
              </div>
              <Image unoptimized src="/illustrations/steps.svg" alt="" width={160} height={160} />
            </div>
            <div className="grid-2" style={{ marginTop: 32 }}>
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

          <section className="section grid-2">
            <Image unoptimized src="/illustrations/report.svg" alt="" width={160} height={160} />
            <div>
              <h2>What you practise</h2>
              <div className="chips">
                {topics.map((topic) => <span className="chip" key={topic}>{topic}</span>)}
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Start free</h2>
            <div className="grid-3">
              <article className="card"><h3>Free</h3><p className="score-figure" style={{ fontSize: "2rem" }}>£0</p><p className="small muted">One question.</p></article>
              <article className="card"><h3>Starter</h3><p className="score-figure" style={{ fontSize: "2rem" }}>£9.99</p><p className="small muted">Four mocks a month.</p></article>
              <article className="card"><h3>Ready</h3><p className="score-figure" style={{ fontSize: "2rem" }}>£24.99</p><p className="small muted">Unlimited mocks.</p></article>
            </div>
          </section>

          <section className="section faq stack">
            <h2>Questions</h2>
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
