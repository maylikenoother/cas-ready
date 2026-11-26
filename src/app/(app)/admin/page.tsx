import { notFound } from "next/navigation";
import { updateFact } from "@/app/(app)/admin/actions";
import { loadProfile, requireUser } from "@/lib/auth";
import { asNumber, asRows, asString } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { supabase, user } = await requireUser();
  const profile = await loadProfile(user.id);
  if (profile.role !== "admin") notFound();

  const [{ count: students }, { count: sessions }, { data: facts }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("sessions").select("id", { count: "exact", head: true }),
    supabase.from("reference_facts").select("*").order("fact_key"),
  ]);

  return (
    <div className="stack-lg">
      <div>
        <h1>Admin</h1>
        <p className="muted">Students: {students ?? 0}. Sessions: {sessions ?? 0}. This view does not open recordings, transcripts, or sponsor income.</p>
      </div>
      <div className="stack">
        {asRows(facts).map((fact) => {
          const id = asString(fact.id) ?? "";
          return (
            <form key={id} className="card stack" action={updateFact}>
              <h2>{asString(fact.label)}</h2>
              <input type="hidden" name="id" value={id} />
              <label className="field"><span>Number</span><input name="valueNumeric" defaultValue={asNumber(fact.value_numeric)?.toString() ?? ""} /></label>
              <label className="field"><span>Text shown to students</span><textarea name="valueText" defaultValue={asString(fact.value_text) ?? ""} /></label>
              <label className="field"><span>Source URL</span><input name="sourceUrl" defaultValue={asString(fact.source_url) ?? ""} /></label>
              <label className="field"><span>Last verified</span><input name="lastVerifiedOn" type="date" defaultValue={asString(fact.last_verified_on) ?? ""} /></label>
              <label className="field"><span>Notes</span><textarea name="notes" defaultValue={asString(fact.notes) ?? ""} /></label>
              <label className="check"><input type="checkbox" name="needsVerification" value="yes" defaultChecked={fact.needs_verification === true} /><span>Needs verification. Flagged figures are not used as confirmed rates.</span></label>
              <label className="check"><input type="checkbox" name="active" value="yes" defaultChecked={fact.active !== false} /><span>Active</span></label>
              <button className="btn btn-secondary" type="submit">Save figure</button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
