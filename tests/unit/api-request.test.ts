import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { apiRequestInit, isApiPath, isProtectedPage, isSameOriginApi, readApiError } from "@/lib/api-request";

describe("session token on API requests", () => {
  it("adds a bearer token to same-origin API calls and leaves other requests alone", () => {
    const sameOrigin = apiRequestInit("/api/consent", { method: "POST" }, "session-token");
    expect(new Headers(sameOrigin.headers).get("Authorization")).toBe("Bearer session-token");

    const absolute = apiRequestInit("https://example.invalid/api/consent", { method: "POST" }, "session-token");
    expect(new Headers(absolute.headers).has("Authorization")).toBe(false);

    const existing = apiRequestInit("/api/consent", { headers: { Authorization: "Bearer kept" } }, "session-token");
    expect(new Headers(existing.headers).get("Authorization")).toBe("Bearer kept");

    expect(isSameOriginApi("/api/sessions/abc/answers")).toBe(true);
    expect(isSameOriginApi("https://generativelanguage.googleapis.com/v1")).toBe(false);
  });

  it("shows the server error and falls back when there is none", async () => {
    const signedOut = new Response(JSON.stringify({ error: "Sign in to continue." }), { status: 401 });
    await expect(readApiError(signedOut, "The agreement could not be saved. Try again.")).resolves.toBe("Sign in to continue.");
    const empty = new Response("nope", { status: 500 });
    await expect(readApiError(empty, "The agreement could not be saved. Try again.")).resolves.toBe("The agreement could not be saved. Try again.");
  });
});

describe("API routes are authenticated without a page redirect", () => {
  it("lets API paths through and protects the app pages", () => {
    expect(isApiPath("/api/consent")).toBe(true);
    expect(isProtectedPage("/api/consent")).toBe(false);
    expect(isProtectedPage("/home")).toBe(true);
    expect(isProtectedPage("/interview/new")).toBe(true);
    expect(isProtectedPage("/pricing")).toBe(false);

    const middleware = readFileSync("src/middleware.ts", "utf8");
    const apiCheck = middleware.indexOf("isApiPath");
    const protect = middleware.indexOf("auth.protect");
    expect(apiCheck).toBeGreaterThan(-1);
    expect(protect).toBeGreaterThan(apiCheck);
    expect(middleware).toContain("/(api|trpc)(.*)");
    expect(readFileSync("src/lib/api-user.ts", "utf8")).toContain("auth()");
  });
});
