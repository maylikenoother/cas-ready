import Link from "next/link";
import { SiteFooter, SiteHeader, Disclaimer } from "@/components/site";

const steps = [
  ["See the question", "It stays on the screen. You get about 15 seconds to read it. Nobody reads it out unless you ask your own device to."],
  ["Answer to the camera", "Recording starts on its own. A full mock does not let you re-record. That is how the real recorded interview behaves."],
  ["Move on", "The next question appears when the timer ends. Questions are drawn from a bank, so a script will not hold."],
  ["Read the practice report", "You get a score by topic, a Green, Amber, or Red band when there is enough to score, a transcript, and a PDF."],
];

const topics = ["Course", "University", "Why the UK", "Money", "Career", "Study history", "Accommodation", "Research", "Previous visas"];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <div className="wrap">
          <section className="hero">
            <div>
              <p className="eyebrow" style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", fontSize: "0.82rem" }}>
                For students heading to the UK
              </p>
              <h1>Practise the interview that is recorded once.</h1>
              <p className="lede">
                Many UK universities ask international applicants to pass a short recorded credibility interview before they issue a CAS.
                CAS Ready copies that shape: a question on screen, a brief pause, then a timed answer to the camera.
              </p>
              <div className="actions">
                <Link className="btn btn-primary" href="/login">Start with one free question</Link>
                <Link className="btn btn-secondary" href="/pricing">See plans</Link>
              </div>
              <div style={{ marginTop: 16 }}>
                <Disclaimer />
              </div>
            </div>
            <div className="preview" aria-hidden="true">
              <div>
                <div className="eyebrow">Question 3 of 8 · Mock</div>
                <p>Why did you choose this course instead of a similar one elsewhere?</p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <span className="rec"><i /> Recording</span>
                <span className="timer-fake">0:42</span>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>What the real interview is like</h2>
            <p className="muted">
              Universities describe a task in a portal such as Enroly CAS Shield. You are alone, the camera and microphone are on,
              you may be asked to show your passport, and each question is answered straight to camera. The recording is marked pass or fail.
              CAS Ready does not collect a passport photo. It rehearses the timing, the silence, and the answers.
            </p>
            <div className="steps" style={{ marginTop: 16 }}>
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
            <article className="card">
              <h2>Two ways to practise</h2>
              <p><strong>Free question.</strong> One timed answer, with the full feedback for that answer. No card.</p>
              <p><strong>Mock.</strong> A subscription interview. Core topics come first, then the order is mixed. No re-record.</p>
              <p><strong>Practice mode.</strong> Hints, and you may record again. Included with a subscription, not with the free question.</p>
            </article>
            <article className="card">
              <h2>What the report covers</h2>
              <div className="chips">
                {topics.map((topic) => <span className="chip" key={topic}>{topic}</span>)}
              </div>
              <p className="small muted">
                Scores use a fixed rubric for timing and for whether the answer actually covers the question, then written notes from the model configured on the server.
                Bands are 80 and above Green, 55 to 79 Amber, below 55 Red. They are a practice guide, and they have not been validated by an admissions team.
              </p>
            </article>
          </section>

          <section className="section">
            <h2>Built for a cheap Android phone</h2>
            <div className="grid-3">
              <article className="card"><h3>Small recordings</h3><p className="small muted">Video is kept around 700 kbps so a slow connection can still upload an answer.</p></article>
              <article className="card"><h3>Camera trouble has a way through</h3><p className="small muted">If the camera is blocked, you can still run the timer and type what you would have said.</p></article>
              <article className="card"><h3>Your money details stay private</h3><p className="small muted">Sponsor income is stored apart from the profile a university or agent view can see. You can delete the account yourself.</p></article>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
