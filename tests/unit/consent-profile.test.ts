import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { upsert, insert, state, apiUserId, apiUserEmail } = vi.hoisted(() => ({
  upsert: vi.fn(),
  insert: vi.fn(),
  state: { admin: true },
  apiUserId: vi.fn(async (): Promise<string | null> => "user_123"),
  apiUserEmail: vi.fn(async (): Promise<string | null> => "ada@example.com"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => (state.admin ? {
    from: (table: string) => {
      if (table === "profiles") return { upsert };
      if (table === "consent_events") return { insert };
      throw new Error(table);
    },
  } : null),
}));

vi.mock("@/lib/api-user", () => ({
  apiUserId: () => apiUserId(),
  apiUserEmail: () => apiUserEmail(),
}));

import { POST } from "@/app/api/consent/route";
import { ensureProfile } from "@/lib/ensure-profile";

function request(body: unknown) {
  return new Request("http://localhost/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

describe("consent when the profile row is missing", () => {
  it("creates the profile with the service role before the consent event, and does not set a role", async () => {
    const order: string[] = [];
    upsert.mockImplementation(async () => {
      order.push("profiles");
      return { error: null };
    });
    insert.mockImplementation(async () => {
      order.push("consent_events");
      return { error: null };
    });

    const response = await POST(request({ kind: "terms", accepted: true }));
    expect(response.status).toBe(200);
    expect(order).toEqual(["profiles", "consent_events"]);

    const [row, options] = upsert.mock.calls[0] as unknown as [Record<string, unknown>, { onConflict: string }];
    expect(row.id).toBe("user_123");
    expect(row.email).toBe("ada@example.com");
    expect(row.terms_accepted_at).toEqual(expect.any(String));
    expect(row).not.toHaveProperty("role");
    expect(row).not.toHaveProperty("recording_consent_at");
    expect(options).toEqual({ onConflict: "id" });
    expect(insert).toHaveBeenCalledWith({ user_id: "user_123", kind: "terms", accepted: true });
  });

  it("stores recording consent on the new profile", async () => {
    const response = await POST(request({ kind: "recording", accepted: true }));
    expect(response.status).toBe(200);
    const [row] = upsert.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(row.recording_consent_at).toBe(row.terms_accepted_at);
    expect(row).not.toHaveProperty("role");
  });

  it("does not write a consent event when the profile upsert fails", async () => {
    upsert.mockResolvedValue({ error: { message: "missing" } });
    const response = await POST(request({ kind: "terms", accepted: true }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Consent could not be saved on the profile." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a request from another site", async () => {
    const response = await POST(new Request("http://localhost/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://example.invalid" },
      body: JSON.stringify({ kind: "terms", accepted: true }),
    }));
    expect(response.status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("keeps the sign-in and validation responses", async () => {
    apiUserId.mockResolvedValue(null);
    const signedOut = await POST(request({ kind: "terms", accepted: true }));
    expect(signedOut.status).toBe(401);
    apiUserId.mockResolvedValue("user_123");
    const invalid = await POST(request({ kind: "terms", accepted: false }));
    expect(invalid.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("ensureProfile", () => {
  it("upserts id and email only, so an existing role stays", async () => {
    await expect(ensureProfile("user_123", "ada@example.com")).resolves.toBe(true);
    const [row, options] = upsert.mock.calls[0] as unknown as [Record<string, unknown>, { onConflict: string }];
    expect(row).toEqual({ id: "user_123", email: "ada@example.com" });
    expect(options).toEqual({ onConflict: "id" });
  });

  it("leaves email unset when Clerk has not returned one", async () => {
    await expect(ensureProfile("user_123", null)).resolves.toBe(true);
    const [row] = upsert.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(row).toEqual({ id: "user_123" });
  });
});
