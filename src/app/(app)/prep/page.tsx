import { FinanceCalculator, type RateFact } from "@/components/finance-calculator";
import { requireUser } from "@/lib/auth";
import { asNumber, asRows, asString } from "@/lib/text";

export const dynamic = "force-dynamic";

const checklist = [
  "I can name two modules and say what I will learn.",
  "I know the tuition on my offer and what I have paid.",
  "I know who is paying, and what they do for work.",
  "I can explain why this country, why this city, and why not home.",
  "I can explain any gap in study or work in two sentences.",
  "I have looked at accommodation, even if I have not paid yet.",
  "I have checked the maintenance figure on GOV.UK myself.",
  "I have said the answers out loud, not only in my head.",
];

export default async function PrepPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("reference_facts").select("*").order("fact_key");
  const facts = asRows(data);
  const rates: RateFact[] = facts
    .filter((fact) => asString(fact.fact_key) === "maintenance_monthly" || asString(fact.fact_key) === "maintenance_monthly_reported")
    .map((fact) => ({
      region: asString(fact.region) ?? "any",
      monthly: asNumber(fact.value_numeric) ?? 0,
      effectiveFrom: asString(fact.effective_from),
      active: fact.active !== false,
      needsVerification: fact.needs_verification === true,
      sourceUrl: asString(fact.source_url),
      lastVerifiedOn: asString(fact.last_verified_on),
      notes: asString(fact.notes),
      label: asString(fact.label) ?? "Rate",
    }));
  const cap = facts.find((fact) => asString(fact.fact_key) === "accommodation_offset_cap" && fact.needs_verification !== true);
  const held = facts.find((fact) => asString(fact.fact_key) === "funds_held_days");

  return (
    <div className="stack-lg">
      <div>
        <h1>Prepare</h1>
        <p className="muted">The real recording is usually taken alone, with a passport nearby and a quiet room. You do not get to film it again if you stumble.</p>
      </div>
      <section className="card prose">
        <h2>Answer, then the reason, then the proof</h2>
        <ol>
          <li>Answer the question in the first sentence.</li>
          <li>Give the reason that belongs to you.</li>
          <li>Add one proof: a module name, a fee, a date, a city, a job.</li>
        </ol>
        <p>Use simple English. Do not read a memorised script. Do not let someone coach you during a recording.</p>
      </section>
      <section>
        <h2>Checklist</h2>
        <ul>{checklist.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="stack">
        <h2>Maintenance calculator</h2>
        <p className="small muted">
          {asString(held?.value_text)} Source: {asString(held?.source_url) ? <a href={asString(held?.source_url) ?? "#"}>{asString(held?.source_url)}</a> : "not stored"}.
          The accommodation offset only applies to money already paid to the university for housing it arranges, and it is capped.
        </p>
        <FinanceCalculator rates={rates} offsetCap={asNumber(cap?.value_numeric) ?? 0} />
      </section>
      <section className="prose">
        <h2>Words that come up</h2>
        <p><strong>CAS.</strong> Confirmation of Acceptance for Studies. The university sends it when it is ready to support a Student visa application.</p>
        <p><strong>Pre-CAS interview.</strong> A check some universities run before they will issue a CAS. Many of them use a recorded portal. The result is pass or fail.</p>
        <p><strong>Credibility.</strong> Whether you can explain your course, your money, and your plan in a way that matches your application. This app does not decide if you are credible.</p>
        <p><strong>Maintenance.</strong> The money a Student visa application may need to show for living costs. Use the official page, and the date on the figure in this app.</p>
      </section>
    </div>
  );
}
