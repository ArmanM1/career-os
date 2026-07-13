import { describe, expect, it } from "vitest";
import { agentContracts, agentSchemas, classifyMutations, defaultStateExpiry, formatClipboardDraft, notificationIdempotencyKey, scoreOpportunity, validateAgentContracts, validateMutationRegistry, validateResumeRenderedFact } from "./index";

describe("Career OS contracts", () => {
  it("has a complete mutation registry and agent ownership", () => { expect(validateMutationRegistry()).toEqual([]); expect(validateAgentContracts()).toEqual([]); expect(agentContracts).toHaveLength(13); });
  it("validates a versioned input schema for every agent", () => { for (const contract of agentContracts) expect(agentSchemas[contract.agentId].input.safeParse({ schemaVersion: 1, type: contract.inputTypes[0] }).success).toBe(true); });
  it("rejects unregistered mutations", () => { const result = classifyMutations([{ id: "00000000-0000-4000-8000-000000000001", mutationType: "unknown.mutation", targetObjectType: "task", payload: {}, rationale: "test", evidenceIds: [], confidence: "high", approvalPolicy: "auto_apply" }]); expect(result.rejected).toHaveLength(1); });
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
