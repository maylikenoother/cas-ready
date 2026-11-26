import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

export function clerkServerConfigured(): boolean {
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secret = process.env.CLERK_SECRET_KEY ?? "";
  return (publishable.startsWith("pk_test_") || publishable.startsWith("pk_live_")) && secret.startsWith("sk_");
}

export async function apiUserId(): Promise<string | null> {
  if (!clerkServerConfigured()) return null;
  const { userId } = await auth();
  return userId;
}

export async function apiUserEmail(): Promise<string | null> {
  if (!clerkServerConfigured()) return null;
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress ?? null;
}
