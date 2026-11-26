"use client";

import { useMemo, useState } from "react";
import { convertWithRate, estimateFunds, pickRate } from "@/lib/finance";

export type RateFact = {
  region: string;
  monthly: number;
  effectiveFrom: string | null;
  active: boolean;
  needsVerification: boolean;
  sourceUrl: string | null;
  lastVerifiedOn: string | null;
  notes: string | null;
  label: string;
};

export function FinanceCalculator({ rates, offsetCap }: { rates: RateFact[]; offsetCap: number }) {
  const [region, setRegion] = useState<"london" | "outside_london">("outside_london");
  const [onDate, setOnDate] = useState("2026-11-26");
  const [months, setMonths] = useState(9);
  const [tuition, setTuition] = useState(19300);
  const [deposit, setDeposit] = useState(0);
  const [accommodation, setAccommodation] = useState(0);
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState("NGN");

  const chosen = useMemo(() => pickRate(rates, region, onDate), [rates, region, onDate]);
  const estimate = chosen
    ? estimateFunds({
        monthly: chosen.monthly,
        months,
        tuition,
        depositPaid: deposit,
        accommodationPaidToSponsor: accommodation,
        offsetCap,
      })
    : null;
  const converted = estimate && rate ? convertWithRate(estimate.total, Number(rate)) : null;
  const unverified = rates.filter((item) => item.needsVerification);

  return (
    <div className="stack">
      <div className="grid-2">
        <label className="field">
          <span>Where is the campus?</span>
          <select value={region} onChange={(event) => setRegion(event.target.value as "london" | "outside_london")}>
            <option value="outside_london">Outside London (Lincoln is outside London)</option>
            <option value="london">London</option>
          </select>
        </label>
        <label className="field">
          <span>Visa application date</span>
          <input type="date" value={onDate} onChange={(event) => setOnDate(event.target.value)} />
        </label>
        <label className="field"><span>Months of the course, up to 9</span><input type="number" min={1} max={9} value={months} onChange={(event) => setMonths(Number(event.target.value))} /></label>
        <label className="field"><span>Tuition fee, GBP</span><input type="number" min={0} value={tuition} onChange={(event) => setTuition(Number(event.target.value))} /></label>
        <label className="field"><span>Deposit already paid, GBP</span><input type="number" min={0} value={deposit} onChange={(event) => setDeposit(Number(event.target.value))} /></label>
        <label className="field"><span>Accommodation paid to the university, GBP</span><input type="number" min={0} value={accommodation} onChange={(event) => setAccommodation(Number(event.target.value))} /></label>
      </div>
      {!estimate || !chosen ? (
        <p className="banner banner-warn">No verified maintenance rate is stored for that date and region. Do not guess a figure.</p>
      ) : (
        <div className="card">
          <p>Living costs: GBP {estimate.living.toLocaleString("en-GB")}. Tuition still to pay: GBP {estimate.tuitionOutstanding.toLocaleString("en-GB")}. Accommodation offset: GBP {estimate.accommodationOffset.toLocaleString("en-GB")}.</p>
          <p><strong>Estimated total: GBP {estimate.total.toLocaleString("en-GB")}</strong></p>
          <p className="small">Monthly rate GBP {chosen.monthly.toLocaleString("en-GB")}, verified {chosen.lastVerifiedOn ?? "on an unknown date"}. Source: {chosen.sourceUrl ? <a href={chosen.sourceUrl}>{chosen.sourceUrl}</a> : "not stored"}.</p>
          {chosen.notes ? <p className="small">{chosen.notes}</p> : null}
        </div>
      )}
      <div className="grid-2">
        <label className="field">
          <span>Your exchange rate (1 GBP in {currency}). You type this. We do not fetch a live rate.</span>
          <input inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} />
        </label>
        <label className="field">
          <span>Currency</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {["NGN", "GHS", "PKR", "KES", "INR"].map((code) => <option key={code}>{code}</option>)}
          </select>
        </label>
      </div>
      {converted != null ? <p>About {converted.toLocaleString("en-GB")} {currency}, using the rate you typed.</p> : null}
      {unverified.length > 0 ? (
        <div className="banner banner-warn">
          <p>These stored figures are flagged and are not used in the total:</p>
          <ul>{unverified.map((item) => <li key={`${item.label}-${item.monthly}`}>{item.label}: {item.notes}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
