"use client";

import { useState } from "react";

export function DeleteAccount() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError("");
    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "The account could not be deleted.");
      setPending(false);
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="stack">
      <label className="field">
        <span>Type DELETE to remove the account, recordings, transcripts, and scores</span>
        <input value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" />
      </label>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button className="btn btn-danger" type="button" disabled={confirm !== "DELETE" || pending} onClick={() => void remove()}>
        {pending ? "Deleting" : "Delete everything"}
      </button>
    </div>
  );
}
