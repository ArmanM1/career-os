import { z } from "zod";
import { agentDefinitions, type AgentId } from "./agents";
import { agentOutputSchema, type AgentOutput } from "./schemas";

export const agentCapabilitySchema = z.enum([
  "read_database",
  "write_proposed_mutations",
  "queue_agent_jobs",
  "read_local_files",
  "write_local_files",
  "run_deterministic_scripts",
  "browser_read",
  "computer_use_read",
  "external_action_approval_only",
]);

export const agentContractSchema = z.object({
  agentId: z.string(),
  purpose: z.string(),
  requiredContext: z.array(z.string()),
  optionalContext: z.array(z.string()).default([]),
  inputTypes: z.array(z.string()).min(1),
  outputMutationTypes: z.array(z.string()),
  allowedCapabilities: z.array(agentCapabilitySchema),
  forbiddenActions: z.array(z.string()),
  downstreamSuggestions: z.array(z.string()).default([]),
  fixtureScenarios: z.array(
    z.object({
      name: z.string(),
      inputType: z.string(),
      prompt: z.string(),
    }),
  ),
});

export type AgentCapability = z.infer<typeof agentCapabilitySchema>;
export type AgentContract = z.infer<typeof agentContractSchema> & { agentId: AgentId };

const sharedForbiddenActions = [
  "Do not send messages, emails, DMs, comments, or posts.",
  "Do not submit applications or register for events.",
  "Do not follow accounts, change account settings, or mutate external account state.",
  "Do not delete canonical Career OS records without approval.",
  "Do not directly write canonical state outside structured proposed mutations.",
];

const readWriteCapabilities: AgentCapability[] = [
  "read_database",
  "write_proposed_mutations",
  "external_action_approval_only",
];

