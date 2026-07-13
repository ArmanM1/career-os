import { browserSourceSkillDefinitionSchema, type AgentOutput } from "@career-os/core";
import type { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  onboardingWorkItemIdFromJob,
  sourceMonitorIdFromJob,
  updateOnboardingWorkItem,
} from "@/lib/onboarding-work-items";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

type AgentJob = {
  id: string;
  user_id: string;
  agent_id: string;
  title: string;
  input: unknown;
  metadata: unknown;
  attempt_count: number;
};

function nextUserAction(output: AgentOutput) {
  const provided = output.disposition.nextUserAction;
  if (output.disposition.status === "auth_required") return {
    type: provided?.type ?? "authenticate_source",
    label: provided?.label ?? "Open the Career OS Browser",
    provider: provided?.provider,
    href: "/settings/worker",
    instructions: `${provided?.instructions ?? output.disposition.reason ?? "This source requires a login step."} Use the Career OS Browser desktop shortcut so the dedicated read-only profile receives the session, then return here and choose Retry now.`,
  };
  return provided ?? {
    type: "open_onboarding",
    label: "Continue setup",
    href: "/onboarding",
    instructions: output.disposition.reason ?? "Career OS needs one setup step before it can continue.",
  };
}

async function enqueueAdapterBuild(
  admin: AdminClient,
  job: AgentJob,
  workItemId: string,
  sourceMonitorId: string,
  runId: string,
) {
  const { data: monitor } = await admin
    .from("source_monitors")
    .select("id,title,url,source_type,requires_auth,metadata")
    .eq("id", sourceMonitorId)
    .eq("user_id", job.user_id)
    .maybeSingle();
  if (!monitor) throw new Error("The inspected source monitor no longer exists.");
  const dedupeKey = `onboarding:${workItemId}:adapter-build`;
  let { data: adapterJob } = await admin
    .from("agent_jobs")
    .select("id")
    .eq("user_id", job.user_id)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();
  if (!adapterJob) {
    const inserted = await admin
      .from("agent_jobs")
      .insert({
        user_id: job.user_id,
        agent_id: "career-source-adapter-builder",
        title: `Build adapter for ${monitor.title}`,
        status: "queued",
        queue: "sources",
        input_type: "adapter.build",
        input: {
          schemaVersion: 1,
          type: "adapter.build",
          sourceMonitorId,
          sourceUrl: monitor.url,
          sourceType: monitor.source_type,
          requiresAuth: monitor.requires_auth,
          sourceMetadata: monitor.metadata,
          inspectionRunId: runId,
          onboardingWorkItemId: workItemId,
        },
        prompt: `Build and test the safest durable adapter for ${monitor.url}. Prefer a deterministic adapter. If deterministic extraction is not possible, return a browser_skill definition that satisfies the Career OS browser source schema. Never generate executable scraper code.`,
        related_object_ids: [sourceMonitorId],
        required_capabilities: ["read_files", "write_workspace", "run_adapter"],
        priority: 90,
        scheduled_for: new Date().toISOString(),
        dedupe_key: dedupeKey,
        metadata: { sourceMonitorId, onboardingWorkItemId: workItemId },
        created_by: "system",
        updated_by: "system",
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data)
      throw new Error(inserted.error?.message ?? "Unable to queue source adapter creation.");
    adapterJob = inserted.data;
  }
  await updateOnboardingWorkItem(admin, workItemId, job.user_id, {
    status: "queued",
    phase: "building_adapter",
    progress: 35,
    latestJobId: adapterJob.id,
    latestRunId: runId,
  });
}

async function activateAdapterForFirstRead(
  admin: AdminClient,
  job: AgentJob,
  workItemId: string,
  sourceMonitorId: string,
  runId: string,
) {
  const { data: adapter } = await admin
    .from("source_adapters")
    .select("id,adapter_type,definition,status")
    .eq("user_id", job.user_id)
    .eq("source_monitor_id", sourceMonitorId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!adapter)
    throw new Error("The adapter builder finished without producing a validated adapter.");
  if (adapter.adapter_type === "browser_skill") {
    const parsed = browserSourceSkillDefinitionSchema.safeParse(adapter.definition);
    if (!parsed.success) {
      await admin.from("source_adapters").update({ status: "broken", test_result: { valid: false, issues: parsed.error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })) }, updated_by: "system" }).eq("id", adapter.id);
      throw new Error("The generated browser source skill failed validation.");
    }
  }
  const now = new Date().toISOString();
  const { error } = await admin
    .from("source_monitors")
    .update({
      status: "active",
      next_run_at: now,
      last_error: null,
      updated_by: "system",
    })
    .eq("id", sourceMonitorId)
    .eq("user_id", job.user_id);
  if (error) throw new Error(error.message);
  await updateOnboardingWorkItem(admin, workItemId, job.user_id, {
    status: "queued",
    phase: "first_read_queued",
    progress: 65,
    latestRunId: runId,
  });
}

