import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/"><span className="logo-mark" aria-hidden="true">C</span> CAS Ready</Link>
        <nav className="nav" aria-label="Public">
          <Link href="/pricing">Pricing</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <strong>CAS Ready</strong>
        <p className="small">
          Independent practice for the recorded pre-CAS credibility interview used by many UK universities.
          Not the University of Lincoln, not Enroly, not UKVI, and not a prediction of any CAS or visa decision.
        </p>
        <div className="footer-links">
          <Link href="/privacy">Privacy notice</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
      </div>
    </footer>
  );
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className="banner" role="note">
      {compact
        ? "Practice only. This score does not predict a CAS, a visa, or a university decision."
        : "CAS Ready is practice. It does not decide, predict, or guarantee a Confirmation of Acceptance for Studies (CAS), a Student visa, or a place at a university."}
    </p>
  );
}
