import type { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { toJson } from "@/lib/json";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

type PreparationJob = {
  agentId: string;
  title: string;
  inputType: string;
  input: Record<string, unknown>;
  capabilities: string[];
  priority: number;
  queue: string;
};

async function enqueueIfMissing(
  admin: AdminClient,
  userId: string,
  applicationId: string,
  opportunityId: string,
  job: PreparationJob,
) {
  const { data: existing } = await admin
    .from("agent_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("agent_id", job.agentId)
    .eq("input_type", job.inputType)
    .in("status", ["queued", "running", "needs_user_input"])
    .contains("related_object_ids", [applicationId])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;
  const jobId = crypto.randomUUID();
  const { error } = await admin.from("agent_jobs").insert({
    id: jobId,
    user_id: userId,
    agent_id: job.agentId,
    title: job.title,
    status: "queued",
    queue: job.queue,
    input_type: job.inputType,
    input: toJson({
      schemaVersion: 1,
      type: job.inputType,
      applicationId,
      opportunityId,
      ...job.input,
    }),
    prompt: `Prepare the ${job.inputType} output for this exact opportunity and application. Use current Career OS state and canonical records. Never send a message or submit an application.`,
    related_object_ids: [applicationId, opportunityId],
    required_capabilities: job.capabilities,
    priority: job.priority,
    scheduled_for: new Date().toISOString(),
    dedupe_key: `application-preparation:${applicationId}:${job.agentId}:${job.inputType}:${jobId}`,
    metadata: toJson({ applicationId, opportunityId, preparationPipeline: true }),
    created_by: "system",
    updated_by: "system",
  });
  if (error) throw new Error(`Unable to queue ${job.title}: ${error.message}`);
  return jobId;
}

export async function enqueueApplicationPreparation(
  admin: AdminClient,
  userId: string,
  applicationId: string,
  opportunityId: string,
) {
  const [{ data: opportunity }, { data: recommendation }] = await Promise.all([
    admin.from("opportunities").select("id,title,opportunity_type,company_id,location,url,canonical_url,description,deadline_at,metadata,companies(title)").eq("id", opportunityId).eq("user_id", userId).maybeSingle(),
    admin.from("opportunity_recommendations").select("id,score,recommendation,rationale,role_brief,project_bridge_assessment,planner_hints,score_breakdown").eq("opportunity_id", opportunityId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!opportunity) throw new Error("Opportunity not found.");
  const context = {
    opportunity,
    recommendation,
    roleBrief: recommendation?.role_brief ?? {},
    projectBridgeAssessment: recommendation?.project_bridge_assessment ?? {},
  };
  const jobs: PreparationJob[] = [
    {
      agentId: "career-application-manager",
      title: `Prepare application packet: ${opportunity.title}`,
      inputType: "application.prepare",
      input: { ...context, mode: "full_packet" },
      capabilities: [],
      priority: 98,
      queue: "applications",
    },
    {
      agentId: "career-resume-tailor",
      title: `Compose opportunity resume: ${opportunity.title}`,
      inputType: "resume.create_variant",
      input: { ...context, compositionMode: "verified_components_only", noBaseResume: true },
      capabilities: ["read_files", "write_workspace", "latex_compile"],
      priority: 95,
      queue: "resume",
    },
    {
      agentId: "career-project-spec",
      title: `Design role bridge project: ${opportunity.title}`,
      inputType: "project_spec.create",
      input: context,
      capabilities: [],
      priority: 82,
      queue: "projects",
    },
    {
      agentId: "career-relationship-manager",
      title: `Find warm paths: ${opportunity.title}`,
      inputType: "relationship.review",
      input: { ...context, draftCopyOnly: true },
      capabilities: [],
      priority: 84,
      queue: "relationships",
    },
  ];
  const jobIds = [];
  for (const job of jobs)
    jobIds.push(await enqueueIfMissing(admin, userId, applicationId, opportunityId, job));
  await admin.from("applications").update({
    status: "drafting",
    next_action: "Career OS is preparing the packet, verified-component resume, project bridge, and warm-path strategy.",
    updated_by: "system",
  }).eq("id", applicationId).eq("user_id", userId);
  return jobIds;
}

export async function enqueueApplicationPacketRefresh(
  admin: AdminClient,
  userId: string,
  applicationId: string,
  opportunityId: string,
  completedAgentId: string,
  completedRunId: string,
) {
  const refreshInput = toJson({ schemaVersion: 1, type: "application.prepare", applicationId, opportunityId, mode: "refresh_packet", completedAgentId, completedRunId });
  const { data: queuedRefresh } = await admin.from("agent_jobs").select("id").eq("user_id", userId).eq("agent_id", "career-application-manager").eq("input_type", "application.prepare").eq("title", "Refresh application packet readiness").eq("status", "queued").contains("related_object_ids", [applicationId]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (queuedRefresh) {
    await admin.from("agent_jobs").update({ input: refreshInput, scheduled_for: new Date(Date.now() + 5_000).toISOString(), metadata: toJson({ applicationId, opportunityId, preparationPipeline: true, refreshAfter: completedAgentId }), updated_by: "system" }).eq("id", queuedRefresh.id).eq("user_id", userId);
    return;
  }
  const dedupeKey = `application-packet-refresh:${applicationId}:${completedRunId}`;
  const { error } = await admin.from("agent_jobs").insert({
    user_id: userId,
    agent_id: "career-application-manager",
    title: "Refresh application packet readiness",
    status: "queued",
    queue: "applications",
    input_type: "application.prepare",
    input: refreshInput,
    prompt: "Refresh the application packet from the latest canonical resume variant, project specification, relationship paths, events, requirements, and drafts. Preserve anything still correct and set one explicit next action.",
    related_object_ids: [applicationId, opportunityId],
    required_capabilities: [],
    priority: 92,
    scheduled_for: new Date(Date.now() + 5_000).toISOString(),
    dedupe_key: dedupeKey,
    metadata: toJson({ applicationId, opportunityId, preparationPipeline: true, refreshAfter: completedAgentId }),
    created_by: "system",
    updated_by: "system",
  });
  if (error && error.code !== "23505") throw new Error(error.message);
}
