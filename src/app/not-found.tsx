import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="wrap section">
      <h1>That page is not here</h1>
      <p><Link href="/">Back to CAS Ready</Link></p>
    </main>
  );
}
