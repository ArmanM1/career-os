import { z } from "zod";
import { agentDefinitions, type AgentId } from "./agents";
import { agentOutputSchema, type AgentOutput } from "./schemas";
import { mutationRegistry, type MutationType } from "./mutation-registry";

export const agentCapabilitySchema = z.enum(["read_state", "propose_mutations", "enqueue_jobs", "read_files", "write_workspace", "run_adapter", "browser_read", "browser_fill_after_approval", "latex_compile"]);
export type AgentCapability = z.infer<typeof agentCapabilitySchema>;

type ContractSeed = {
  purpose: string;
  inputTypes: readonly string[];
  outputMutationTypes: readonly MutationType[];
  allowedCapabilities: readonly AgentCapability[];
};

const rw: AgentCapability[] = ["read_state", "propose_mutations"];
const contracts = {
  "career-advisor": { purpose: "Explain current state and route work.", inputTypes: ["advisor.chat", "advisor.route"], outputMutationTypes: ["agent_job.enqueue", "goal.upsert", "task.create", "approval.request", "evidence.create", "sensitive_data.export.request", "sensitive_data.delete.request"], allowedCapabilities: [...rw, "enqueue_jobs"] },
  "career-onboarding": { purpose: "Run resumable dynamic onboarding and build the initial profile.", inputTypes: ["onboarding.start", "onboarding.answer", "onboarding.resume_ingest", "onboarding.review"], outputMutationTypes: ["profile.upsert", "academic_context.upsert", "career_season.upsert", "goal.upsert", "open_question.upsert", "task.create", "check_in.create", "contact.upsert", "event.upsert", "application.upsert", "artifact.create", "agent_job.enqueue", "evidence.create"], allowedCapabilities: [...rw, "enqueue_jobs", "read_files"] },
  "career-state-curator": { purpose: "Extract, expire, correct, and undo living state.", inputTypes: ["state.curate", "state.expire", "state.undo", "state.resolve_conflict"], outputMutationTypes: ["profile.upsert", "state_item.revise", "state_item.undo", "open_question.upsert", "evidence.create"], allowedCapabilities: rw },
  "career-positioning": { purpose: "Maintain goals, seasons, exploration, and strategic direction.", inputTypes: ["positioning.review", "positioning.season", "positioning.goal"], outputMutationTypes: ["career_season.upsert", "goal.upsert", "open_question.upsert", "task.create", "agent_job.enqueue", "evidence.create"], allowedCapabilities: [...rw, "enqueue_jobs"] },
  "career-source-discovery": { purpose: "Find and evaluate durable public and authenticated sources.", inputTypes: ["source.discover", "source.inspect", "source.repair"], outputMutationTypes: ["source_candidate.create", "source_monitor.propose", "source_monitor.update", "signal.create", "agent_job.enqueue", "evidence.create"], allowedCapabilities: [...rw, "enqueue_jobs", "browser_read"] },
  "career-source-adapter-builder": { purpose: "Build declarative adapters and isolated repair proposals.", inputTypes: ["adapter.build", "adapter.test", "adapter.repair"], outputMutationTypes: ["source_adapter.upsert", "source_monitor.update", "signal.create", "approval.request", "evidence.create"], allowedCapabilities: [...rw, "read_files", "write_workspace", "run_adapter"] },
  "career-opportunity-intelligence": { purpose: "Normalize, deduplicate, enrich, rank, and explain opportunities.", inputTypes: ["opportunity.rank", "opportunity.dedupe", "opportunity.feedback"], outputMutationTypes: ["signal.create", "opportunity.upsert", "opportunity_recommendation.upsert", "agent_job.enqueue", "evidence.create"], allowedCapabilities: [...rw, "enqueue_jobs"] },
  "career-application-manager": { purpose: "Prepare application packets and track application status.", inputTypes: ["application.prepare", "application.status_check", "application.form_fill", "application.import"], outputMutationTypes: ["application.upsert", "application_requirement.upsert", "application_packet.upsert", "application_status.record", "application.form_fill.request", "task.create", "task.update", "outreach_draft.create", "referral_path.upsert", "project_spec.create", "agent_job.enqueue", "evidence.create"], allowedCapabilities: [...rw, "enqueue_jobs", "browser_read", "browser_fill_after_approval"] },
  "career-resume-tailor": { purpose: "Import sources, generate verified LaTeX resume variants, and compile artifacts.", inputTypes: ["resume.import", "resume.create_variant", "resume.compile", "resume.review"], outputMutationTypes: ["resume_variant.create", "artifact.create", "task.create", "evidence.create"], allowedCapabilities: [...rw, "read_files", "write_workspace", "latex_compile"] },
  "career-relationship-manager": { purpose: "Manage contacts, interactions, warm paths, and outreach drafts.", inputTypes: ["relationship.review", "relationship.discover", "relationship.draft", "relationship.record_interaction"], outputMutationTypes: ["contact.upsert", "relationship.upsert", "interaction.create", "referral_path.upsert", "outreach_draft.create", "task.create", "evidence.create"], allowedCapabilities: [...rw, "browser_read"] },
  "career-event-scanner": { purpose: "Discover events and turn attendance into useful career context.", inputTypes: ["event.scan", "event.recommend", "event.follow_up", "event.register"], outputMutationTypes: ["event.upsert", "event_recommendation.upsert", "event.registration.request", "opportunity.upsert", "task.create", "contact.upsert", "evidence.create"], allowedCapabilities: [...rw, "browser_read"] },
  "career-daily-weekly-planner": { purpose: "Generate morning briefs, daily replans, check-ins, and weekly plans.", inputTypes: ["planner.morning", "planner.replan", "planner.daily_check_in", "planner.weekly_review"], outputMutationTypes: ["task.create", "task.update", "daily_plan.upsert", "weekly_plan.upsert", "check_in.create", "open_question.upsert", "agent_job.enqueue", "evidence.create"], allowedCapabilities: [...rw, "enqueue_jobs"] },
  "career-project-spec": { purpose: "Create detailed role-specific project specifications without building code.", inputTypes: ["project_spec.create", "project_spec.review"], outputMutationTypes: ["project_spec.create", "task.create", "evidence.create"], allowedCapabilities: rw },
} as const satisfies Record<AgentId, ContractSeed>;

