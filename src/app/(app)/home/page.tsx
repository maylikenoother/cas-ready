import Image from "next/image";
import Link from "next/link";
import { Disclaimer } from "@/components/site";
import { loadProfile, loadSubscription, requireUser } from "@/lib/auth";
import { bandLabel, type Band } from "@/lib/bands";
import { asNumber, asRow, asRows, asString, categoryLabel, formatWhen } from "@/lib/text";
import { PRIMARY_REPORT_CATEGORIES } from "@/lib/categories";
import { weakestCategory } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function HomeDashboard() {
  const { supabase, user } = await requireUser();
  const profile = await loadProfile(user.id);
  const subscription = await loadSubscription(user.id);
  const { data } = await supabase
    .from("sessions")
    .select("id, mode, status, overall_score, band, partial, created_at, category_scores")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);
  const sessions = asRows(data);
  const latest = sessions.find((session) => asString(session.status) === "completed");
  const categories = asRow(latest?.category_scores) ?? {};
  const numericCategories = Object.fromEntries(Object.entries(categories).flatMap(([key, value]) => {
    const score = asNumber(value);
    return score == null ? [] : [[key, score]];
  }));
  const weak = weakestCategory(numericCategories, PRIMARY_REPORT_CATEGORIES.filter((item) => item !== "communication"));
  const band = asString(latest?.band);
  const open = sessions.find((session) => asString(session.status) === "ready" || asString(session.status) === "in_progress");

  return (
    <div className="stack-lg">
      <div className="grid-2" style={{ alignItems: "center" }}>
        <div>
          <p className="kicker">Your practice</p>
          <h1>{profile.fullName ? `Hello, ${profile.fullName.split(" ")[0]}` : "Your practice"}</h1>
          <p className="muted">One quiet room. Your own words.</p>
          <Disclaimer compact />
        </div>
        <Image unoptimized src="/illustrations/calm.svg" alt="" width={160} height={160} />
      </div>
      <div className="grid-2">
        <article className="card stack">
          <h2>Next step</h2>
          {open ? <p>You have an interview in progress.</p> : null}
          {!profile.trialConsumed ? <p>Your free question is ready.</p> : <p>The free question has been used.</p>}
          <div className="actions">
            {open ? <Link className="btn btn-primary" href={`/interview/${asString(open.id)}`}>Continue</Link> : null}
            <Link className="btn btn-primary" href="/interview/new">Start an interview</Link>
            <Link className="btn btn-secondary" href="/profile">Edit profile</Link>
          </div>
        </article>
        <article className="card stack">
          <h2>Latest result</h2>
          {latest && asNumber(latest.overall_score) != null ? (
            <>
              <p className="score-figure">{asNumber(latest.overall_score)}</p>
              {band === "green" || band === "amber" || band === "red" ? (
                <span className={`band band-${band}`}><i /> {bandLabel(band as Band)}</span>
              ) : <p>No readiness band on that session.</p>}
              {latest.partial === true ? <p className="small">Partial result. A full mock covers more topics.</p> : null}
              {weak ? <p>Spend the most time on {categoryLabel(weak)}.</p> : null}
              <Link href={`/interview/${asString(latest.id)}/report`}>Open the report</Link>
            </>
          ) : <p>No finished interview yet.</p>}
          <p className="small muted">
            {subscription && (subscription.status === "active" || subscription.status === "trialing")
              ? `Subscription ${subscription.status}. ${subscription.mockQuota == null ? "Unlimited mocks." : `${subscription.mocksRemaining ?? 0} mocks left this period.`}`
              : "No active subscription. The free question does not unlock a full mock."}
          </p>
        </article>
      </div>
      {sessions.length > 0 ? (
        <table className="history">
          <caption className="small" style={{ textAlign: "left" }}>Recent sessions</caption>
          <thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Score</th></tr></thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={asString(session.id)}>
                <td>{formatWhen(asString(session.created_at))}</td>
                <td>{asString(session.mode)}{session.partial === true ? " · partial" : ""}</td>
                <td>{asString(session.status)}</td>
                <td>{asString(session.status) === "completed" ? <Link href={`/interview/${asString(session.id)}/report`}>{asNumber(session.overall_score) ?? "Report"}</Link> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
