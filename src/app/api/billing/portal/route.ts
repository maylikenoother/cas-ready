import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/validation";
import { BillingNotReadyError, createPortalUrl } from "@/lib/billing/provider";
import { appUrl } from "@/lib/env";
import { asRow, asString } from "@/lib/text";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("user_id", data.user.id)
    .not("provider_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const customerId = asString(asRow(subscriptionData)?.provider_customer_id);
  if (!customerId) return NextResponse.json({ error: "No Stripe customer is stored for this account yet." }, { status: 404 });
  try {
    const url = await createPortalUrl(customerId, `${appUrl()}/billing`);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof BillingNotReadyError ? error.message : "The billing portal could not be opened.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
