import { SignUp } from "@clerk/nextjs";
import { SiteFooter, SiteHeader } from "@/components/site";
import { clerkAppearance, clerkPublishableConfigured } from "@/lib/clerk-public";

export default function SignUpPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section">
        {clerkPublishableConfigured() ? (
          <div className="auth-card">
            <SignUp
              appearance={clerkAppearance}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/home"
            />
          </div>
        ) : (
          <section className="card auth-card stack">
            <p className="kicker">Email code</p>
            <h1>Create an account</h1>
            <p>A new account starts with an email code that expires after 10 minutes. You can resend it from this screen.</p>
            <p className="banner">Add the Clerk keys from <code>.env.example</code> to show the sign-up form.</p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
