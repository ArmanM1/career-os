import { AgentOutput, classifyMutations, ProposedMutation } from "@career-os/core";
import type { WorkerSupabase } from "./supabase";

type RunContext = {
  userId: string;
  agentRunId: string;
};

type Payload = Record<string, unknown>;

export async function persistAgentOutput(supabase: WorkerSupabase, context: RunContext, output: AgentOutput) {
  const evidenceIds = await persistEvidence(supabase, context, output);
  const classified = classifyMutations(output.proposedMutations);

  for (const mutation of output.proposedMutations) {
    await insertRow(supabase, "proposed_mutations", {
      user_id: context.userId,
      agent_run_id: context.agentRunId,
      mutation_type: mutation.mutationType,
      target_object_type: mutation.targetObjectType,
      target_object_id: mutation.targetObjectId ?? null,
      payload: mutation.payload,
      rationale: mutation.rationale,
      evidence_ids: [...new Set([...mutation.evidenceIds, ...evidenceIds])],
      confidence: mutation.confidence,
      approval_policy: mutation.approvalPolicy,
      status: classified.applied.some((candidate) => candidate.id === mutation.id) ? "applied" : "pending",
      created_by: "agent",
      updated_by: "agent",
    });
  }

  for (const mutation of classified.approvalRequired) {
    await createApprovalFromMutation(supabase, context, mutation);
  }

  for (const request of output.approvalRequests) {
    await insertRow(supabase, "approval_requests", {
      user_id: context.userId,
      agent_run_id: context.agentRunId,
      title: request.title,
      status: "pending",
      action_type: request.actionType,
      target_object_type: request.targetObjectType ?? null,
      target_object_id: request.targetObjectId ?? null,
      rationale: request.rationale,
      risk_level: request.riskLevel,
      payload: request.payload,
      evidence_ids: [...new Set([...request.evidenceIds, ...evidenceIds])],
      created_by: "agent",
      updated_by: "agent",
    });
  }

  for (const mutation of classified.applied) {
    await applySafeMutation(supabase, context, mutation);
  }

  return classified;
}

async function persistEvidence(supabase: WorkerSupabase, context: RunContext, output: AgentOutput) {
  const ids: string[] = [];

  for (const evidence of output.evidence) {
    const row = await insertRow(supabase, "evidence", {
      id: evidence.id,
      user_id: context.userId,
      title: evidence.title,
      status: "active",
      labels: ["agent-output"],
      source_type: evidence.sourceType,
      source_url: evidence.sourceUrl ?? null,
      excerpt: evidence.excerpt ?? null,
      payload: evidence.payload,
      created_by: "agent",
      updated_by: "agent",
    });
    const id = value(row, "id");
    if (typeof id === "string") ids.push(id);
  }

  return ids;
}