const sharedForbiddenActions = ["send_message", "send_email", "post", "follow", "like", "comment", "final_application_submit", "purchase", "bypass_captcha", "bypass_mfa"] as const;

export const agentContracts = agentDefinitions.map((definition) => ({
  agentId: definition.id,
  ...contracts[definition.id],
  requiredContext: ["CurrentStateBundle", "current_date_time", "active_thread"],
  forbiddenActions: sharedForbiddenActions,
}));

export const agentSchemas = Object.fromEntries(agentContracts.map((contract) => {
  const input = z.object({
    schemaVersion: z.literal(1).default(1),
    type: z.string().refine((value) => (contract.inputTypes as readonly string[]).includes(value), { message: `Expected one of: ${contract.inputTypes.join(", ")}` }),
  }).passthrough();
  const allowedMutations = new Set<string>(contract.outputMutationTypes);
  const output = agentOutputSchema.superRefine((value, context) => {
    for (const mutation of value.proposedMutations) if (!allowedMutations.has(mutation.mutationType)) context.addIssue({ code: "custom", message: `${contract.agentId} cannot emit ${mutation.mutationType}` });
  });
  return [contract.agentId, { input, output }];
})) as unknown as Record<AgentId, { input: z.ZodType; output: z.ZodType<AgentOutput> }>;

export function getAgentContract(agentId: string) { return agentContracts.find((contract) => contract.agentId === agentId); }

export function validateAgentContracts() {
  const issues: string[] = [];
  for (const contract of agentContracts) {
    for (const mutation of contract.outputMutationTypes) {
      const entry = mutationRegistry[mutation];
      if (!entry) issues.push(`${contract.agentId}: ${mutation} missing registry entry`);
      else if (!entry.owners.includes(contract.agentId)) issues.push(`${contract.agentId}: ${mutation} does not list agent as owner`);
    }
  }
  return issues;
}

export function validateAgentJobInput(agentId: string, input: unknown) {
  const schema = agentSchemas[agentId as AgentId]?.input;
  if (!schema) return { ok: false, warnings: [], error: `Missing contract for agent ${agentId}` };
  const parsed = schema.safeParse(input);
  return parsed.success ? { ok: true, warnings: [] } : { ok: false, warnings: [], error: parsed.error.message };
}

export function enforceAgentOutputContract(agentId: string, output: AgentOutput) {
  const schema = agentSchemas[agentId as AgentId]?.output;
  if (!schema) return { output: { ...output, proposedMutations: [], warnings: [...output.warnings, `Missing contract for ${agentId}`] }, warnings: [`Missing contract for ${agentId}`] };
  const parsed = schema.parse(output);
  return { output: parsed, warnings: parsed.warnings };
}
