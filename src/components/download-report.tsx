"use client";

import { useState } from "react";
import { useApiFetch } from "@/lib/api-fetch";
import { readApiError } from "@/lib/api-request";

export function DownloadReport({ sessionId }: { sessionId: string }) {
  const apiFetch = useApiFetch();
  const [error, setError] = useState("");

  async function download() {
    setError("");
    const response = await apiFetch(`/api/reports/${sessionId}/pdf`);
    if (!response.ok) {
      setError(await readApiError(response, "The report could not be downloaded."));
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cas-ready-practice-report.pdf";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <button className="btn btn-secondary" type="button" onClick={() => void download()}>Download PDF</button>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </div>
  );
}
