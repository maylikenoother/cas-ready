"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site";
import {
  OTP_EXPIRY_MS,
  RESEND_COOLDOWN_MS,
  authFailureMessage,
  digitsOnly,
  formatCountdown,
  isCompleteCode,
  readAuthFailure,
  remainingMs,
  safeNextPath,
} from "@/lib/otp";
import { createClient, supabaseConfigured } from "@/lib/supabase/browser";

export function SignInForm() {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const configured = supabaseConfigured();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (sentAt == null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sentAt]);

  const expiryLeft = sentAt == null ? OTP_EXPIRY_MS : remainingMs(sentAt, OTP_EXPIRY_MS, now);
  const cooldownLeft = sentAt == null ? 0 : remainingMs(sentAt, RESEND_COOLDOWN_MS, now);
  const expired = sentAt != null && expiryLeft === 0;

  async function sendCode() {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (sendError) throw sendError;
      setSentAt(Date.now());
      setCode("");
      setNotice("A new 6-digit code is on its way. It expires in 10 minutes.");
    } catch (sendFailure) {
      setError(authFailureMessage(readAuthFailure(sendFailure)));
    } finally {
      setPending(false);
    }
  }

  async function onEmail(event: FormEvent) {
    event.preventDefault();
    await sendCode();
  }

  async function onCode(event: FormEvent) {
    event.preventDefault();
    if (expired) {
      setError("This code has expired. Resend a code to get a new 10 minutes.");
      return;
    }
    if (!isCompleteCode(code)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (verifyError) throw verifyError;
      window.location.href = next;
    } catch (verifyFailure) {
      setError(authFailureMessage(readAuthFailure(verifyFailure)));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section">
        <section className="card auth-card stack">
          <p className="kicker">Email code</p>
          <h1>Sign in</h1>
          {sentAt == null ? (
            <>
              <p className="muted">
                Use the email you can open. We send a 6-digit code that expires after 10 minutes. It works for a new account and for coming back. There is no password.
              </p>
              {!configured ? <p className="banner banner-warn">Supabase is not configured in this environment, so sign-in cannot send an email yet.</p> : null}
              <form className="stack" onSubmit={onEmail}>
                <label className="field">
                  <span>Email</span>
                  <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <button className="btn btn-primary" type="submit" disabled={pending || !configured}>
                  {pending ? "Please wait" : "Email me a code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="muted">Enter the code sent to {email}.</p>
              {expired ? (
                <p className="banner banner-warn" role="status">This code has expired. Resend a code to get a new 10 minutes.</p>
              ) : (
                <p role="timer" aria-live="off">
                  Code expires in <strong className="timer-fake" style={{ fontSize: "1.6rem" }}>{formatCountdown(expiryLeft)}</strong>
                </p>
              )}
              <form className="stack" onSubmit={onCode}>
                <label className="field">
                  <span>6-digit code</span>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={code}
                    aria-invalid={Boolean(error)}
                    onChange={(event) => setCode(digitsOnly(event.target.value))}
                  />
                </label>
                <button className="btn btn-primary" type="submit" disabled={pending || expired || !isCompleteCode(code)}>
                  {pending ? "Please wait" : "Sign in"}
                </button>
              </form>
              <button className="btn btn-secondary" type="button" disabled={pending || cooldownLeft > 0 || !configured} onClick={() => void sendCode()}>
                {cooldownLeft > 0 ? `Resend code in ${formatCountdown(cooldownLeft)}` : "Resend code"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setSentAt(null);
                  setCode("");
                  setError("");
                  setNotice("");
                }}
              >
                Use a different email
              </button>
            </>
          )}
          {error ? <p className="error" role="alert">{error}</p> : null}
          {notice ? <p role="status">{notice}</p> : null}
          <p className="small muted">By continuing you agree to the <Link href="/terms">terms</Link> and the <Link href="/privacy">privacy notice</Link>. You must be 18 or over. A link in the email also works if you would rather tap it.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
