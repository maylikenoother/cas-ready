"use client";

import { useState } from "react";
import { useApiFetch } from "@/lib/api-fetch";
import { readApiError } from "@/lib/api-request";

export function CheckoutButton({ planCode, label }: { planCode: "starter_monthly" | "ready_monthly"; label: string }) {
  const apiFetch = useApiFetch();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    setError("");
    const response = await apiFetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.url !== "string") {
      setError(typeof body.error === "string" && body.error.trim() ? body.error : "Checkout could not be started.");
      setPending(false);
      return;
    }
    window.location.href = body.url;
  }

  return (
    <div className="stack">
      <button className="btn btn-primary" type="button" disabled={pending} onClick={() => void start()}>{pending ? "Opening Stripe" : label}</button>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </div>
  );
}

export function PortalButton() {
  const apiFetch = useApiFetch();
  const [error, setError] = useState("");

  async function open() {
    setError("");
    const response = await apiFetch("/api/billing/portal", { method: "POST" });
    if (!response.ok) {
      setError(await readApiError(response, "The billing portal could not be opened."));
      return;
    }
    const body = await response.json().catch(() => ({}));
    if (typeof body.url !== "string") {
      setError("The billing portal could not be opened.");
      return;
    }
    window.location.href = body.url;
  }

  return (
    <div className="stack">
      <button className="btn btn-secondary" type="button" onClick={() => void open()}>Manage the subscription in Stripe</button>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </div>
  );
}
