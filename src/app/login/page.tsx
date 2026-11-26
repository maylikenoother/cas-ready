"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader, SiteFooter } from "@/components/site";
import { createClient, supabaseConfigured } from "@/lib/supabase/browser";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/home";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const configured = supabaseConfigured();

  async function send(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const supabase = createClient();
      const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });
      if (error) throw error;
      setSent(true);
      setMessage("Check your email for a code and a link. The code is easier on a phone.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The email could not be sent.");
    } finally {
      setPending(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
      if (error) throw error;
      window.location.href = next;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That code was not accepted.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section" style={{ maxWidth: 560 }}>
        <h1>Sign in</h1>
        <p className="muted">Use the email you can open. We send a one-time code. There is no password to reuse on a shared computer.</p>
        {!configured ? <p className="banner banner-warn">Supabase is not configured in this environment, so sign-in cannot send an email yet.</p> : null}
        <form className="stack" onSubmit={sent ? verify : send}>
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {sent ? (
            <label className="field">
              <span>Email code</span>
              <input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value)} />
            </label>
          ) : null}
          <button className="btn btn-primary" type="submit" disabled={pending || !configured}>
            {pending ? "Please wait" : sent ? "Sign in" : "Email me a code"}
          </button>
          {message ? <p role="status">{message}</p> : null}
        </form>
        <p className="small muted">By continuing you agree to the <Link href="/terms">terms</Link> and the <Link href="/privacy">privacy notice</Link>. You must be 18 or over.</p>
      </main>
      <SiteFooter />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="wrap section"><p>Loading sign in.</p></main>}>
      <LoginForm />
    </Suspense>
  );
}
