import { expect, test } from "@playwright/test";

test("home page explains the practice limit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Practise the interview");
  await expect(page.getByRole("note")).toContainText("does not decide, predict, or guarantee");
  await expect(page.getByRole("link", { name: "Start with one free question" })).toBeVisible();
});

test("pricing, privacy, and terms are public", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("One free question");
  await expect(page.getByText("Starter")).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Privacy notice");
  await expect(page.getByText("does not detect faces")).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Terms of use");
});

test("sign in offers an email code", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a code" })).toBeVisible();
});

test("signed-out students are sent to sign in", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/interview/new");
  await expect(page).toHaveURL(/\/login/);
});

test("security headers are present", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  const csp = response.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});