export const agentContracts: AgentContract[] = [
  {
    agentId: "career-advisor",
    purpose: "Answer broad Career OS questions and route specialized work to the right agent.",
    requiredContext: ["profile", "goals", "tasks", "applications", "approvals", "source_monitors", "recent_agent_runs"],
    optionalContext: ["calendar_constraints", "connected_accounts", "resume_variants"],
    inputTypes: ["advisor.chat", "advisor.route_request"],
    outputMutationTypes: ["agent_job.create", "goal.create", "goal.update", "task.create", "task.update"],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: [
      "career-onboarding",
      "career-positioning",
      "career-job-sourcing",
      "career-job-finder",
      "career-opportunity-ranking",
      "career-weekly-planner",
      "career-resume-tailor",
      "career-event-scanner",
      "career-mentor-manager",
    ],
    fixtureScenarios: [
      {
        name: "Route a job discovery request",
        inputType: "advisor.route_request",
        prompt: "The user asks to find new summer 2027 SWE internship sources.",
      },
    ],
  },
  {
    agentId: "career-onboarding",
    purpose: "Build the initial profile, academic context, goals, source setup, application strategy, and resume baseline.",
    requiredContext: ["user_interview_answers", "current_date_time", "resume_baseline", "connected_account_state"],
    optionalContext: ["github_profile", "gmail_state", "google_calendar_state", "school_calendar", "existing_applications"],
    inputTypes: ["onboarding.start", "onboarding.answer", "onboarding.resume_ingest"],
    outputMutationTypes: [
      "profile.upsert",
      "academic_context.upsert",
      "constraint.create",
      "goal.create",
      "goal.update",
      "company.create",
      "role_target.create",
      "experience.create",
      "project.create",
      "skill.create",
      "resume_variant.create",
      "source_discovery_run.create",
      "source_candidate.create",
      "source_monitor.create_proposal",
      "task.create",
      "agent_job.create",
    ],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs", "read_local_files"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-positioning", "career-job-sourcing", "career-weekly-planner", "career-resume-tailor"],
    fixtureScenarios: [
      {
        name: "Collect summer target season and baseline profile",
        inputType: "onboarding.answer",
        prompt: "The user confirms they are targeting summer 2027 internships and has a LaTeX resume.",
      },
    ],
  },
  {
    agentId: "career-positioning",
    purpose: "Maintain time-aware long-term career direction, recruiting seasons, timelines, and allocation across tracks.",
    requiredContext: ["profile", "academic_context", "goals", "completion_history", "current_date_time"],
    optionalContext: ["applications", "opportunities", "calendar_constraints", "market_notes", "source_discovery_runs"],
    inputTypes: ["positioning.review", "positioning.season_update", "positioning.goal_change"],
    outputMutationTypes: ["goal.create", "goal.update", "task.create", "source_discovery_run.create", "agent_job.create"],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-job-sourcing", "career-weekly-planner", "career-mentor-manager"],
    fixtureScenarios: [
      {
        name: "Add an emerging recruiting season",
        inputType: "positioning.season_update",
        prompt: "Summer 2027 internship sourcing is starting earlier than expected.",
      },
    ],
  },
  {
    agentId: "career-job-sourcing",
    purpose: "Find durable opportunity sources and propose monitors for jobs, internships, fellowships, events, and programs.",
    requiredContext: ["profile", "role_targets", "target_season", "target_companies", "source_preferences"],
    optionalContext: ["user_provided_accounts", "existing_source_monitors", "browser_use_allowed", "computer_use_allowed"],
    inputTypes: ["job_sourcing.discover", "job_sourcing.inspect_source", "job_sourcing.repair_source"],
    outputMutationTypes: [
      "source_discovery_run.create",
      "source_discovery_run.update",
      "source_candidate.create",
      "source_monitor.create_proposal",
      "source_monitor.update_metadata",
      "source_monitor.update_health",
      "signal.create",
      "agent_job.create",
    ],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs", "browser_read", "computer_use_read"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-source-adapter-builder", "career-opportunity-ranking"],
    fixtureScenarios: [
      {
        name: "Discover GitHub internship repos",
        inputType: "job_sourcing.discover",
        prompt: "Find durable GitHub sources for summer 2027 SWE internships.",
      },
    ],
  },
  {
    agentId: "career-source-adapter-builder",
    purpose: "Turn repeatable sources into deterministic scripts and parsers where possible.",
    requiredContext: ["source_candidate_or_monitor", "parser_conventions", "local_script_paths"],
    optionalContext: ["source_run_history", "sample_payloads", "repo_checkout_path"],
    inputTypes: ["source_adapter.build", "source_adapter.repair", "source_adapter.test"],
    outputMutationTypes: ["source_monitor.update_metadata", "source_monitor.update_health", "signal.create", "agent_job.create"],
    allowedCapabilities: [
      ...readWriteCapabilities,
      "queue_agent_jobs",
      "read_local_files",
      "write_local_files",
      "run_deterministic_scripts",
    ],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-opportunity-ranking"],
    fixtureScenarios: [
      {
        name: "Build parser for a proposed GitHub repo source",
        inputType: "source_adapter.build",
        prompt: "Create a repeatable parser strategy for a GitHub list source.",
      },
    ],
  },
  {
    agentId: "career-job-finder",
    purpose: "Create opportunity, application, task, and status-check proposals from known sources and target company scans.",
    requiredContext: ["active_source_monitors", "role_targets", "target_companies", "applications", "resume_baseline"],
    optionalContext: ["source_signals", "opportunities", "calendar_constraints", "connected_accounts"],
    inputTypes: ["job_finder.search", "job_finder.from_source", "job_finder.company_scan"],
    outputMutationTypes: [
      "opportunity.create",
      "application.create",
      "application.update_metadata",
      "application_status_check.schedule",
      "task.create",
      "signal.create",
      "agent_job.create",
    ],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs", "browser_read"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-opportunity-ranking", "career-resume-tailor", "career-weekly-planner"],
    fixtureScenarios: [
      {
        name: "Create opportunities from a known source",
        inputType: "job_finder.from_source",
        prompt: "Extract likely internships from the existing proposed GitHub source.",
      },
    ],
  },
  {
    agentId: "career-opportunity-ranking",
    purpose: "Dedupe and rank opportunity signals against goals, constraints, and application strategy.",
    requiredContext: ["opportunities", "signals", "goals", "constraints", "applications", "role_targets"],
    optionalContext: ["calendar_availability", "mentor_context", "resume_baseline", "opportunity_ranking_preferences"],
    inputTypes: ["opportunity_ranking.rank_batch", "opportunity_ranking.dedupe"],
    outputMutationTypes: ["opportunity_recommendation.create", "signal.create", "agent_job.create"],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs"],
    forbiddenActions: [
      ...sharedForbiddenActions,
      "Do not create final dashboard tasks; the Weekly Planner owns todo prioritization.",
    ],
    downstreamSuggestions: ["career-weekly-planner", "career-resume-tailor", "career-mentor-manager"],
    fixtureScenarios: [
      {
        name: "Rank a batch of new signals",
        inputType: "opportunity_ranking.rank_batch",
        prompt: "Rank three internship opportunity signals and show rationale only.",
      },
    ],
  },
  {
    agentId: "career-weekly-planner",
    purpose: "Convert goals, recommendations, applications, events, and calendar constraints into concrete action items.",
    requiredContext: ["goals", "tasks", "applications", "opportunity_recommendations", "calendar_constraints", "completion_history"],
    optionalContext: ["events", "mentor_relationships", "source_signals", "check_in_answers"],
    inputTypes: ["weekly_planner.plan_week", "weekly_planner.replan", "weekly_planner.check_in"],
    outputMutationTypes: ["task.create", "task.update", "task.complete", "application.update_metadata", "agent_job.create"],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-resume-tailor", "career-mentor-manager", "career-event-scanner"],
    fixtureScenarios: [
      {
        name: "Build the weekly action list",
        inputType: "weekly_planner.plan_week",
        prompt: "Create a plan from current recommendations and calendar constraints.",
      },
    ],
  },
  {
    agentId: "career-resume-tailor",
    purpose: "Create LaTeX-backed resume variant proposals and metadata for applications and target roles.",
    requiredContext: ["resume_templates", "resume_versions", "experiences", "projects", "skills", "target_application_or_opportunity"],
    optionalContext: ["resume_bullets", "company_context", "role_requirements"],
    inputTypes: ["resume_tailor.create_variant", "resume_tailor.review_variant"],
    outputMutationTypes: ["resume_variant.create", "resume_bullet.create", "task.create", "application.update_metadata"],
    allowedCapabilities: [...readWriteCapabilities, "read_local_files", "write_local_files"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-weekly-planner"],
    fixtureScenarios: [
      {
        name: "Create a draft resume variant",
        inputType: "resume_tailor.create_variant",
        prompt: "Create metadata for a tailored SWE internship resume variant.",
      },
    ],
  },
  {
    agentId: "career-event-scanner",
    purpose: "Find events tied to goals, target companies, applications, mentors, and academic constraints.",
    requiredContext: ["goals", "target_companies", "applications", "calendar_constraints"],
    optionalContext: ["mentor_relationships", "school_event_sources", "email_state", "browser_use_allowed"],
    inputTypes: ["event_scanner.search", "event_scanner.company_context"],
    outputMutationTypes: ["event.create", "event.update", "opportunity.create", "task.create", "source_monitor.create_proposal", "agent_job.create"],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs", "browser_read", "computer_use_read"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-weekly-planner", "career-mentor-manager"],
    fixtureScenarios: [
      {
        name: "Find events connected to target companies",
        inputType: "event_scanner.search",
        prompt: "Find events that could support applications to Apple and similar companies.",
      },
    ],
  },
  {
    agentId: "career-mentor-manager",
    purpose: "Maintain mentor relationships, follow-ups, new mentor targets, and outreach drafts.",
    requiredContext: ["contacts", "mentor_relationships", "goals", "applications", "calendar_constraints"],
    optionalContext: ["events", "communication_metadata", "target_companies", "alumni_sources"],
    inputTypes: ["mentor_manager.review", "mentor_manager.find_targets", "mentor_manager.follow_up_plan"],
    outputMutationTypes: ["contact.create", "contact.update", "mentor_relationship.create", "mentor_relationship.update", "task.create", "agent_job.create"],
    allowedCapabilities: [...readWriteCapabilities, "queue_agent_jobs", "browser_read"],
    forbiddenActions: sharedForbiddenActions,
    downstreamSuggestions: ["career-weekly-planner", "career-event-scanner"],
    fixtureScenarios: [
      {
        name: "Create follow-up tasks for stale mentors",
        inputType: "mentor_manager.review",
        prompt: "Review current mentor relationships and propose follow-up actions.",
      },
    ],
  },
];

