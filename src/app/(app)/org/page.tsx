import { requireUser } from "@/lib/auth";
import { asNumber, asRows, asString } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function OrganisationPage() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("org_student_summaries");
  const rows = asRows(data);

  return (
    <div className="stack">
      <h1>Organisation</h1>
      <p className="muted">
        University staff and agents see linked students here: name, country, finished sessions, and the latest practice score.
        Sponsor income, transcripts, and video are not included. Linking a student is done in the database until a fuller dashboard is built.
      </p>
      {error ? <p className="banner banner-warn">The summary could not be loaded.</p> : null}
      {rows.length === 0 ? <p>No linked students. An admin can add a row to student_org_links for this account&apos;s organisation.</p> : (
        <table className="history">
          <thead><tr><th>Name</th><th>Country</th><th>Finished</th><th>Latest score</th><th>Band</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={asString(row.student_id)}>
                <td>{asString(row.full_name) || asString(row.email) || "Student"}</td>
                <td>{asString(row.home_country) ?? "—"}</td>
                <td>{asNumber(row.sessions_completed) ?? 0}</td>
                <td>{asNumber(row.latest_score) ?? "—"}</td>
                <td>{asString(row.latest_band) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
