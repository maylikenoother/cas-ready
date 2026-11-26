"use client";

import { useState } from "react";
import Link from "next/link";
import { useApiFetch } from "@/lib/api-fetch";
import { readApiError } from "@/lib/api-request";

export function TermsGate() {
  const apiFetch = useApiFetch();
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setPending(true);
    setError("");
    const response = await apiFetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "terms", accepted: true }),
    });
    if (!response.ok) {
      setError(await readApiError(response, "The agreement could not be saved. Try again."));
      setPending(false);
      return;
    }
    window.location.reload();
  }

  return (
    <section className="card stack" style={{ maxWidth: 640 }}>
      <h1>Before you start</h1>
      <p>CAS Ready stores your practice answers so you can see them later. Read the <Link href="/terms">terms</Link> and the <Link href="/privacy">privacy notice</Link>.</p>
      <label className="check">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>I am 18 or over. I understand this is practice and it does not predict a CAS or a visa.</span>
      </label>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button className="btn btn-primary" type="button" disabled={!accepted || pending} onClick={save}>
        {pending ? "Saving" : "Continue"}
      </button>
    </section>
  );
}
