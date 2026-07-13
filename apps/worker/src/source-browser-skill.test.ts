import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { materializeBrowserSourceSkill } from "./source-browser-skill";

describe("source browser skill materialization", () => {
  it("writes a validated source-scoped skill outside the code repository", async () => {
    const root = await mkdtemp(join(tmpdir(), "career-os-source-skills-"));
    const result = await materializeBrowserSourceSkill({
      schemaVersion: 1,
      name: "read-zero2sudo-instagram",
      description: "Read zero2sudo Instagram stories for early-career opportunities.",
      sourceMonitorId: "00000000-0000-4000-8000-000000000001",
      sourceUrl: "https://www.instagram.com/zero2sudo/",
      allowedDomains: ["instagram.com"],
      startUrls: ["https://www.instagram.com/zero2sudo/"],
      provider: "instagram",
      requiresAuth: true,
      cadenceMinutes: 120,
      contentScope: "Active career opportunity stories",
      navigationSteps: ["Open the configured profile and inspect the active story if present."],
      relevanceRules: ["Keep early-career technology jobs and events."],
      extractionFields: ["company", "role", "link"],
      dedupeKeys: ["story-id", "frame-hash"],
      captureScreenshots: true,
      rawEvidenceRetentionDays: 30,
    }, root);
    expect(result.cwd).toContain("00000000-0000-4000-8000-000000000001");
    expect(result.skillPath).toContain("read-zero2sudo-instagram");
    expect(await readFile(result.skillPath, "utf8")).toContain("auth_required");
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});
