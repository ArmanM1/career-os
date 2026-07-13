export type StateItemType = "thought" | "feeling" | "energy" | "stress" | "confidence" | "priority" | "concern" | "preference" | "interest" | "career_hypothesis" | "decision" | "intended_next_step";

export function defaultStateExpiry(itemType: StateItemType, effectiveAt: Date) {
  const hours = ["feeling", "energy", "stress", "confidence"].includes(itemType) ? 48 : ["priority", "concern", "intended_next_step"].includes(itemType) ? 14 * 24 : ["interest", "career_hypothesis"].includes(itemType) ? 90 * 24 : null;
  return hours ? new Date(effectiveAt.getTime() + hours * 3600_000) : null;
}

export function canSupersedeState(existing: { userStated: boolean; effectiveAt: string }, incoming: { userStated: boolean; effectiveAt: string }) {
  if (existing.userStated && !incoming.userStated) return false;
  return new Date(incoming.effectiveAt).getTime() >= new Date(existing.effectiveAt).getTime();
}

export type OpportunityScores = { roleFit: number; eligibility: number; strategicValue: number; evidenceFit: number; projectBridge: number; timing: number; relationshipLeverage: number; resumeReadiness: number; sourceConfidence: number };
const weights: Record<keyof OpportunityScores, number> = { roleFit: 20, eligibility: 15, strategicValue: 15, evidenceFit: 10, projectBridge: 10, timing: 10, relationshipLeverage: 10, resumeReadiness: 5, sourceConfidence: 5 };

export function scoreOpportunity(scores: OpportunityScores) {
  const total = Object.entries(weights).reduce((sum, [key, weight]) => sum + Math.max(0, Math.min(100, scores[key as keyof OpportunityScores])) / 100 * weight, 0);
  const score = Math.round(total * 10) / 10;
  return { score, recommendation: score >= 78 ? "apply_now" : score >= 62 ? "prepare_then_apply" : "research" } as const;
}

export function canonicalOpportunityKey(input: { canonicalUrl?: string; atsId?: string; company: string; role: string; location?: string; season?: string }) {
  if (input.canonicalUrl) { const url = new URL(input.canonicalUrl); url.hash = ""; ["utm_source", "utm_medium", "utm_campaign", "ref"].forEach((key) => url.searchParams.delete(key)); return `url:${url.toString().toLowerCase()}`; }
  if (input.atsId) return `ats:${input.atsId.toLowerCase()}`;
  return [input.company, input.role, input.location ?? "", input.season ?? ""].map((value) => value.trim().toLowerCase().replace(/\s+/g, " ")).join("|");
}

export function validateResumeRenderedFact(source: string, rendered: string) {
  const sourceNumbers = new Set(source.match(/\b\d+(?:\.\d+)?(?:%|\b)/g) ?? []); const renderedNumbers = rendered.match(/\b\d+(?:\.\d+)?(?:%|\b)/g) ?? [];
  const inventedNumbers = renderedNumbers.filter((number) => !sourceNumbers.has(number));
  return { valid: inventedNumbers.length === 0, inventedNumbers };
}

export function notificationIdempotencyKey(category: string, objectId: string, event: string) { return [category, objectId, event].map((value) => value.trim().toLowerCase()).join(":"); }
export function formatClipboardDraft(subject: string | null | undefined, body: string) { return [subject?.trim(), body.trim()].filter(Boolean).join("\n\n"); }
