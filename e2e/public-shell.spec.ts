import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const localSupabaseUrl = "http://127.0.0.1:54321";
const localServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

test("password login is usable and public signup is absent", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /career os/i })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  await expect(page.getByText(/sign up/i)).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("anonymous access redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("an invited user can sign in and reach the responsive product shell", async ({ page, request }) => {
  const email = `e2e-${crypto.randomUUID()}@career-os.local`;
  const password = "CareerOS-test-2026!";
  const created = await request.post(`${localSupabaseUrl}/auth/v1/admin/users`, { headers: { apikey: localServiceRoleKey, authorization: `Bearer ${localServiceRoleKey}` }, data: { email, password, email_confirm: true } });
  expect(created.ok()).toBeTruthy();
  const user = await created.json() as { id: string };
  try {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /good morning/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /opportunities/i }).first()).toBeVisible();
  } finally {
    await request.delete(`${localSupabaseUrl}/auth/v1/admin/users/${user.id}`, { headers: { apikey: localServiceRoleKey, authorization: `Bearer ${localServiceRoleKey}` } });
  }
});

test("the dedicated browser profile structurally blocks final submission", async ({ page }) => {
  await page.addInitScript({ path: resolve("apps/worker/src/browser-final-submit-guard.js") });
  const fixture = `<form id="application"><input name="name" value="Career OS"><button type="submit">Submit application</button></form><output id="result">not-submitted</output><script>document.querySelector('form').addEventListener('submit',()=>document.querySelector('output').textContent='submitted')</script>`;
  await page.goto(`data:text/html,${encodeURIComponent(fixture)}`);
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.locator("#result")).toHaveText("not-submitted");
  const programmaticSubmit = await page.evaluate(() => { try { document.querySelector("form")?.requestSubmit(); return "not-blocked"; } catch { return "blocked"; } });
  expect(programmaticSubmit).toBe("blocked");
});
