import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OTP_EXPIRY_MS,
  OTP_EXPIRY_SECONDS,
  RESEND_COOLDOWN_MS,
  authFailureMessage,
  digitsOnly,
  formatCountdown,
  isCompleteCode,
  isEmailOtpType,
  remainingMs,
  safeNextPath,
  shouldForwardAuthCode,
} from "@/lib/otp";

describe("email code timing", () => {
  it("uses a 10 minute expiry and a 60 second resend wait", () => {
    expect(OTP_EXPIRY_SECONDS).toBe(600);
    expect(OTP_EXPIRY_MS).toBe(600_000);
    expect(RESEND_COOLDOWN_MS).toBe(60_000);
    const sentAt = 1_000_000;
    expect(formatCountdown(remainingMs(sentAt, OTP_EXPIRY_MS, sentAt))).toBe("10:00");
    expect(formatCountdown(remainingMs(sentAt, OTP_EXPIRY_MS, sentAt + 90_000))).toBe("8:30");
    expect(remainingMs(sentAt, OTP_EXPIRY_MS, sentAt + OTP_EXPIRY_MS)).toBe(0);
    expect(formatCountdown(0)).toBe("0:00");
    expect(remainingMs(sentAt, RESEND_COOLDOWN_MS, sentAt + 15_000)).toBe(45_000);
    expect(remainingMs(sentAt, RESEND_COOLDOWN_MS, sentAt + 61_000)).toBe(0);
  });

  it("restarts both timers from a new send time", () => {
    const first = 5_000;
    const resent = first + 120_000;
    expect(remainingMs(first, OTP_EXPIRY_MS, resent)).toBe(OTP_EXPIRY_MS - 120_000);
    expect(remainingMs(resent, OTP_EXPIRY_MS, resent)).toBe(OTP_EXPIRY_MS);
    expect(remainingMs(resent, RESEND_COOLDOWN_MS, resent)).toBe(RESEND_COOLDOWN_MS);
  });
});

describe("email code checks", () => {
  it("keeps six digits and rejects anything else", () => {
    expect(digitsOnly("12 34-56 789")).toBe("123456");
    expect(isCompleteCode("123456")).toBe(true);
    expect(isCompleteCode("12345")).toBe(false);
    expect(isCompleteCode("1234567")).toBe(false);
    expect(isCompleteCode("12a456")).toBe(false);
  });

  it("names expired, invalid, and rate-limited failures", () => {
    expect(authFailureMessage({ code: "otp_expired" })).toMatch(/expired/i);
    expect(authFailureMessage({ message: "Token has expired or is invalid" })).toMatch(/expired/i);
    expect(authFailureMessage({ message: "otp is invalid" })).toMatch(/not valid/i);
    expect(authFailureMessage({ status: 429 })).toMatch(/too many emails/i);
    expect(authFailureMessage({ code: "over_email_send_rate_limit" })).toMatch(/too many emails/i);
    expect(authFailureMessage({})).toMatch(/could not be completed/i);
  });

  it("keeps the link fallback on the callback path", () => {
    expect(shouldForwardAuthCode("/login", "abc")).toBe(true);
    expect(shouldForwardAuthCode("/", "abc")).toBe(true);
    expect(shouldForwardAuthCode("/auth/callback", "abc")).toBe(false);
    expect(shouldForwardAuthCode("/login", null)).toBe(false);
    expect(safeNextPath("/home")).toBe("/home");
    expect(safeNextPath("https://elsewhere.example")).toBe("/home");
    expect(safeNextPath("//elsewhere.example")).toBe("/home");
    expect(isEmailOtpType("email")).toBe(true);
    expect(isEmailOtpType("signup")).toBe(true);
    expect(isEmailOtpType("other")).toBe(false);
  });
});

describe("sign-in docs", () => {
  it("tells the owner to set a 600 second expiry and to print the code", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("Email OTP expiration");
    expect(readme).toContain("600");
    expect(readme).toContain("{{ .Token }}");
    expect(readme).toContain("{{ .ConfirmationURL }}");
    expect(readme).toContain("smtp.resend.com");
    expect(readme).toContain("Rate limit for sending emails");
  });
});