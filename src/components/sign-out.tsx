"use client";

import { createClient, supabaseConfigured } from "@/lib/supabase/browser";

export function SignOut() {
  return (
    <button
      className="btn btn-secondary"
      type="button"
      disabled={!supabaseConfigured()}
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
    >
      Sign out
    </button>
  );
}
