import Link from "next/link";
import { DeleteAccount } from "@/components/delete-account";
import { SignOut } from "@/components/sign-out";
import { loadProfile, requireUser } from "@/lib/auth";
import { retentionDays } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user } = await requireUser();
  const profile = await loadProfile(user.id);
  return (
    <div className="stack-lg" style={{ maxWidth: 720 }}>
      <div>
        <h1>Account</h1>
        <p>{profile.email}</p>
        <p className="small">Role: {profile.role}. Recordings and transcripts are removed after {retentionDays()} days. Scores can remain so the history still works. You can delete everything now.</p>
      </div>
      <div className="actions">
        <Link className="btn btn-secondary" href="/profile">Profile</Link>
        <Link className="btn btn-secondary" href="/billing">Billing</Link>
        <Link className="btn btn-secondary" href="/privacy">Privacy notice</Link>
        <SignOut />
      </div>
      <section className="card stack">
        <h2>Delete the account</h2>
        <p>This removes the login, the profile, sponsor details, interviews, scores, and recordings in your folder. It cannot be undone.</p>
        <DeleteAccount />
      </section>
    </div>
  );
}
