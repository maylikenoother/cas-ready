"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { acceptTerms, safeNext } from "@/lib/accept-terms";
import { apiUserEmail, apiUserId } from "@/lib/api-user";

export async function acceptTermsAction(formData: FormData) {
  const headerList = await headers();
  const posted = formData.get("next");
  const nextPath = safeNext(typeof posted === "string" && posted ? posted : headerList.get("x-cas-path") || "/home");
  const result = await acceptTerms({
    userId: await apiUserId(),
    email: await apiUserEmail(),
    accepted: formData.get("accepted") === "yes",
    nextPath,
    sameOriginOk: true,
  });
  const jar = await cookies();
  if (result.error) {
    jar.set("cas_terms_error", result.error, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 120 });
  } else {
    jar.set("cas_terms_error", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  }
  redirect(result.location);
}
