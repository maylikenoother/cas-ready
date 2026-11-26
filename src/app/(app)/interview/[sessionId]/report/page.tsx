import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/site";
import { requireUser } from "@/lib/auth";
import { bandLabel, bandMeaning, type Band } from "@/lib/bands";
import { asNumber, asRow, asRows, asString, asStringList, categoryLabel, formatWhen } from "@/lib/text";
import { PRIMARY_REPORT_CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { supabase, user } = await requireUser();
  const { data: sessionData } = await supabase.from("sessions").select("*").eq("id", sessionId).eq("user_id", user.id).maybeSingle();
  const session = asRow(sessionData);
  if (!session) notFound();
  if (asString(session.status) !== "completed") {
    return (
      <div className="stack">
        <h1>Report not ready</h1>
        <p>Finish the interview to see the scores.</p>
        <Link className="btn btn-primary" href={`/interview/${sessionId}`}>Continue</Link>
      </div>
    );
  }

  const { data: questionData } = await supabase.from("session_questions").select("id, position, prompt").eq("session_id", sessionId).order("position");
  const { data: answerData } = await supabase.from("answers").select("*").eq("session_id", sessionId);
  const answers = new Map(asRows(answerData).map((answer) => [asString(answer.session_question_id), answer]));
  const categories = asRow(session.category_scores) ?? {};
  const band = asString(session.band);
  const shown = PRIMARY_REPORT_CATEGORIES.filter((key) => asNumber(categories[key]) != null);
  const extra = Object.keys(categories).filter((key) => !shown.includes(key as typeof shown[number]) && asNumber(categories[key]) != null);

  return (
    <div className="stack-lg">
      <div>
        <p className="small muted">{formatWhen(asString(session.completed_at))} · {asString(session.mode)}{session.partial === true ? " · partial result" : ""}</p>
        <h1>Practice report</h1>
        <Disclaimer />
      </div>
      <div className="grid-2">
        <article className="card">
          <p className="small">Overall practice score</p>
          <p style={{ fontSize: "3rem", margin: "8px 0" }}>{asNumber(session.overall_score) ?? "—"}</p>
          {band === "green" || band === "amber" || band === "red" ? (
            <>
              <span className={`band band-${band}`}><i /> {bandLabel(band)}</span>
              <p>{bandMeaning(band as Band)}</p>
            </>
          ) : <p>A readiness band was withheld because too few answers had words to score.</p>}
          <a className="btn btn-secondary" href={`/api/reports/${sessionId}/pdf`}>Download PDF</a>
        </article>
        <article className="card">
          <h2>By topic</h2>
          <div className="bars">
            {[...shown, ...extra].map((key) => {
              const score = asNumber(categories[key]) ?? 0;
              return (
                <div className="bar-row" key={key}>
                  <span>{categoryLabel(key)}</span>
                  <div className="track" aria-hidden="true"><span style={{ width: `${score}%` }} /></div>
                  <span>{score}</span>
                </div>
              );
            })}
          </div>
        </article>
      </div>
      <p>{asString(session.summary)}</p>
      <div className="stack">
        {asRows(questionData).map((question) => {
          const answer = answers.get(asString(question.id));
          const feedback = asRow(answer?.ai_feedback);
          const videoPath = asString(answer?.video_path);
          return (
            <article className="card stack" key={asString(question.id)}>
              <h2>{asNumber(question.position)}. {asString(question.prompt)}</h2>
              <p>Score {asNumber(answer?.answer_score) ?? "—"}. Delivery {asNumber(answer?.delivery_score) ?? "—"}. Content {asNumber(answer?.content_score) ?? "no transcript"}.</p>
              {asString(answer?.transcript) ? <p>{asString(answer?.transcript)}</p> : <p className="muted">No transcript stored.</p>}
              {asStringList(feedback?.improvements).map((item) => <p key={item}>{item}</p>)}
              {asStringList(feedback?.suggested_answer_outline).length > 0 ? (
                <div>
                  <p><strong>Prompts for next time, not a script:</strong></p>
                  <ul>{asStringList(feedback?.suggested_answer_outline).map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
              {Array.isArray(answer?.flags) ? answer.flags.filter((flag): flag is string => typeof flag === "string").map((flag) => <p key={flag} className="banner">{flag}</p>) : null}
              {(asNumber(answer?.left_screen_count) ?? 0) > 0 ? <p className="small">You left the screen {asNumber(answer?.left_screen_count)} time(s). In the real interview, leaving the page can interrupt the recording. This is a reminder, not a judgement.</p> : null}
              {videoPath ? <Recording path={videoPath} /> : null}
            </article>
          );
        })}
      </div>
      <Link href="/interview/new">Practise again</Link>
    </div>
  );
}

async function Recording({ path }: { path: string }) {
  const { requireUser: requireAgain } = await import("@/lib/auth");
  const { supabase } = await requireAgain();
  const { data } = await supabase.storage.from("recordings").createSignedUrl(path, 600);
  if (!data?.signedUrl) return <p className="small">The recording is stored, but a playback link could not be made.</p>;
  return <video controls src={data.signedUrl} style={{ width: "min(100%, 420px)", borderRadius: 12 }} />;
}
