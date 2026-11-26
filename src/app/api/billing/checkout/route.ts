import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/validation";
import { BillingNotReadyError, createSubscriptionCheckout } from "@/lib/billing/provider";
import { appUrl } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({ planCode: z.enum(["starter_monthly", "ready_monthly"]) });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This action is not allowed from another site." }, { status: 403 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return NextResponse.json({ error: "Sign in with an email address before paying." }, { status: 401 });
  const allowed = await rateLimit(`checkout:${data.user.id}`, 10, 3600);
  if (!allowed) return NextResponse.json({ error: "Too many checkout attempts. Wait an hour and try again." }, { status: 429 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a plan from the list." }, { status: 400 });
  try {
    const url = await createSubscriptionCheckout({
      userId: data.user.id,
      email: data.user.email,
      planCode: parsed.data.planCode,
      successUrl: `${appUrl()}/billing?checkout=return`,
      cancelUrl: `${appUrl()}/billing?checkout=cancel`,
    });
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof BillingNotReadyError ? error.message : "Checkout could not be started.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