export async function advanceOnboardingAfterCompletedJob(
  admin: AdminClient,
  job: AgentJob,
  runId: string,
  output: AgentOutput,
  mutationErrors: string[],
) {
  const workItemId = onboardingWorkItemIdFromJob(job);
  if (!workItemId) return;
  const sourceMonitorId = sourceMonitorIdFromJob(job);
  if (mutationErrors.length) {
    await updateOnboardingWorkItem(admin, workItemId, job.user_id, {
      status: "failed",
      phase: "mutation_failed",
      progress: 50,
      latestRunId: runId,
      blockingReason: mutationErrors[0],
    });
    return;
  }
  if (["auth_required", "needs_user_input"].includes(output.disposition.status)) {
    await updateOnboardingWorkItem(admin, workItemId, job.user_id, {
      status: "waiting_for_user",
      phase: output.disposition.status,
      progress: Math.max(job.agent_id === "career-resume-tailor" ? 60 : 45, 1),
      latestRunId: runId,
      blockingReason: output.disposition.reason ?? "A user setup step is required.",
      nextUserAction: nextUserAction(output),
    });
    if (sourceMonitorId)
      await admin.from("source_monitors").update({ status: "auth_required", last_error: output.disposition.reason, updated_by: "system" }).eq("id", sourceMonitorId).eq("user_id", job.user_id);
    return;
  }
  if (job.agent_id === "career-source-discovery" && sourceMonitorId) {
    await enqueueAdapterBuild(admin, job, workItemId, sourceMonitorId, runId);
    return;
  }
  if (job.agent_id === "career-source-adapter-builder" && sourceMonitorId) {
    try {
      await activateAdapterForFirstRead(admin, job, workItemId, sourceMonitorId, runId);
    } catch (error) {
      await updateOnboardingWorkItem(admin, workItemId, job.user_id, {
        status: "failed",
        phase: "adapter_validation_failed",
        progress: 50,
        latestRunId: runId,
        blockingReason: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  if (job.agent_id === "career-source-browser-reader" && sourceMonitorId) {
    await updateOnboardingWorkItem(admin, workItemId, job.user_id, {
      status: "ready",
      phase: "first_read_complete",
      progress: 100,
      latestRunId: runId,
      readinessConfirmedAt: new Date().toISOString(),
    });
    await admin.from("source_adapters").update({ status: "active", updated_by: "system" }).eq("source_monitor_id", sourceMonitorId).eq("user_id", job.user_id);
    return;
  }
  if (job.agent_id === "career-resume-tailor") {
    await updateOnboardingWorkItem(admin, workItemId, job.user_id, {
      status: "review_required",
      phase: "review_components",
      progress: 75,
      latestRunId: runId,
      blockingReason: "Review every extracted experience, achievement, project, and skill before continuing.",
      nextUserAction: {
        type: "open_resume_library",
        label: "Review resume components",
        href: "/resumes",
      },
    });
  }
}

export async function markOnboardingJobClaimed(
  admin: AdminClient,
  job: JobLikeWithId,
  userId: string,
) {
  const workItemId = onboardingWorkItemIdFromJob(job);
  if (!workItemId) return;
  await updateOnboardingWorkItem(admin, workItemId, userId, {
    status: "running",
    phase: job.agent_id === "career-source-adapter-builder"
      ? "building_adapter"
      : job.agent_id === "career-source-browser-reader"
        ? "reading_source"
        : job.agent_id === "career-resume-tailor"
          ? "extracting_components"
          : "inspecting_source",
    progress: job.agent_id === "career-source-browser-reader" ? 80 : job.agent_id === "career-source-adapter-builder" ? 45 : 25,
    latestJobId: job.id,
  });
}

type JobLikeWithId = {
  id: string;
  agent_id: string;
  input?: unknown;
  metadata?: unknown;
};
