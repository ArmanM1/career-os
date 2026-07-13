import { z } from "zod";
import type { AgentId } from "./agents";

export type RegistryApprovalPolicy = "auto_apply" | "approval_required";
export type MutationRegistryEntry = {
  payloadSchema: z.ZodType;
  owners: readonly AgentId[];
  approvalPolicy: RegistryApprovalPolicy;
  idempotency: "required" | "target_version" | "natural_key";
  applier: string;
  auditFormatter: (payload: unknown) => string;
  fixture: unknown;
};

const title = z.object({ title: z.string().min(1) }).passthrough();
const target = z.object({ id: z.uuid() }).passthrough();
const owner = (...owners: AgentId[]) => owners;
const define = (payloadSchema: z.ZodType, owners: readonly AgentId[], approvalPolicy: RegistryApprovalPolicy, applier: string, fixture: unknown, idempotency: MutationRegistryEntry["idempotency"] = "required"): MutationRegistryEntry => ({
  payloadSchema,
  owners,
  approvalPolicy,
  idempotency,
  applier,
  auditFormatter: (payload) => `${applier}: ${JSON.stringify(payload).slice(0, 180)}`,
  fixture,
});

export const mutationRegistry = {
  "agent_job.enqueue": define(z.object({ agentId: z.string(), inputType: z.string(), input: z.record(z.string(), z.unknown()), title: z.string() }), owner("career-advisor", "career-onboarding", "career-positioning", "career-source-discovery", "career-opportunity-intelligence", "career-application-manager", "career-daily-weekly-planner"), "auto_apply", "enqueueAgentJob", { agentId: "career-state-curator", inputType: "state.curate", input: {}, title: "Curate state" }),
  "profile.upsert": define(title, owner("career-onboarding", "career-state-curator"), "auto_apply", "upsertProfile", { title: "Profile" }, "natural_key"),
  "academic_context.upsert": define(title, owner("career-onboarding"), "auto_apply", "upsertAcademicContext", { title: "Academic context" }, "natural_key"),
  "career_season.upsert": define(title.extend({ seasonType: z.string() }), owner("career-onboarding", "career-positioning"), "auto_apply", "upsertCareerSeason", { title: "Recruiting season", seasonType: "internship_peak" }, "natural_key"),
  "goal.upsert": define(title.extend({ status: z.string().default("active") }), owner("career-onboarding", "career-positioning", "career-advisor"), "auto_apply", "upsertGoal", { title: "Secure a SWE internship", status: "active" }, "natural_key"),
  "state_item.revise": define(z.object({ stableKey: z.string(), itemType: z.string(), value: z.unknown(), humanValue: z.string(), confidence: z.enum(["low", "medium", "high"]), salience: z.number().int().min(0).max(100), expiresAt: z.string().datetime().optional(), userStated: z.boolean() }), owner("career-state-curator"), "auto_apply", "reviseStateItem", { stableKey: "weekly_workload", itemType: "concern", value: "high", humanValue: "Overwhelmed", confidence: "high", salience: 90, userStated: true }, "natural_key"),
  "state_item.undo": define(z.object({ revisionId: z.uuid() }), owner("career-state-curator"), "auto_apply", "undoStateRevision", { revisionId: "00000000-0000-4000-8000-000000000001" }, "target_version"),
  "open_question.upsert": define(z.object({ question: z.string(), reason: z.string(), affectedFields: z.array(z.string()) }), owner("career-onboarding", "career-state-curator", "career-positioning", "career-daily-weekly-planner"), "auto_apply", "upsertOpenQuestion", { question: "Which role track is primary?", reason: "conflict", affectedFields: ["role_targets"] }, "natural_key"),
  "task.create": define(title.extend({ taskType: z.string(), priority: z.number().int().optional() }), owner("career-advisor", "career-onboarding", "career-positioning", "career-application-manager", "career-resume-tailor", "career-relationship-manager", "career-event-scanner", "career-daily-weekly-planner", "career-project-spec"), "auto_apply", "createTask", { title: "Apply to role", taskType: "job_app", priority: 80 }),
  "task.update": define(target, owner("career-advisor", "career-application-manager", "career-daily-weekly-planner"), "auto_apply", "updateTask", { id: "00000000-0000-4000-8000-000000000001", status: "completed" }, "target_version"),
  "daily_plan.upsert": define(z.object({ planDate: z.iso.date(), stateVersion: z.number().int(), rationale: z.string() }), owner("career-daily-weekly-planner"), "auto_apply", "upsertDailyPlan", { planDate: "2026-07-12", stateVersion: 1, rationale: "Time-sensitive applications" }, "natural_key"),
  "weekly_plan.upsert": define(z.object({ weekStart: z.iso.date(), stateVersion: z.number().int(), rationale: z.string() }), owner("career-daily-weekly-planner"), "auto_apply", "upsertWeeklyPlan", { weekStart: "2026-07-12", stateVersion: 1, rationale: "Recruiting priorities" }, "natural_key"),
  "check_in.create": define(title.extend({ checkInType: z.string(), questions: z.array(z.unknown()) }), owner("career-daily-weekly-planner", "career-onboarding"), "auto_apply", "createCheckIn", { title: "Evening check-in", checkInType: "daily", questions: [] }),
  "source_candidate.create": define(title.extend({ url: z.url(), sourceType: z.string() }), owner("career-source-discovery"), "auto_apply", "createSourceCandidate", { title: "Internship list", url: "https://example.com/jobs", sourceType: "github_repo" }, "natural_key"),
  "source_monitor.propose": define(title.extend({ url: z.url(), sourceType: z.string(), requiresAuth: z.boolean() }), owner("career-source-discovery", "career-source-adapter-builder"), "auto_apply", "proposeSourceMonitor", { title: "ATS board", url: "https://example.com/jobs", sourceType: "greenhouse_board", requiresAuth: false }, "natural_key"),
  "source_monitor.update": define(target, owner("career-source-discovery", "career-source-adapter-builder"), "auto_apply", "updateSourceMonitor", { id: "00000000-0000-4000-8000-000000000001", status: "active" }, "target_version"),
  "source_adapter.upsert": define(title.extend({ adapterType: z.string(), definition: z.record(z.string(), z.unknown()), checksum: z.string() }), owner("career-source-adapter-builder"), "auto_apply", "upsertSourceAdapter", { title: "Greenhouse adapter", adapterType: "greenhouse", definition: {}, checksum: "abc" }, "natural_key"),
  "signal.create": define(title.extend({ signalType: z.string(), payload: z.record(z.string(), z.unknown()) }), owner("career-source-discovery", "career-source-adapter-builder", "career-opportunity-intelligence", "career-event-scanner"), "auto_apply", "createSignal", { title: "Role opened", signalType: "job_post", payload: {} }, "natural_key"),
  "opportunity.upsert": define(title.extend({ opportunityType: z.string(), canonicalUrl: z.url().optional() }), owner("career-opportunity-intelligence", "career-application-manager", "career-event-scanner"), "auto_apply", "upsertOpportunity", { title: "Software Engineering Intern", opportunityType: "internship", canonicalUrl: "https://example.com/job" }, "natural_key"),
  "opportunity_recommendation.upsert": define(z.object({ opportunityId: z.uuid(), score: z.number().min(0).max(100), recommendation: z.string(), rationale: z.string() }).passthrough(), owner("career-opportunity-intelligence"), "auto_apply", "upsertOpportunityRecommendation", { opportunityId: "00000000-0000-4000-8000-000000000001", score: 82, recommendation: "apply_now", rationale: "Strong fit" }, "natural_key"),
  "application.upsert": define(title.extend({ status: z.string(), opportunityId: z.uuid().optional() }), owner("career-application-manager", "career-onboarding"), "auto_apply", "upsertApplication", { title: "Example application", status: "drafting" }, "natural_key"),
  "application_requirement.upsert": define(title.extend({ applicationId: z.uuid(), requirementType: z.string() }), owner("career-application-manager"), "auto_apply", "upsertApplicationRequirement", { title: "Resume", applicationId: "00000000-0000-4000-8000-000000000001", requirementType: "resume" }, "natural_key"),
  "application_packet.upsert": define(title.extend({ applicationId: z.uuid(), contents: z.record(z.string(), z.unknown()) }), owner("career-application-manager"), "auto_apply", "upsertApplicationPacket", { title: "Application packet", applicationId: "00000000-0000-4000-8000-000000000001", contents: {} }, "natural_key"),
  "application_status.record": define(z.object({ applicationId: z.uuid(), newStatus: z.string(), confidence: z.enum(["low", "medium", "high"]), evidenceIds: z.array(z.uuid()) }), owner("career-application-manager"), "auto_apply", "recordApplicationStatus", { applicationId: "00000000-0000-4000-8000-000000000001", newStatus: "interview", confidence: "high", evidenceIds: ["00000000-0000-4000-8000-000000000002"] }, "target_version"),
  "application.form_fill.request": define(z.object({ applicationId: z.uuid(), portalUrl: z.url(), fields: z.array(z.object({ name: z.string(), value: z.string() })), artifactIds: z.array(z.uuid()), finalSubmitSelectors: z.array(z.string()) }), owner("career-application-manager"), "approval_required", "enqueueApprovedFormFill", { applicationId: "00000000-0000-4000-8000-000000000001", portalUrl: "https://example.com/apply", fields: [], artifactIds: [], finalSubmitSelectors: ["button[type=submit]"] }),
  "resume_variant.create": define(title.extend({ templateId: z.uuid(), applicationId: z.uuid().optional(), latexSource: z.string(), itemIds: z.array(z.uuid()) }), owner("career-resume-tailor"), "auto_apply", "createResumeVariant", { title: "Role resume", templateId: "00000000-0000-4000-8000-000000000001", latexSource: "\\documentclass{article}", itemIds: [] }),
  "artifact.create": define(title.extend({ bucket: z.string(), storagePath: z.string(), sha256: z.string(), artifactType: z.string() }), owner("career-onboarding", "career-resume-tailor", "career-application-manager"), "auto_apply", "createArtifact", { title: "Resume PDF", bucket: "resume-artifacts", storagePath: "user/file.pdf", sha256: "abc", artifactType: "resume_pdf" }, "natural_key"),
  "project_spec.create": define(title.extend({ opportunityId: z.uuid(), specification: z.record(z.string(), z.unknown()) }), owner("career-project-spec", "career-application-manager"), "auto_apply", "createProjectSpec", { title: "Role bridge project", opportunityId: "00000000-0000-4000-8000-000000000001", specification: {} }),
  "contact.upsert": define(title.extend({ fullName: z.string() }), owner("career-onboarding", "career-relationship-manager", "career-event-scanner"), "auto_apply", "upsertContact", { title: "Contact", fullName: "Taylor Example" }, "natural_key"),
  "relationship.upsert": define(title.extend({ contactId: z.uuid(), status: z.string() }), owner("career-relationship-manager"), "auto_apply", "upsertRelationship", { title: "Mentor relationship", contactId: "00000000-0000-4000-8000-000000000001", status: "active" }, "natural_key"),
  "interaction.create": define(title.extend({ contactId: z.uuid(), interactionType: z.string(), occurredAt: z.iso.datetime() }), owner("career-relationship-manager"), "auto_apply", "createInteraction", { title: "Coffee chat", contactId: "00000000-0000-4000-8000-000000000001", interactionType: "meeting", occurredAt: "2026-07-12T18:00:00Z" }),
  "referral_path.upsert": define(title.extend({ contactId: z.uuid(), connectionReason: z.string() }), owner("career-relationship-manager", "career-application-manager"), "auto_apply", "upsertReferralPath", { title: "Warm path", contactId: "00000000-0000-4000-8000-000000000001", connectionReason: "Previous meeting" }, "natural_key"),
  "outreach_draft.create": define(title.extend({ contactId: z.uuid().optional(), draftType: z.string(), channel: z.string(), body: z.string() }), owner("career-relationship-manager", "career-application-manager"), "auto_apply", "createOutreachDraft", { title: "Mentor update", draftType: "mentor_update", channel: "email", body: "Draft" }),
  "event.upsert": define(title.extend({ startsAt: z.iso.datetime().optional(), url: z.url().optional() }), owner("career-event-scanner", "career-onboarding"), "auto_apply", "upsertEvent", { title: "Career fair", startsAt: "2026-08-01T18:00:00Z" }, "natural_key"),
  "event_recommendation.upsert": define(z.object({ eventId: z.uuid(), score: z.number().min(0).max(100), rationale: z.string() }), owner("career-event-scanner"), "auto_apply", "upsertEventRecommendation", { eventId: "00000000-0000-4000-8000-000000000001", score: 90, rationale: "Target company attending" }, "natural_key"),
  "event.registration.request": define(z.object({ eventId: z.uuid(), registrationUrl: z.url(), fields: z.record(z.string(), z.string()) }), owner("career-event-scanner"), "approval_required", "enqueueApprovedEventRegistration", { eventId: "00000000-0000-4000-8000-000000000001", registrationUrl: "https://example.com/register", fields: {} }),
  "approval.request": define(title.extend({ actionType: z.string(), payload: z.record(z.string(), z.unknown()), riskLevel: z.enum(["low", "medium", "high"]) }), owner("career-advisor", "career-source-adapter-builder", "career-application-manager", "career-event-scanner"), "approval_required", "createApprovalRequest", { title: "Approve action", actionType: "application.form_fill", payload: {}, riskLevel: "medium" }),
  "evidence.create": define(title.extend({ sourceType: z.string(), payload: z.record(z.string(), z.unknown()) }), owner(...(["career-advisor", "career-onboarding", "career-state-curator", "career-positioning", "career-source-discovery", "career-source-adapter-builder", "career-opportunity-intelligence", "career-application-manager", "career-resume-tailor", "career-relationship-manager", "career-event-scanner", "career-daily-weekly-planner", "career-project-spec"] as AgentId[])), "auto_apply", "createEvidence", { title: "Source evidence", sourceType: "web", payload: {} }),
  "sensitive_data.export.request": define(z.object({ format: z.enum(["json", "zip"]), includeRawEvidence: z.boolean() }), owner("career-advisor"), "approval_required", "enqueueApprovedExport", { format: "zip", includeRawEvidence: false }),
  "sensitive_data.delete.request": define(z.object({ scope: z.string(), confirmation: z.string() }), owner("career-advisor"), "approval_required", "enqueueApprovedDeletion", { scope: "all", confirmation: "DELETE" }),
} as const satisfies Record<string, MutationRegistryEntry>;

export type MutationType = keyof typeof mutationRegistry;

export function getMutationRegistryEntry(type: string) {
  return mutationRegistry[type as MutationType];
}

export function validateMutationRegistry() {
  const issues: string[] = [];
  for (const [type, entry] of Object.entries(mutationRegistry)) {
    if (entry.owners.length === 0) issues.push(`${type}: missing owners`);
    if (!entry.applier) issues.push(`${type}: missing applier`);
    if (!entry.auditFormatter) issues.push(`${type}: missing audit formatter`);
    if (!entry.payloadSchema.safeParse(entry.fixture).success) issues.push(`${type}: invalid fixture`);
  }
  return issues;
}
