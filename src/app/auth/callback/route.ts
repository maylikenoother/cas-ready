import { NextResponse } from "next/server";
import { isEmailOtpType, safeNextPath } from "@/lib/otp";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (code || tokenHash) {
    const supabase = await createClient();
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash && isEmailOtpType(type)) {
      await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