async function createApprovalFromMutation(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  await insertRow(supabase, "approval_requests", {
    user_id: context.userId,
    agent_run_id: context.agentRunId,
    title: `Review ${mutation.mutationType}`,
    status: "pending",
    action_type: mutation.mutationType,
    target_object_type: mutation.targetObjectType,
    target_object_id: mutation.targetObjectId ?? null,
    rationale: mutation.rationale,
    risk_level: "medium",
    payload: mutation.payload,
    evidence_ids: mutation.evidenceIds,
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applySafeMutation(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  switch (mutation.mutationType) {
    case "evidence.create":
      await applyEvidenceCreate(supabase, context, mutation);
      break;
    case "source_discovery_run.create":
      await applySourceDiscoveryRunCreate(supabase, context, mutation);
      break;
    case "source_discovery_run.update":
      await applySourceDiscoveryRunUpdate(supabase, mutation);
      break;
    case "source_candidate.create":
      await applySourceCandidateCreate(supabase, context, mutation);
      break;
    case "source_monitor.create_proposal":
      await applySourceMonitorCreateProposal(supabase, context, mutation);
      break;
    case "source_monitor.update_metadata":
    case "source_monitor.update_health":
      await applySourceMonitorUpdate(supabase, mutation);
      break;
    case "signal.create":
      await applySignalCreate(supabase, context, mutation);
      break;
    case "opportunity_recommendation.create":
      await applyOpportunityRecommendationCreate(supabase, context, mutation);
      break;
    case "opportunity.create":
      await applyOpportunityCreate(supabase, context, mutation);
      break;
    case "task.create":
      await applyTaskCreate(supabase, context, mutation);
      break;
    case "application.create":
      await applyApplicationCreate(supabase, context, mutation);
      break;
    case "application_status_check.schedule":
      await applyApplicationStatusCheckSchedule(supabase, context, mutation);
      break;
    case "agent_job.create":
      await applyAgentJobCreate(supabase, context, mutation);
      break;
    default:
      break;
  }

  await insertRow(supabase, "audit_log_entries", {
    user_id: context.userId,
    agent_run_id: context.agentRunId,
    action_type: mutation.mutationType,
    target_object_type: mutation.targetObjectType,
    target_object_id: mutation.targetObjectId ?? null,
    summary: mutation.rationale,
    payload: mutation.payload,
    evidence_ids: mutation.evidenceIds,
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applyEvidenceCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await insertRow(supabase, "evidence", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    title: requiredText(payload, "title", "Evidence"),
    status: text(payload, "status", "active"),
    labels: stringArray(payload, "labels"),
    source_type: requiredText(payload, "sourceType", "agent"),
    source_url: optionalText(payload, "sourceUrl"),
    external_ref: optionalText(payload, "externalRef"),
    excerpt: optionalText(payload, "excerpt"),
    payload: record(payload, "payload"),
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applySourceDiscoveryRunCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await insertRow(supabase, "source_discovery_runs", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    agent_run_id: context.agentRunId,
    title: requiredText(payload, "title", "Source discovery"),
    status: text(payload, "status", "success"),
    labels: stringArray(payload, "labels"),
    mode: text(payload, "mode", "manual"),
    query: requiredText(payload, "query", ""),
    scope: stringArray(payload, "scope"),
    browser_use_allowed: bool(payload, "browserUseAllowed", false),
    computer_use_allowed: bool(payload, "computerUseAllowed", false),
    target_season: optionalText(payload, "targetSeason"),
    target_roles: stringArray(payload, "targetRoles"),
    target_companies: stringArray(payload, "targetCompanies"),
    account_hints: stringArray(payload, "accountHints"),
    max_duration_minutes: optionalNumber(payload, "maxDurationMinutes"),
    source_candidates_found: number(payload, "sourceCandidatesFound", 0),
    source_monitors_created: number(payload, "sourceMonitorsCreated", 0),
    source_monitors_updated: number(payload, "sourceMonitorsUpdated", 0),
    parser_jobs_queued: number(payload, "parserJobsQueued", 0),
    log_path: optionalText(payload, "logPath"),
    error_message: optionalText(payload, "errorMessage"),
    next_recommended_run_at: optionalText(payload, "nextRecommendedRunAt"),
    metadata: record(payload, "metadata"),
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applySourceDiscoveryRunUpdate(supabase: WorkerSupabase, mutation: ProposedMutation) {
  if (!mutation.targetObjectId) return;
  const payload = mutation.payload;
  await updateRow(supabase, "source_discovery_runs", mutation.targetObjectId, {
    status: optionalText(payload, "status"),
    source_candidates_found: optionalNumber(payload, "sourceCandidatesFound"),
    source_monitors_created: optionalNumber(payload, "sourceMonitorsCreated"),
    source_monitors_updated: optionalNumber(payload, "sourceMonitorsUpdated"),
    parser_jobs_queued: optionalNumber(payload, "parserJobsQueued"),
    error_message: optionalText(payload, "errorMessage"),
    next_recommended_run_at: optionalText(payload, "nextRecommendedRunAt"),
    metadata: optionalRecord(payload, "metadata"),
    updated_by: "agent",
  });
}

async function applySourceCandidateCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await upsertRow(supabase, "source_candidates", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    source_discovery_run_id: optionalText(payload, "sourceDiscoveryRunId"),
    agent_run_id: context.agentRunId,
    related_source_monitor_id: optionalText(payload, "relatedSourceMonitorId"),
    title: requiredText(payload, "title", "Source candidate"),
    status: text(payload, "status", "active"),
    labels: stringArray(payload, "labels"),
    source_type: requiredText(payload, "sourceType", "manual_list"),
    url: requiredText(payload, "url", ""),
    discovery_mode: text(payload, "discoveryMode", "manual"),
    fetch_strategy_guess: text(payload, "fetchStrategyGuess", "manual"),
    requires_auth: bool(payload, "requiresAuth", false),
    browser_use_enabled: bool(payload, "browserUseEnabled", false),
    recommendation: text(payload, "recommendation", "propose"),
    rationale: text(payload, "rationale", mutation.rationale),
    scores: record(payload, "scores"),
    target_season: optionalText(payload, "targetSeason"),
    target_roles: stringArray(payload, "targetRoles"),
    evidence_ids: mutation.evidenceIds,
    metadata: record(payload, "metadata"),
    created_by: "agent",
    updated_by: "agent",
  }, "user_id,url");
}

async function applySourceMonitorCreateProposal(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  const row = await insertRow(supabase, "source_monitors", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    title: requiredText(payload, "title", "Proposed source"),
    status: "proposed",
    labels: stringArray(payload, "labels"),
    priority: optionalNumber(payload, "priority"),
    source_type: requiredText(payload, "sourceType", "manual_list"),
    url: requiredText(payload, "url", ""),
    fetch_strategy: requiredText(payload, "fetchStrategy", "manual"),
    schedule: text(payload, "schedule", "manual"),
    local_path: optionalText(payload, "localPath"),
    parser_script_path: optionalText(payload, "parserScriptPath"),
    requires_auth: bool(payload, "requiresAuth", false),
    browser_use_enabled: bool(payload, "browserUseEnabled", false),
    approval_required: bool(payload, "approvalRequired", false),
    related_goal_ids: stringArray(payload, "relatedGoalIds"),
    related_company_ids: stringArray(payload, "relatedCompanyIds"),
    evidence_ids: mutation.evidenceIds,
    source_rationale: text(payload, "rationale", mutation.rationale),
    evaluation: record(payload, "evaluation", record(payload, "scores")),
    metadata: {
      ...record(payload, "metadata"),
      targetSeason: optionalText(payload, "targetSeason"),
      targetRoles: stringArray(payload, "targetRoles"),
      sourceCandidateId: optionalText(payload, "sourceCandidateId"),
    },
    created_by: "agent",
    updated_by: "agent",
    created_by_agent_run_id: context.agentRunId,
    updated_by_agent_run_id: context.agentRunId,
  });

  const sourceCandidateId = optionalText(payload, "sourceCandidateId");
  const sourceMonitorId = value(row, "id");
  if (sourceCandidateId && typeof sourceMonitorId === "string") {
    await updateRow(supabase, "source_candidates", sourceCandidateId, {
      related_source_monitor_id: sourceMonitorId,
      updated_by: "agent",
    });
  }
}

async function applySourceMonitorUpdate(supabase: WorkerSupabase, mutation: ProposedMutation) {
  if (!mutation.targetObjectId) return;
  const payload = mutation.payload;
  await updateRow(supabase, "source_monitors", mutation.targetObjectId, {
    status: optionalText(payload, "status"),
    priority: optionalNumber(payload, "priority"),
    schedule: optionalText(payload, "schedule"),
    local_path: optionalText(payload, "localPath"),
    parser_script_path: optionalText(payload, "parserScriptPath"),
    last_seen_cursor: optionalText(payload, "lastSeenCursor"),
    last_seen_hash: optionalText(payload, "lastSeenHash"),
    source_rationale: optionalText(payload, "rationale"),
    evaluation: optionalRecord(payload, "evaluation"),
    metadata: optionalRecord(payload, "metadata"),
    updated_by: "agent",
  });
}

async function applySignalCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  const canonicalUrl = optionalText(payload, "canonicalUrl");
  const sourceMonitorId = optionalText(payload, "sourceMonitorId");
  const externalRef = optionalText(payload, "externalRef");

  if (canonicalUrl && (await signalExists(supabase, context.userId, { canonicalUrl }))) return;
  if (sourceMonitorId && externalRef && (await signalExists(supabase, context.userId, { sourceMonitorId, externalRef }))) return;

  await insertRow(supabase, "signals", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    source_monitor_id: sourceMonitorId,
    source_run_id: optionalText(payload, "sourceRunId"),
    source_candidate_id: optionalText(payload, "sourceCandidateId"),
    opportunity_id: optionalText(payload, "opportunityId"),
    title: requiredText(payload, "title", "Signal"),
    status: text(payload, "status", "new"),
    labels: stringArray(payload, "labels"),
    signal_type: requiredText(payload, "signalType", "other"),
    source_type: optionalText(payload, "sourceType"),
    source_url: optionalText(payload, "sourceUrl"),
    canonical_url: canonicalUrl,
    external_ref: externalRef,
    company_name: optionalText(payload, "companyName"),
    role_title: optionalText(payload, "roleTitle"),
    location: optionalText(payload, "location"),
    opportunity_type: optionalText(payload, "opportunityType"),
    posted_at: optionalText(payload, "postedAt"),
    deadline_at: optionalText(payload, "deadlineAt"),
    raw_payload: record(payload, "rawPayload"),
    normalized_payload: record(payload, "normalizedPayload"),
    parser_name: optionalText(payload, "parserName"),
    parser_confidence: optionalText(payload, "parserConfidence"),
    rationale: text(payload, "rationale", mutation.rationale),
    evidence_ids: mutation.evidenceIds,
    metadata: record(payload, "metadata"),
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applyOpportunityRecommendationCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await insertRow(supabase, "opportunity_recommendations", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    opportunity_id: optionalText(payload, "opportunityId"),
    title: requiredText(payload, "title", "Opportunity recommendation"),
    status: text(payload, "status", "active"),
    labels: stringArray(payload, "labels"),
    priority: optionalNumber(payload, "priority"),
    source_signal_ids: stringArray(payload, "sourceSignalIds"),
    recommendation: requiredText(payload, "recommendation", "needs_review"),
    score: optionalNumber(payload, "score"),
    confidence: text(payload, "confidence", "medium"),
    aggressiveness_used: text(payload, "aggressivenessUsed", "high"),
    rationale: text(payload, "rationale", mutation.rationale),
    role_brief: record(payload, "roleBrief"),
    score_breakdown: record(payload, "scoreBreakdown"),
    project_bridge_assessment: optionalRecord(payload, "projectBridgeAssessment"),
    suggested_tasks: arrayPayload(payload, "suggestedTasks"),
    planner_hints: record(payload, "plannerHints"),
    evidence_ids: mutation.evidenceIds,
    metadata: record(payload, "metadata"),
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applyOpportunityCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await insertRow(supabase, "opportunities", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    title: requiredText(payload, "title", "Opportunity"),
    status: text(payload, "status", "active"),
    labels: stringArray(payload, "labels"),
    priority: optionalNumber(payload, "priority"),
    due_at: optionalText(payload, "dueAt"),
    opportunity_type: requiredText(payload, "opportunityType", "other"),
    company_id: optionalText(payload, "companyId"),
    role_target_id: optionalText(payload, "roleTargetId"),
    url: optionalText(payload, "url"),
    source_monitor_id: optionalText(payload, "sourceMonitorId"),
    deadline_at: optionalText(payload, "deadlineAt"),
    fit_rationale: text(payload, "fitRationale", mutation.rationale),
    related_goal_ids: stringArray(payload, "relatedGoalIds"),
    evidence_ids: mutation.evidenceIds,
    metadata: record(payload, "metadata"),
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applyTaskCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await insertRow(supabase, "tasks", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    title: requiredText(payload, "title", "Task"),
    status: text(payload, "status", "todo"),
    labels: stringArray(payload, "labels"),
    priority: optionalNumber(payload, "priority"),
    due_at: optionalText(payload, "dueAt"),
    task_type: requiredText(payload, "taskType", "admin"),
    effort: text(payload, "effort", "small"),
    urgency: text(payload, "urgency", "normal"),
    energy: text(payload, "energy", "medium"),
    source: text(payload, "source", "agent"),
    related_goal_ids: stringArray(payload, "relatedGoalIds"),
    related_application_ids: stringArray(payload, "relatedApplicationIds"),
    related_opportunity_ids: stringArray(payload, "relatedOpportunityIds"),
    related_contact_ids: stringArray(payload, "relatedContactIds"),
    related_event_ids: stringArray(payload, "relatedEventIds"),
    evidence_ids: mutation.evidenceIds,
    metadata: record(payload, "metadata"),
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applyApplicationCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await insertRow(supabase, "applications", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    title: requiredText(payload, "title", "Application"),
    status: text(payload, "status", "found"),
    labels: stringArray(payload, "labels"),
    priority: optionalNumber(payload, "priority"),
    due_at: optionalText(payload, "dueAt"),
    opportunity_id: requiredText(payload, "opportunityId", ""),
    company_id: optionalText(payload, "companyId"),
    deadline_at: optionalText(payload, "deadlineAt"),
    resume_variant_id: optionalText(payload, "resumeVariantId"),
    next_action_task_id: optionalText(payload, "nextActionTaskId"),
    status_check_policy: text(payload, "statusCheckPolicy", "manual"),
    next_status_check_at: optionalText(payload, "nextStatusCheckAt"),
    related_goal_ids: stringArray(payload, "relatedGoalIds"),
    related_opportunity_ids: stringArray(payload, "relatedOpportunityIds"),
    related_contact_ids: stringArray(payload, "relatedContactIds"),
    evidence_ids: mutation.evidenceIds,
    metadata: record(payload, "metadata"),
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applyApplicationStatusCheckSchedule(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await insertRow(supabase, "application_status_checks", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    title: text(payload, "title", "Application status check"),
    status: "scheduled",
    labels: stringArray(payload, "labels"),
    application_id: requiredText(payload, "applicationId", ""),
    check_source: requiredText(payload, "checkSource", "manual"),
    scheduled_for: requiredText(payload, "scheduledFor", new Date().toISOString()),
    evidence_ids: mutation.evidenceIds,
    metadata: record(payload, "metadata"),
    created_by: "agent",
    updated_by: "agent",
  });
}

async function applyAgentJobCreate(supabase: WorkerSupabase, context: RunContext, mutation: ProposedMutation) {
  const payload = mutation.payload;
  await insertRow(supabase, "agent_jobs", {
    id: optionalText(payload, "id"),
    user_id: context.userId,
    agent_id: requiredText(payload, "agentId", "career-advisor"),
    title: requiredText(payload, "title", "Agent job"),
    status: "queued",
    labels: stringArray(payload, "labels"),
    queue: text(payload, "queue", "default"),
    prompt: optionalText(payload, "prompt"),
    input: record(payload, "input"),
    priority: number(payload, "priority", 0),
    scheduled_for: text(payload, "scheduledFor", new Date().toISOString()),
    metadata: {
      ...record(payload, "metadata"),
      createdByAgentRunId: context.agentRunId,
    },
    created_by: "agent",
    updated_by: "agent",
  });
}

async function signalExists(
  supabase: WorkerSupabase,
  userId: string,
  lookup: { canonicalUrl?: string; sourceMonitorId?: string; externalRef?: string },
) {
  let query = supabase.from("signals").select("id").eq("user_id", userId).limit(1);
  if (lookup.canonicalUrl) query = query.eq("canonical_url", lookup.canonicalUrl);
  if (lookup.sourceMonitorId) query = query.eq("source_monitor_id", lookup.sourceMonitorId);
  if (lookup.externalRef) query = query.eq("external_ref", lookup.externalRef);

  const { data, error } = await query;
  if (error) throw new Error(`signals lookup: ${error.message}`);
  return Boolean(data?.length);
}

async function insertRow(supabase: WorkerSupabase, table: string, row: Payload) {
  const clean = compact(row);
  const { data, error } = await supabase.from(table).insert(clean).select("*").limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data?.[0] as Payload | undefined;
}

async function upsertRow(supabase: WorkerSupabase, table: string, row: Payload, onConflict: string) {
  const clean = compact(row);
  const { data, error } = await supabase.from(table).upsert(clean, { onConflict }).select("*").limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data?.[0] as Payload | undefined;
}

async function updateRow(supabase: WorkerSupabase, table: string, id: string, patch: Payload) {
  const clean = compact(patch);
  if (Object.keys(clean).length === 0) return;
  const { error } = await supabase.from(table).update(clean).eq("id", id);
  if (error) throw new Error(`${table}: ${error.message}`);
}

function compact(input: Payload) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function value(payload: Payload | undefined, key: string) {
  return payload?.[key];
}

function text(payload: Payload, key: string, fallback: string) {
  const raw = payload[key] ?? payload[toSnake(key)];
  return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}

function requiredText(payload: Payload, key: string, fallback: string) {
  return text(payload, key, fallback);
}

function optionalText(payload: Payload, key: string) {
  const raw = payload[key] ?? payload[toSnake(key)];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

function number(payload: Payload, key: string, fallback: number) {
  const raw = payload[key] ?? payload[toSnake(key)];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

function optionalNumber(payload: Payload, key: string) {
  const raw = payload[key] ?? payload[toSnake(key)];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

function bool(payload: Payload, key: string, fallback: boolean) {
  const raw = payload[key] ?? payload[toSnake(key)];
  return typeof raw === "boolean" ? raw : fallback;
}

function stringArray(payload: Payload, key: string) {
  const raw = payload[key] ?? payload[toSnake(key)];
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function record(payload: Payload, key: string, fallback: Payload = {}) {
  const raw = payload[key] ?? payload[toSnake(key)];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Payload;
  return fallback;
}

function optionalRecord(payload: Payload, key: string) {
  const raw = payload[key] ?? payload[toSnake(key)];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Payload;
  return undefined;
}

function arrayPayload(payload: Payload, key: string) {
  const raw = payload[key] ?? payload[toSnake(key)];
  return Array.isArray(raw) ? raw : [];
}

function toSnake(key: string) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
