"use client";

import { useClerk } from "@clerk/nextjs";
import { clerkPublishableConfigured } from "@/lib/clerk-public";

export function SignOut() {
  if (!clerkPublishableConfigured()) return null;
  return <ClerkSignOut />;
}

function ClerkSignOut() {
  const { signOut } = useClerk();
  return (
    <button className="btn btn-secondary" type="button" onClick={() => void signOut({ redirectUrl: "/" })}>
      Sign out
    </button>
  );
}
