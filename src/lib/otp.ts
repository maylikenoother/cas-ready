export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SECONDS = 600;
export const OTP_EXPIRY_MS = OTP_EXPIRY_SECONDS * 1000;
export const RESEND_COOLDOWN_SECONDS = 60;
export const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;

const OTP_TYPES = ["email", "signup", "magiclink", "recovery", "invite"] as const;
export type EmailOtpType = (typeof OTP_TYPES)[number];

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isCompleteCode(value: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value);
}

export function remainingMs(startedAt: number, durationMs: number, now: number): number {
  return Math.max(0, startedAt + durationMs - now);
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}

export function shouldForwardAuthCode(pathname: string, code: string | null): boolean {
  if (!code) return false;
  return !pathname.startsWith("/auth/callback");
}

export function isEmailOtpType(value: string | null): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType);
}

export type AuthFailure = { message?: string; code?: string; status?: number };

export function readAuthFailure(error: unknown): AuthFailure {
  if (!error || typeof error !== "object") return {};
  const record = error as Record<string, unknown>;
  return {
    message: typeof record.message === "string" ? record.message : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
  };
}

export function authFailureMessage(failure: AuthFailure): string {
  const code = (failure.code ?? "").toLowerCase();
  const message = (failure.message ?? "").toLowerCase();
  if (
    failure.status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.includes("rate limit")
  ) {
    return "Too many emails were sent. Wait a little, then request a new code.";
  }
  if (code === "otp_expired" || message.includes("expired")) {
    return "That code has expired. Resend a code and enter the new one.";
  }
  if (message.includes("invalid") || message.includes("token") || code === "otp_disabled") {
    return "That code is not valid. Check the 6 digits, or resend a code.";
  }
  const original = failure.message?.trim();
  return original || "Sign-in could not be completed. Try again.";
}
