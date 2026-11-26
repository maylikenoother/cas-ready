import "server-only";

export type GeminiTier = "free" | "paid";

export function supabasePublicEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function supabaseAdminEnv(): { url: string; serviceKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

export function geminiEnv(): { apiKey: string; model: string; tier: GeminiTier; base: string } | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const tier: GeminiTier = process.env.GEMINI_TIER === "paid" ? "paid" : "free";
  return {
    apiKey,
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
    tier,
    base: (process.env.GEMINI_API_BASE?.trim() || "https://generativelanguage.googleapis.com").replace(/\/$/, ""),
  };
}

export function geminiTier(): GeminiTier {
  return process.env.GEMINI_TIER === "paid" ? "paid" : "free";
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function retentionDays(): number {
  const parsed = Number(process.env.RETENTION_DAYS ?? 90);
  if (!Number.isFinite(parsed) || parsed < 7 || parsed > 3650) return 90;
  return Math.round(parsed);
}

export function stripeEnv(): { secretKey: string; webhookSecret: string } | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return null;
  return { secretKey, webhookSecret };
}

export function billingProviderName(): "stripe" | "paystack" | "flutterwave" {
  const value = process.env.BILLING_PROVIDER ?? "stripe";
  if (value === "paystack" || value === "flutterwave") return value;
  return "stripe";
}
