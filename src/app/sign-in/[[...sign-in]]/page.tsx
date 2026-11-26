import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site";
import { clerkAppearance, clerkPublishableConfigured } from "@/lib/clerk-public";

export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section">
        {clerkPublishableConfigured() ? (
          <div className="auth-card stack">
            <Image unoptimized src="/illustrations/calm.svg" alt="" width={120} height={120} />
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
            <Image unoptimized src="/illustrations/calm.svg" alt="" width={120} height={120} />
            <p className="kicker">Email code</p>
            <h1>Sign in</h1>
            <p>A 6-digit email code. It expires after 10 minutes.</p>
            <p className="banner">Add the Clerk keys from <code>.env.example</code> to show the sign-in form.</p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
