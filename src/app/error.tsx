"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="wrap section stack">
      <h1>Something went wrong</h1>
      <p>The page could not be loaded. Your recordings are not shown on this screen.</p>
      <button className="btn btn-primary" type="button" onClick={reset}>Try again</button>
    </main>
  );
}
