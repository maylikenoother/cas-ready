import Link from "next/link";
import { acceptTermsAction } from "@/app/(app)/accept-terms";
import { termsErrorMessage } from "@/lib/accept-terms";

export function TermsGate({ nextPath, error }: { nextPath: string; error: string }) {
  const message = termsErrorMessage(error);
  return (
    <section className="card stack" style={{ maxWidth: 640 }}>
      <h1>Before you start</h1>
      <p>CAS Ready stores your practice answers so you can see them later. Read the <Link href="/terms">terms</Link> and the <Link href="/privacy">privacy notice</Link>.</p>
      <form className="stack" action={acceptTermsAction}>
        <input type="hidden" name="next" value={nextPath} />
        <label className="check">
          <input type="checkbox" name="accepted" value="yes" required />
          <span>I am 18 or over. I understand this is practice and it does not predict a CAS or a visa.</span>
        </label>
        {message ? <p className="error" role="alert">{message}</p> : null}
        <button className="btn btn-primary" type="submit">Continue</button>
      </form>
    </section>
  );
}
