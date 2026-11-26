import Link from "next/link";
import { Disclaimer } from "@/components/site";
import { StartInterview } from "@/components/start-interview";
import { loadProfile, loadSubscription, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewInterviewPage() {
  const { user } = await requireUser();
  const profile = await loadProfile(user.id);
  const subscription = await loadSubscription(user.id);
  const subscribed = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <div>
        <h1>Start an interview</h1>
        <p className="muted">You get about 15 seconds to read the question. Then the timer runs. A mock does not let you record again.</p>
        <Disclaimer compact />
      </div>
      {!profile.fullName ? <p className="banner">Add your course on the <Link href="/profile">profile</Link> first if you can. The feedback checks your answer against it.</p> : null}
      <StartInterview
        trialAvailable={!profile.trialConsumed}
        subscribed={subscribed}
        mocksRemaining={subscription?.mocksRemaining ?? null}
        unlimited={subscribed && subscription?.mockQuota == null}
      />
    </div>
  );
}
