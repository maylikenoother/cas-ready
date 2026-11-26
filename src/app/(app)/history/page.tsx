import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { asNumber, asRows, asString, formatWhen } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("sessions")
    .select("id, mode, status, overall_score, band, partial, created_at, question_count")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const sessions = asRows(data);

  return (
    <div className="stack">
      <h1>History</h1>
      {sessions.length === 0 ? <p>No interviews yet.</p> : (
        <table className="history">
          <thead><tr><th>Date</th><th>Type</th><th>Questions</th><th>Status</th><th>Score</th><th>Band</th></tr></thead>
          <tbody>
            {sessions.map((session) => {
              const id = asString(session.id);
              const status = asString(session.status);
              return (
                <tr key={id}>
                  <td>{formatWhen(asString(session.created_at))}</td>
                  <td>{asString(session.mode)}{session.partial === true ? " · partial" : ""}</td>
                  <td>{asNumber(session.question_count)}</td>
                  <td>{status === "ready" || status === "in_progress" ? <Link href={`/interview/${id}`}>Continue</Link> : status}</td>
                  <td>{status === "completed" ? <Link href={`/interview/${id}/report`}>{asNumber(session.overall_score) ?? "Open"}</Link> : "—"}</td>
                  <td>{asString(session.band) ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
