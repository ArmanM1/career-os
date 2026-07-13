import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { agentContracts, agentSchemas, browserSourceSkillDefinitionSchema, classifyMutations, defaultStateExpiry, enforceAgentOutputContract, formatClipboardDraft, mutationRegistry, notificationIdempotencyKey, renderBrowserSourceSkill, scoreOpportunity, validateAgentContracts, validateBrowserSourceSkillMarkdown, validateMutationRegistry, validateResumeRenderedFact } from "./index";

describe("Career OS contracts", () => {
  it("has a complete mutation registry and agent ownership", () => { expect(validateMutationRegistry()).toEqual([]); expect(validateAgentContracts()).toEqual([]); expect(agentContracts).toHaveLength(14); });
  it("validates a versioned input schema for every agent", () => { for (const contract of agentContracts) expect(agentSchemas[contract.agentId].input.safeParse({ schemaVersion: 1, type: contract.inputTypes[0] }).success).toBe(true); });
  it("rejects unregistered mutations", () => { const result = classifyMutations([{ id: "00000000-0000-4000-8000-000000000001", mutationType: "unknown.mutation", targetObjectType: "task", payload: {}, rationale: "test", evidenceIds: [], confidence: "high", approvalPolicy: "auto_apply" }]); expect(result.rejected).toHaveLength(1); });
  it("enforces registry approval policy at the trusted completion boundary", () => {
    const mutation = { id: "00000000-0000-4000-8000-000000000001", idempotencyKey: "form-fill-1", mutationType: "application.form_fill.request", targetObjectType: "application" as const, payload: { applicationId: "00000000-0000-4000-8000-000000000002", portalUrl: "https://example.com/apply", fields: [], artifactIds: [], finalSubmitSelectors: ["button[type=submit]"] }, rationale: "Prepare the form", evidenceIds: [], confidence: "high" as const, approvalPolicy: "auto_apply" as const };
    const output = enforceAgentOutputContract("career-application-manager", { schemaVersion: 1, summary: "Prepared", disposition: { status: "completed" }, messageParts: [], proposedMutations: [mutation], approvalRequests: [], stateObservations: [], evidence: [], followUpQuestions: [], warnings: [] }).output;
    expect(output.proposedMutations[0].approvalPolicy).toBe("approval_required");
  });
  it("routes ambiguous application status evidence to review", () => {
    const result = classifyMutations([{ id: "00000000-0000-4000-8000-000000000001", idempotencyKey: "status-1", mutationType: "application_status.record", targetObjectType: "application", targetObjectId: "00000000-0000-4000-8000-000000000002", expectedObjectVersion: 1, payload: { applicationId: "00000000-0000-4000-8000-000000000002", newStatus: "interview", confidence: "medium", evidenceIds: [] }, rationale: "Possible interview email", evidenceIds: [], confidence: "medium", approvalPolicy: "auto_apply" }]);
    expect(result.approvalRequired[0].approvalPolicy).toBe("approval_required");
  });
  it("keeps every auto-applied registry mutation wired to the transactional SQL applier", () => {
    const migrations = resolve(import.meta.dirname, "../../../supabase/migrations");
    const sql = readdirSync(migrations).filter((name) => name.endsWith(".sql")).map((name) => readFileSync(resolve(migrations, name), "utf8")).join("\n");
    const missing = Object.entries(mutationRegistry).filter(([, entry]) => entry.approvalPolicy === "auto_apply").map(([type]) => type).filter((type) => !sql.includes(`mutation.mutation_type = '${type}'`));
    expect(missing).toEqual([]);
  });
});

describe("living state", () => {
  const now = new Date("2026-07-12T12:00:00Z");
  it("expires temporary feelings after 48 hours", () => expect(defaultStateExpiry("feeling", now)?.toISOString()).toBe("2026-07-14T12:00:00.000Z"));
  it("keeps explicit decisions until changed", () => expect(defaultStateExpiry("decision", now)).toBeNull());
});

describe("opportunity intelligence", () => {
  it("uses approved apply-now threshold", () => expect(scoreOpportunity({ roleFit: 90, eligibility: 100, strategicValue: 90, evidenceFit: 80, projectBridge: 80, timing: 90, relationshipLeverage: 60, resumeReadiness: 80, sourceConfidence: 90 }).recommendation).toBe("apply_now"));
});

describe("resume and notifications", () => {
  it("rejects invented resume metrics", () => expect(validateResumeRenderedFact("Improved latency by 18%", "Improved latency by 35%")).toEqual({ valid: false, inventedNumbers: ["35%"] }));
  it("formats copy-ready drafts and deterministic notification keys", () => { expect(formatClipboardDraft("Hello", "Body")).toBe("Hello\n\nBody"); expect(notificationIdempotencyKey("Deadline", "ABC", "24H")).toBe("deadline:abc:24h"); });
});

describe("source browser skills", () => {
  const definition = browserSourceSkillDefinitionSchema.parse({
    schemaVersion: 1,
    name: "read-zero2sudo-instagram",
    description: "Read zero2sudo Instagram stories for career opportunities through the dedicated browser.",
    sourceMonitorId: "00000000-0000-4000-8000-000000000001",
    sourceUrl: "https://www.instagram.com/zero2sudo/",
    allowedDomains: ["instagram.com"],
    startUrls: ["https://www.instagram.com/zero2sudo/"],
    provider: "instagram",
    requiresAuth: true,
    cadenceMinutes: 120,
    contentScope: "Active stories containing early-career jobs, events, programs, or application links",
    navigationSteps: ["Open the configured profile and inspect the active story if one exists."],
    relevanceRules: ["Keep early-career technology roles and career events."],
    extractionFields: ["company", "role", "deadline", "location", "link"],
    dedupeKeys: ["story-id", "frame-hash", "canonical-url"],
    captureScreenshots: true,
    rawEvidenceRetentionDays: 30,
  });
  it("renders a valid source-scoped browser skill", () => {
    const markdown = renderBrowserSourceSkill(definition);
    expect(validateBrowserSourceSkillMarkdown(markdown, definition)).toEqual([]);
    expect(markdown).toContain("Never use shell commands");
    expect(markdown).toContain("auth_required");
  });
  it("rejects malformed browser skills at the mutation boundary", () => {
    const schema = mutationRegistry["source_adapter.upsert"].payloadSchema;
    expect(schema.safeParse({ title: "Bad browser adapter", sourceMonitorId: definition.sourceMonitorId, adapterType: "browser_skill", definition: { sourceUrl: definition.sourceUrl }, checksum: "0123456789abcdef", domainAllowlist: ["instagram.com"] }).success).toBe(false);
    expect(schema.safeParse({ title: "Instagram browser adapter", sourceMonitorId: definition.sourceMonitorId, adapterType: "browser_skill", definition, checksum: "0123456789abcdef", domainAllowlist: ["instagram.com"], testResult: { valid: true } }).success).toBe(true);
  });
});
