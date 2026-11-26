import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  normaliseStripeEvent,
  subscriptionFromCheckout,
  subscriptionFromDeletion,
  subscriptionFromUpdate,
} from "@/lib/billing/events";
import { parseModelJson, sanitiseCoachText, answerFeedbackSchema } from "@/lib/gemini/parse";
import { buildReportPdf, pdfSafe } from "@/lib/report-pdf";

describe("stripe events", () => {
  it("grants access only when checkout is paid", () => {
    const event = normaliseStripeEvent({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "user-1",
          customer: "cus_1",
          subscription: "sub_1",
          payment_status: "paid",
          metadata: { user_id: "user-1", plan_code: "starter_monthly" },
        },
      },
    });
    expect(event.kind).toBe("checkout_completed");
    if (event.kind !== "checkout_completed") return;
    const row = subscriptionFromCheckout(event, { code: "starter_monthly", mockQuota: 4 });
    expect(row?.status).toBe("active");
    expect(row?.mocksRemaining).toBe(4);

    const unpaid = { ...event, paid: false };
    expect(subscriptionFromCheckout(unpaid, { code: "starter_monthly", mockQuota: 4 })).toBeNull();
  });

  it("refills the mock allowance when a new period starts and clears it on cancel", () => {
    const existing = {
      userId: "user-1",
      provider: "stripe" as const,
      providerCustomerId: "cus_1",
      providerSubscriptionId: "sub_1",
      planCode: "starter_monthly" as const,
      status: "active" as const,
      currentPeriodEnd: "2026-11-01T00:00:00.000Z",
      mockQuota: 4,
      mocksRemaining: 1,
    };
    const updated = normaliseStripeEvent({
      id: "evt_2",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          current_period_end: Math.floor(Date.parse("2026-12-01T00:00:00.000Z") / 1000),
          metadata: { plan_code: "starter_monthly" },
        },
      },
    });
    expect(updated.kind).toBe("subscription_updated");
    if (updated.kind !== "subscription_updated") return;
    const next = subscriptionFromUpdate(updated, existing, { code: "starter_monthly", mockQuota: 4 });
    expect(next?.mocksRemaining).toBe(4);
    expect(subscriptionFromDeletion(existing).status).toBe("canceled");
    expect(subscriptionFromDeletion(existing).mocksRemaining).toBe(0);
  });
});

describe("coach text", () => {
  it("drops wording that predicts a CAS or a visa", () => {
    expect(sanitiseCoachText("You will pass and the CAS will be issued.")).toBe("");
    expect(sanitiseCoachText("Name one module and why you chose it.")).toContain("module");
  });

  it("parses a JSON object wrapped in extra text", () => {
    const raw = `Here you go\n{"transcript":"I chose Lincoln","relevance":80,"specificity":70,"clarity":75,"strengths":["Specific"],"improvements":["Add the fee"],"suggested_answer_outline":["Reason"],"consistency_notes":[]}`;
    const parsed = parseModelJson(raw, answerFeedbackSchema);
    expect(parsed?.relevance).toBe(80);
    expect(parsed?.transcript).toBe("I chose Lincoln");
    expect(parseModelJson("no json", answerFeedbackSchema)).toBeNull();
  });
});

describe("pdf", () => {
  it("builds a report that states the practice limit", async () => {
    const bytes = await buildReportPdf({
      studentName: "Ada",
      course: "MSc International Business",
      university: "University of Lincoln",
      completedAt: "26 Nov 2026",
      mode: "mock",
      partial: false,
      overall: 72,
      band: "Further preparation",
      bandWithheld: false,
      categories: [{ label: "Finance", score: 60 }],
      summary: "Finance needs a precise fee.",
      answers: [{ position: 1, prompt: "Who is paying?", score: 60, transcript: "My father is paying GBP 19300.", improvements: ["Name his work."] }],
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(pdfSafe("£1,529 — café")).toBe("GBP 1,529 - caf");
  });
});

describe("safety checks in the repo", () => {
  it("enables row level security for every table", () => {
    const sql = readFileSync("supabase/migrations/20261126120000_schema.sql", "utf8").toLowerCase();
    const tables = [...sql.matchAll(/create table(?: if not exists)? public\.(\w+)/g)].map((match) => match[1]);
    expect(tables.length).toBeGreaterThan(8);
    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("recordings");
    expect(sql).not.toContain("emotion");
  });

  it("keeps provider secrets out of client modules", () => {
    const banned = ["GEMINI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
    const files = walk("src").filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const client = text.startsWith('"use client"') || text.startsWith("'use client'");
      if (!client) continue;
      for (const secret of banned) {
        expect(text, file).not.toContain(secret);
      }
    }
  });
});

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}
