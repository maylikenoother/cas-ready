import { AppShell } from "@/components/shell";
import { TermsGate } from "@/components/terms-gate";
import { loadProfile, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const profile = await loadProfile(user.id);
  return (
    <AppShell name={profile.fullName || profile.email || "Account"} role={profile.role}>
      {profile.termsAcceptedAt ? children : <TermsGate />}
    </AppShell>
  );
}
