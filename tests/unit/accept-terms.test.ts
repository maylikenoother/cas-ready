import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { upsert, insert, state, apiUserId, apiUserEmail, redirectTo } = vi.hoisted(() => ({
  upsert: vi.fn(),
  insert: vi.fn(),
  state: { admin: true },
  apiUserId: vi.fn(async (): Promise<string | null> => "user_123"),
  apiUserEmail: vi.fn(async (): Promise<string | null> => "ada@example.com"),
  redirectTo: vi.fn((location: string) => {
    throw new Error(`REDIRECT ${location}`);
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => (state.admin ? {
    from: (table: string) => (table === "profiles" ? { upsert } : { insert }),
  } : null),
}));

vi.mock("@/lib/api-user", () => ({
  apiUserId: () => apiUserId(),
  apiUserEmail: () => apiUserEmail(),
}));

vi.mock("next/navigation", () => ({
  redirect: (location: string) => redirectTo(location),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => (name === "x-cas-path" ? "/billing" : null) }),
  cookies: async () => ({ set: () => undefined }),
}));

import { acceptTerms } from "@/lib/accept-terms";
import { acceptTermsAction } from "@/app/(app)/accept-terms";

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  upsert.mockReset();
  insert.mockReset();
  upsert.mockResolvedValue({ error: null });
  insert.mockResolvedValue({ error: null });
  state.admin = true;
  apiUserId.mockResolvedValue("user_123");
  apiUserEmail.mockResolvedValue("ada@example.com");
});

describe("accepting the terms", () => {
  it("sends a signed-out person to sign in", async () => {
    const result = await acceptTerms({
      userId: null,
      email: null,
      accepted: true,
      nextPath: "/billing",
      sameOriginOk: true,
    });
    expect(result.location).toBe("/sign-in?redirect_url=%2Fbilling");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("saves the profile without a role and returns to the page", async () => {
    const result = await acceptTerms({
      userId: "user_123",
      email: "ada@example.com",
      accepted: true,
      nextPath: "/billing",
      sameOriginOk: true,
    });
    expect(result.location).toBe("/billing");
    expect(result.error).toBeNull();
    const [row, options] = upsert.mock.calls[0] as unknown as [Record<string, unknown>, { onConflict: string }];
    expect(row.id).toBe("user_123");
    expect(row.email).toBe("ada@example.com");
    expect(row.terms_accepted_at).toEqual(expect.any(String));
    expect(row).not.toHaveProperty("role");
    expect(options).toEqual({ onConflict: "id" });
    expect(insert).toHaveBeenCalledWith({ user_id: "user_123", kind: "terms", accepted: true });
  });

  it("redirects with an error code when the profile cannot be saved", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    upsert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    const result = await acceptTerms({
      userId: "user_123",
      email: "ada@example.com",
      accepted: true,
      nextPath: "/home",
      sameOriginOk: true,
    });
    expect(result.location).toBe("/home?error=save_profile");
    expect(error).toHaveBeenCalledWith("[consent] step=upsert_profile", "42501", "permission denied");
    expect(insert).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("terms action on the page", () => {
  it("sends a signed-out person to sign in", async () => {
    apiUserId.mockResolvedValue(null);
    await expect(acceptTermsAction(formData({ accepted: "yes", next: "/home" }))).rejects.toThrow(
      "REDIRECT /sign-in?redirect_url=%2Fhome",
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it("saves the agreement and redirects back to the page", async () => {
    await expect(acceptTermsAction(formData({ accepted: "yes", next: "/billing" }))).rejects.toThrow("REDIRECT /billing");
    const [row] = upsert.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(row).not.toHaveProperty("role");
    expect(insert).toHaveBeenCalled();
  });

  it("redirects with an error code when the profile cannot be saved", async () => {
    upsert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    await expect(acceptTermsAction(formData({ accepted: "yes", next: "/home" }))).rejects.toThrow(
      "REDIRECT /home?error=save_profile",
    );
  });
});
