"use client";

import { useState } from "react";
import Link from "next/link";
import { useApiFetch } from "@/lib/api-fetch";

const COUNTS = [4, 6, 8, 10] as const;
const TIMES = [45, 60, 90] as const;

export function StartInterview({
  trialAvailable,
  subscribed,
  mocksRemaining,
  unlimited,
}: {
  trialAvailable: boolean;
  subscribed: boolean;
  mocksRemaining: number | null;
  unlimited: boolean;
}) {
  const [mode, setMode] = useState<"trial" | "practice" | "mock">(trialAvailable ? "trial" : "mock");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(8);
  const [seconds, setSeconds] = useState<(typeof TIMES)[number]>(60);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const apiFetch = useApiFetch();

  async function start() {
    setPending(true);
    setError("");
    const response = await apiFetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        questionCount: mode === "trial" ? 1 : count,
        answerSeconds: seconds,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof body.error === "string" && body.error.trim() ? body.error : "The interview could not be started.");
      setPending(false);
      return;
    }
    window.location.href = `/interview/${body.sessionId}`;
  }

  return (
    <div className="stack">
      <fieldset className="stack">
        <legend>What do you want to run?</legend>
        <label className="check">
          <input type="radio" name="mode" checked={mode === "trial"} disabled={!trialAvailable} onChange={() => setMode("trial")} />
          <span>Free question. One timed answer and the full feedback. {trialAvailable ? "Still available." : "Already used."}</span>
        </label>
        <label className="check">
          <input type="radio" name="mode" checked={mode === "mock"} onChange={() => setMode("mock")} />
          <span>Mock interview. No re-record, questions mixed, core topics included. {subscribed ? (unlimited ? "Unlimited on your plan." : `${mocksRemaining ?? 0} left this period.`) : "Needs a subscription."}</span>
        </label>
        <label className="check">
          <input type="radio" name="mode" checked={mode === "practice"} onChange={() => setMode("practice")} />
          <span>Practice. Hints and re-record. Needs a subscription.</span>
        </label>
      </fieldset>
      {mode !== "trial" ? (
        <div className="grid-2">
          <label className="field">
            <span>Questions</span>
            <select value={count} onChange={(event) => setCount(Number(event.target.value) as (typeof COUNTS)[number])}>
              {COUNTS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Seconds for each answer</span>
            <select value={seconds} onChange={(event) => setSeconds(Number(event.target.value) as (typeof TIMES)[number])}>
              {TIMES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
      ) : (
        <label className="field">
          <span>Seconds for the answer</span>
          <select value={seconds} onChange={(event) => setSeconds(Number(event.target.value) as (typeof TIMES)[number])}>
            {TIMES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      )}
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="actions">
        <button className="btn btn-primary" type="button" disabled={pending || (mode !== "trial" && !subscribed)} onClick={() => void start()}>
          {pending ? "Starting" : "Start"}
        </button>
        {!subscribed ? <Link className="btn btn-secondary" href="/billing">View subscription</Link> : null}
      </div>
    </div>
  );
}