const definitionsById = new Set(agentDefinitions.map((agent) => agent.id));
const contractsById = new Map(agentContracts.map((contract) => [contract.agentId, contract]));

export function getAgentContract(agentId: string) {
  return contractsById.get(agentId as AgentId);
}

export function validateAgentContracts() {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const contract of agentContracts) {
    const parsed = agentContractSchema.safeParse(contract);
    if (!parsed.success) issues.push(`${contract.agentId}: ${parsed.error.message}`);
    if (seen.has(contract.agentId)) issues.push(`${contract.agentId}: duplicate contract`);
    seen.add(contract.agentId);
    if (!definitionsById.has(contract.agentId)) issues.push(`${contract.agentId}: missing agent definition`);
    for (const scenario of contract.fixtureScenarios) {
      if (!contract.inputTypes.includes(scenario.inputType)) {
        issues.push(`${contract.agentId}: fixture ${scenario.name} uses unknown input type ${scenario.inputType}`);
      }
    }
  }

  for (const definition of agentDefinitions) {
    if (!contractsById.has(definition.id)) issues.push(`${definition.id}: missing agent contract`);
  }

  return issues;
}

export function validateAgentJobInput(agentId: string, input: unknown) {
  const contract = getAgentContract(agentId);
  const warnings: string[] = [];
  if (!contract) return { ok: false, warnings, error: `Missing contract for agent ${agentId}` };

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    warnings.push(`Agent job input has no object payload. Expected one of: ${contract.inputTypes.join(", ")}.`);
    return { ok: true, warnings };
  }

  const type = (input as Record<string, unknown>).type;
  if (typeof type !== "string" || type.length === 0) {
    warnings.push(`Agent job input is missing type. Expected one of: ${contract.inputTypes.join(", ")}.`);
    return { ok: true, warnings };
  }

  if (!contract.inputTypes.includes(type)) {
    return {
      ok: false,
      warnings,
      error: `Input type ${type} is not valid for ${agentId}. Expected one of: ${contract.inputTypes.join(", ")}.`,
    };
  }

  return { ok: true, warnings };
}

export function enforceAgentOutputContract(agentId: string, output: AgentOutput) {
  const parsed = agentOutputSchema.parse(output);
  const contract = getAgentContract(agentId);
  if (!contract) {
    return {
      output: {
        ...parsed,
        proposedMutations: [],
        warnings: [...parsed.warnings, `Missing contract for ${agentId}; proposed mutations were not applied.`],
      },
      warnings: [`Missing contract for ${agentId}; proposed mutations were not applied.`],
    };
  }

  const warnings: string[] = [];
  const proposedMutations = parsed.proposedMutations.filter((mutation) => {
    if (contract.outputMutationTypes.includes(mutation.mutationType)) return true;
    warnings.push(`${agentId} emitted disallowed mutation ${mutation.mutationType}; it was ignored.`);
    return false;
  });

  return {
    output: {
      ...parsed,
      proposedMutations,
      warnings: [...parsed.warnings, ...warnings],
    },
    warnings,
  };
}
