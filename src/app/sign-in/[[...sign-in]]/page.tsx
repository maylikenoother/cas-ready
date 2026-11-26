import { SignIn } from "@clerk/nextjs";
import { SiteFooter, SiteHeader } from "@/components/site";
import { clerkAppearance, clerkPublishableConfigured } from "@/lib/clerk-public";

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section">
        {clerkPublishableConfigured() ? (
          <div className="auth-card">
            <SignIn
              appearance={clerkAppearance}
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/home"
            />
          </div>
        ) : (
          <section className="card auth-card stack">
            <p className="kicker">Email code</p>
            <h1>Sign in</h1>
            <p>
              Sign-in uses a 6-digit email code. The code expires after 10 minutes, and the screen lets you resend it. The same address works the first time and when you come back. Google can be turned on beside the code.
            </p>
            <p className="banner">Add the Clerk keys from <code>.env.example</code> to show the sign-in form.</p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
