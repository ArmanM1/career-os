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
    await page.goto("/resumes");
    await expect(page.getByRole("heading", { name: "Experiences and achievements" })).toBeVisible();
    await page.getByPlaceholder("Role or experience title").fill("Software Engineering Intern");
    await page.getByPlaceholder("Organization").fill("Example Labs");
    await page.getByPlaceholder("Verified scope, responsibilities, and context").fill("Built and tested an internal workflow used by the engineering team.");
    await page.getByRole("button", { name: "Add experience" }).click();
    await expect(page.locator('input[name="title"]').nth(1)).toHaveValue("Software Engineering Intern");
    await page.getByRole("button", { name: "Verify experience facts" }).click();
    await expect(page.getByText("verified", { exact: true })).toBeVisible();
    const restHeaders = { apikey: localServiceRoleKey, authorization: `Bearer ${localServiceRoleKey}`, prefer: "return=representation" };
    const opportunityId = crypto.randomUUID();
    const opportunity = await request.post(`${localSupabaseUrl}/rest/v1/opportunities`, { headers: restHeaders, data: { id: opportunityId, user_id: user.id, title: "Platform Engineering Intern", opportunity_type: "internship", status: "open", url: "https://example.com/jobs/platform", created_by: "system", updated_by: "system" } });
    expect(opportunity.ok(), await opportunity.text()).toBeTruthy();
    await page.goto(`/opportunities/${opportunityId}`);
    await page.getByRole("button", { name: "Prepare full application" }).click();
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+/);
    await expect(page.getByRole("heading", { name: /Platform Engineering Intern/ })).toBeVisible();
    await expect(page.getByText("Preparation activity")).toBeVisible();
    const preparationJobs = await request.get(`${localSupabaseUrl}/rest/v1/agent_jobs?user_id=eq.${user.id}&related_object_ids=cs.{${opportunityId}}&select=agent_id,input_type,status`, { headers: restHeaders });
    expect(preparationJobs.ok(), await preparationJobs.text()).toBeTruthy();
    const queuedPreparation = await preparationJobs.json() as Array<{ agent_id: string; input_type: string; status: string }>;
    expect(queuedPreparation).toHaveLength(4);
    expect(new Set(queuedPreparation.map((job) => job.agent_id))).toEqual(new Set(["career-application-manager", "career-resume-tailor", "career-project-spec", "career-relationship-manager"]));
    const onboarding = await request.post(`${localSupabaseUrl}/rest/v1/onboarding_sessions`, { headers: restHeaders, data: { user_id: user.id, status: "in_progress", current_step: 14, completed_steps: Array.from({ length: 13 }, (_, index) => index + 1), answers: {}, created_by: "user", updated_by: "user" } });
    expect(onboarding.ok(), await onboarding.text()).toBeTruthy();
    await page.goto("/onboarding");
    await expect(page.getByLabel("Known sources")).toHaveValue("https://www.instagram.com/zero2sudo/");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByLabel("Urgent notification email")).toHaveValue(email);
    const sources = await request.get(`${localSupabaseUrl}/rest/v1/source_monitors?user_id=eq.${user.id}&url=eq.${encodeURIComponent("https://www.instagram.com/zero2sudo/")}&select=status,schedule,requires_auth,browser_use_enabled`, { headers: restHeaders });
    expect(sources.ok()).toBeTruthy();
    expect(await sources.json()).toEqual([{ status: "proposed", schedule: "every_2_hours", requires_auth: true, browser_use_enabled: true }]);
    const workItems = await request.get(`${localSupabaseUrl}/rest/v1/onboarding_work_items?user_id=eq.${user.id}&work_type=eq.source&select=status,phase,title`, { headers: restHeaders });
    expect(workItems.ok()).toBeTruthy();
    expect(await workItems.json()).toEqual([expect.objectContaining({ status: "queued", phase: "inspecting_source", title: "Connect @zero2sudo" })]);
    const inspectionJobs = await request.get(`${localSupabaseUrl}/rest/v1/agent_jobs?user_id=eq.${user.id}&agent_id=eq.career-source-discovery&input_type=eq.source.inspect&select=status,input`, { headers: restHeaders });
    expect(inspectionJobs.ok()).toBeTruthy();
    expect(await inspectionJobs.json()).toEqual([expect.objectContaining({ status: "queued", input: expect.objectContaining({ sourceMonitorId: expect.any(String), onboardingWorkItemId: expect.any(String) }) })]);
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByLabel("Initial discovery focus")).toBeVisible();
    const profiles = await request.get(`${localSupabaseUrl}/rest/v1/profiles?user_id=eq.${user.id}&select=metadata`, { headers: restHeaders });
    const profileRows = await profiles.json() as Array<{ metadata: { notificationEmail?: string } }>;
    expect(profileRows[0]?.metadata.notificationEmail).toBe(email);
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
