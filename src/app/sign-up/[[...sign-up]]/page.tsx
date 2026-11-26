import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import { SiteFooter, SiteHeader } from "@/components/site";
import { clerkAppearance, clerkPublishableConfigured } from "@/lib/clerk-public";

export default function SignUpPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="wrap section">
        {clerkPublishableConfigured() ? (
          <div className="auth-card stack">
            <Image unoptimized src="/illustrations/calm.svg" alt="" width={120} height={120} />
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
            <Image unoptimized src="/illustrations/calm.svg" alt="" width={120} height={120} />
            <p className="kicker">Email code</p>
            <h1>Create an account</h1>
            <p>An email code, then you are in. It expires after 10 minutes.</p>
            <p className="banner">Add the Clerk keys from <code>.env.example</code> to show the sign-up form.</p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
