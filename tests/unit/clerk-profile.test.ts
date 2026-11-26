import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { explicitRole, primaryEmail, profileFields, roleFromPublicMetadata } from "@/lib/clerk-public";

const sample = {
  id: "user_123",
  first_name: "Ada",
  last_name: "Okoye",
  username: null,
  primary_email_address_id: "idn_1",
  email_addresses: [{ id: "idn_1", email_address: "ada@example.com" }],
  public_metadata: {},
};

describe("Clerk profile sync", () => {
  it("creates a student and keeps an existing role unless metadata sets one", () => {
    expect(profileFields(sample, "created").role).toBe("student");
    expect(profileFields({ ...sample, public_metadata: { role: "admin" } }, "updated").role).toBe("admin");
    expect(profileFields(sample, "updated").role).toBeUndefined();
    expect(explicitRole({ role: "nope" })).toBeNull();
    expect(roleFromPublicMetadata({ role: "university" })).toBe("university");
    expect(primaryEmail(sample)).toBe("ada@example.com");
  });
});

describe("Clerk database migration", () => {
  it("keys row access on the Clerk subject and keeps the webhook events in the docs", () => {
    const sql = readFileSync("supabase/migrations/20261126150000_clerk_auth.sql", "utf8");
    expect(sql).toContain("auth.jwt()->>'sub'");
    expect(sql).toContain("alter table public.profiles alter column id type text");
    expect(sql).not.toContain("auth.uid()");
    const readme = readFileSync("README.md", "utf8");
    const config = readFileSync("supabase/config.toml", "utf8");
    expect(config).toContain('domain = "boss-minnow-9913.clerk.accounts.dev"');
    expect(readme).toContain("boss-minnow-9913.clerk.accounts.dev");
    expect(readme).toContain("/api/webhooks/clerk");
    expect(readme).toContain("user.created");
    expect(readme).toContain("user.updated");
    expect(readme).toContain("user.deleted");
    const example = readFileSync(".env.example", "utf8");
    expect(example).toMatch(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=\n/);
    expect(example).toMatch(/CLERK_SECRET_KEY=\n/);
    expect(example).toMatch(/CLERK_WEBHOOK_SIGNING_SECRET=\n/);
  });
});
