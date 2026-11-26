import { cookies, headers } from "next/headers";
import { AppShell } from "@/components/shell";
import { TermsGate } from "@/components/terms-gate";
import { safeNext } from "@/lib/accept-terms";
import { loadProfile, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const profile = await loadProfile(user.id);
  const headerList = await headers();
  const cookieStore = await cookies();
  const current = headerList.get("x-cas-path") || "/home";
  const fromPath = new URL(current, "http://local").searchParams.get("error") ?? "";
  const error = cookieStore.get("cas_terms_error")?.value || fromPath;
  return (
    <AppShell name={profile.fullName || profile.email || "Account"} role={profile.role}>
      {profile.termsAcceptedAt ? children : <TermsGate nextPath={safeNext(current)} error={error} />}
    </AppShell>
  );
}
