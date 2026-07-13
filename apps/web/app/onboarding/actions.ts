"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Cron } from "croner";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { updateOnboardingWorkItem, upsertOnboardingWorkItem } from "@/lib/onboarding-work-items";

export async function startOnboarding() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("onboarding_sessions")
    .upsert(
      {
        user_id: user.id,
        status: "in_progress",
        current_step: 1,
        started_at: new Date().toISOString(),
        created_by: "user",
        updated_by: "user",
      },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/onboarding");
}

export async function retryOnboardingWorkItem(workItemId: string) {
  const { user } = await requireUser();
  const admin = getSupabaseAdminClient();
  const { data: item } = await admin
    .from("onboarding_work_items")
    .select("id,onboarding_session_id,work_type,related_object_id,metadata,status,title")
    .eq("id", workItemId)
    .eq("user_id", user.id)
    .in("status", ["waiting_for_user", "failed", "unsupported"])
    .maybeSingle();
  if (!item || !item.related_object_id) throw new Error("This setup item is no longer retryable.");
  const metadata = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata as Record<string, unknown> : {};
  if (item.work_type === "source") {
    const { data: monitor } = await admin.from("source_monitors").select("id,title,url").eq("id", item.related_object_id).eq("user_id", user.id).maybeSingle();
    if (!monitor) throw new Error("Source monitor not found.");
    const { data: adapter } = await admin.from("source_adapters").select("id").eq("source_monitor_id", monitor.id).eq("user_id", user.id).is("archived_at", null).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (adapter) {
      await admin.from("source_monitors").update({ status: "active", next_run_at: new Date().toISOString(), last_error: null, updated_by: "user" }).eq("id", monitor.id).eq("user_id", user.id);
      await updateOnboardingWorkItem(admin, item.id, user.id, { status: "queued", phase: "first_read_queued", progress: 65 });
    } else {
      const { data: job, error } = await admin.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-source-discovery", title: `Retry inspection: ${monitor.title}`, status: "queued", queue: "browser", input_type: "source.inspect", input: { schemaVersion: 1, type: "source.inspect", sourceMonitorId: monitor.id, url: monitor.url, configuredRead: true, onboardingSessionId: item.onboarding_session_id, onboardingWorkItemId: item.id }, prompt: `Retry the configured read-only source inspection for ${monitor.url}. Use the existing browser session automatically.`, priority: 95, scheduled_for: new Date().toISOString(), dedupe_key: `onboarding:${item.id}:inspect-retry:${Date.now()}`, required_capabilities: ["browser_read"], related_object_ids: [monitor.id], metadata: { sourceMonitorId: monitor.id, onboardingWorkItemId: item.id }, created_by: "user", updated_by: "user" }).select("id").single();
      if (error || !job) throw new Error("Unable to retry source inspection.");
      await updateOnboardingWorkItem(admin, item.id, user.id, { status: "queued", phase: "inspecting_source", progress: 10, latestJobId: job.id });
    }
  } else if (item.work_type === "resume") {
    const artifactId = typeof metadata.artifactId === "string" ? metadata.artifactId : null;
    if (!artifactId) throw new Error("Resume source artifact not found.");
    const { data: artifact } = await admin.from("artifacts").select("storage_path,artifact_type").eq("id", artifactId).eq("user_id", user.id).maybeSingle();
    if (!artifact) throw new Error("Resume source artifact not found.");
    const sourceFormat = String(metadata.sourceFormat ?? artifact.artifact_type.replace("resume_source_", ""));
    const { data: job, error } = await admin.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-resume-tailor", title: `Retry ${item.title}`, status: "queued", queue: "resume", input_type: "resume.import", input: { schemaVersion: 1, type: "resume.import", resumeVersionId: item.related_object_id, artifactId, sourceFormat, storagePath: artifact.storage_path, onboardingSessionId: item.onboarding_session_id, onboardingWorkItemId: item.id }, related_object_ids: [item.related_object_id, artifactId], required_capabilities: ["read_files", "write_workspace"], priority: 80, scheduled_for: new Date().toISOString(), dedupe_key: `resume-import-retry:${artifactId}:${Date.now()}`, metadata: { onboardingWorkItemId: item.id }, created_by: "user", updated_by: "user" }).select("id").single();
    if (error || !job) throw new Error("Unable to retry resume extraction.");
    await updateOnboardingWorkItem(admin, item.id, user.id, { status: "queued", phase: "extracting_components", progress: 10, latestJobId: job.id });
  }
  revalidatePath("/onboarding");
}

export async function advanceOnboarding(
  sessionId: string,
  step: number,
  formData: FormData,
) {
  const { supabase, user } = await requireUser();
  const admin = getSupabaseAdminClient();
  const { data: session } = await supabase
    .from("onboarding_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session || session.current_step !== step)
    throw new Error("Onboarding changed elsewhere. Refresh to continue.");
  const stepAnswers = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value).trim()]),
  );
  const answers = {
    ...(session.answers as Record<string, unknown>),
    ...stepAnswers,
  };
  const completedSteps = Array.from(
    new Set([...(session.completed_steps ?? []), step]),
  ).sort((a, b) => a - b);
  const final = step === 18;
  if (final && stepAnswers.finalReview?.toUpperCase() !== "ACCEPT")
    throw new Error("Type ACCEPT after reviewing Career OS's current understanding.");
  if (step === 1 && stepAnswers.timezone)
    await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          title: "Profile",
          timezone: stepAnswers.timezone,
          status: "active",
          created_by: "user",
          updated_by: "user",
        },
        { onConflict: "user_id" },
      );
  if (step === 3) {
    await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          title: "Profile",
          full_name: stepAnswers.fullName || null,
          status: "active",
          metadata: { currentEmployment: stepAnswers.currentEmployment },
          created_by: "user",
          updated_by: "user",
        },
        { onConflict: "user_id" },
      );
    await supabase
      .from("academic_contexts")
      .insert({
        user_id: user.id,
        title: "Academic context",
        institution: stepAnswers.institution || null,
        degree_program: stepAnswers.degreeProgram || null,
        expected_graduation_date: stepAnswers.graduationDate || null,
        status: "active",
        created_by: "user",
        updated_by: "user",
      });
  }
  if (step === 4 && stepAnswers.seasonType)
    await supabase
      .from("career_seasons")
      .insert({
        user_id: user.id,
        title: "Current career season",
        season_type: stepAnswers.seasonType,
        summary: stepAnswers.seasonSummary ?? "",
        status: "active",
        created_by: "user",
        updated_by: "user",
      });
  if (step === 5 && stepAnswers.primaryGoal)
    await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title: stepAnswers.primaryGoal,
        status: "active",
        horizon: "1_year",
        track: "general",
        rationale: stepAnswers.goalRationale ?? "",
        created_by: "user",
        updated_by: "user",
      });
  if (step === 14 && stepAnswers.knownSources)
    await configureKnownSources(admin, user.id, session.id, stepAnswers.knownSources);
  if (step === 15 && stepAnswers.notificationEmail) {
    const notificationEmail = z.email().parse(stepAnswers.notificationEmail);
    const { data: profile } = await supabase.from("profiles").select("metadata").eq("user_id", user.id).maybeSingle();
    const metadata = profile?.metadata && typeof profile.metadata === "object" && !Array.isArray(profile.metadata) ? profile.metadata as Record<string, unknown> : {};
    await supabase.from("profiles").upsert({ user_id: user.id, title: "Profile", status: "active", metadata: { ...metadata, notificationEmail }, updated_by: "user" }, { onConflict: "user_id" });
    await supabase.from("notification_preferences").upsert(["high_value_opportunity", "approval", "connector_failure", "source_failure", "worker_failure"].map((category) => ({ user_id: user.id, category, channel: "email", enabled: true, minimum_severity: "important", status: "active", created_by: "user" as const, updated_by: "user" as const })), { onConflict: "user_id,category,channel" });
  }
  if (step === 15) await createDefaultSchedules(supabase, user.id);
  const { data: updatedSession, error } = await supabase
    .from("onboarding_sessions")
    .update({
      answers,
      completed_steps: completedSteps,
      current_step: final ? 18 : Math.min(18, step + 1),
      status: "in_progress",
      completed_at: null,
      updated_by: "user",
    })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .eq("version", session.version)
    .select("id,version")
    .maybeSingle();
  if (error || !updatedSession) throw new Error(error?.message ?? "Onboarding changed elsewhere. Refresh to continue.");
  if (final) {
    const { error: completionError } = await supabase.rpc("complete_onboarding", {
      p_session_id: session.id,
      p_expected_version: updatedSession.version,
    });
    if (completionError) {
      if (completionError.message.includes("onboarding_not_ready"))
        throw new Error("Onboarding is still finishing required source, resume, or worker setup. Review the readiness cards and complete the highlighted action.");
      throw new Error(completionError.message);
    }
  }
  const inputType = final ? "onboarding.review" : "onboarding.answer";
  await supabase
    .from("agent_jobs")
    .insert({
      user_id: user.id,
      agent_id: "career-onboarding",
      title: `Onboarding step ${step}`,
      status: "queued",
      queue: "onboarding",
      input_type: inputType,
      input: {
        schemaVersion: 1,
        type: inputType,
        step,
        answers: stepAnswers,
        sessionId,
      },
      priority: 70,
      scheduled_for: new Date().toISOString(),
      dedupe_key: `onboarding:${session.id}:step:${step}:v${session.version}`,
      created_by: "system",
      updated_by: "system",
    });
  if (step === 16) await supabase.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-source-discovery", title: "Initial onboarding source discovery", queue: "sources", input_type: "source.discover", input: { schemaVersion: 1, type: "source.discover", mode: "onboarding", onboardingSessionId: session.id, answers }, priority: 85, scheduled_for: new Date().toISOString(), dedupe_key: `onboarding:${session.id}:initial-source-discovery`, required_capabilities: ["browser_read"], created_by: "system", updated_by: "system" });
  if (step === 17) await Promise.all([
    supabase.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-positioning", title: "Generate initial career strategy", queue: "planning", input_type: "positioning.review", input: { schemaVersion: 1, type: "positioning.review", onboardingSessionId: session.id }, priority: 90, scheduled_for: new Date().toISOString(), dedupe_key: `onboarding:${session.id}:initial-positioning`, created_by: "system", updated_by: "system" }),
    supabase.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-daily-weekly-planner", title: "Generate initial weekly plan", queue: "planning", input_type: "planner.weekly_review", input: { schemaVersion: 1, type: "planner.weekly_review", onboardingSessionId: session.id, initial: true }, priority: 88, scheduled_for: new Date().toISOString(), dedupe_key: `onboarding:${session.id}:initial-weekly-plan`, created_by: "system", updated_by: "system" }),
  ]);
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
}

async function configureKnownSources(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  sessionId: string,
  rawSources: string,
) {
  const sources = rawSources.split(/[\n,]/).map((value) => value.trim()).filter(Boolean);
  for (const source of sources) {
    let url: URL;
    try { url = new URL(source.startsWith("http") ? source : `https://${source}`); } catch { continue; }
    if (url.protocol !== "https:") continue;
    url.hash = "";
    const normalizedUrl = url.toString();
    const instagram = /(^|\.)instagram\.com$/i.test(url.hostname);
    const github = /(^|\.)github\.com$/i.test(url.hostname);
    const handle = instagram ? url.pathname.split("/").filter(Boolean)[0] : null;
    const values = {
      title: instagram && handle ? `${handle} Instagram stories` : `${url.hostname} career source`,
      status: "proposed" as const,
      source_type: instagram ? "social_account" as const : github ? "github_repo" as const : "community_page" as const,
      url: normalizedUrl,
      fetch_strategy: instagram ? "browser" as const : github ? "git_pull" as const : "http" as const,
      schedule: instagram ? "every_2_hours" : "every_6_hours",
      next_run_at: new Date().toISOString(),
      requires_auth: instagram,
      browser_use_enabled: instagram,
      approval_required: false,
      priority: instagram ? 90 : 70,
      source_rationale: "Explicitly configured by the user during onboarding for read-only career opportunity monitoring.",
      metadata: { sourceOrigin: "onboarding", cadenceMinutes: instagram ? 120 : 360, contentScope: instagram ? "stories" : "career_opportunities", handle },
      updated_by: "user" as const,
    };
    const { data: existing } = await admin.from("source_monitors").select("id,status").eq("user_id", userId).eq("url", normalizedUrl).maybeSingle();
    let monitorId = existing?.id;
    if (existing) {
      const { error } = await admin.from("source_monitors").update({ ...values, status: existing.status === "active" ? "active" : "proposed" }).eq("id", existing.id).eq("user_id", userId);
      if (error) throw new Error(`Unable to configure ${normalizedUrl}: ${error.message}`);
    } else {
      const { data, error } = await admin.from("source_monitors").insert({ ...values, user_id: userId, created_by: "user" }).select("id").single();
      if (error || !data) throw new Error(`Unable to configure ${normalizedUrl}: ${error?.message ?? "unknown error"}`);
      monitorId = data.id;
    }
    if (!monitorId) continue;
    const stableHash = createHash("sha256").update(normalizedUrl).digest("hex").slice(0, 24);
    const workItem = await upsertOnboardingWorkItem(admin, {
      userId,
      sessionId,
      stableKey: `source:${stableHash}`,
      workType: "source",
      title: `Connect ${instagram && handle ? `@${handle}` : url.hostname}`,
      status: "queued",
      phase: "inspecting_source",
      progress: 10,
      relatedObjectType: "source_monitor",
      relatedObjectId: monitorId,
      metadata: { sourceUrl: normalizedUrl, provider: instagram ? "instagram" : github ? "github" : url.hostname },
    });
    const dedupeKey = `onboarding:${sessionId}:source:${monitorId}:inspect`;
    let { data: job } = await admin.from("agent_jobs").select("id").eq("user_id", userId).eq("dedupe_key", dedupeKey).maybeSingle();
    if (!job) {
      const inserted = await admin.from("agent_jobs").insert({
        user_id: userId,
        agent_id: "career-source-discovery",
        title: `Inspect ${values.title}`,
        status: "queued",
        queue: instagram ? "browser" : "sources",
        input_type: "source.inspect",
        input: { schemaVersion: 1, type: "source.inspect", sourceMonitorId: monitorId, onboardingSessionId: sessionId, onboardingWorkItemId: workItem.id, url: normalizedUrl, configuredRead: true },
        prompt: `Inspect the configured source ${normalizedUrl}. Determine the safest durable read strategy. Try the existing read-only browser session when needed. Do not perform any external write action.`,
        priority: instagram ? 95 : 80,
        scheduled_for: new Date().toISOString(),
        dedupe_key: dedupeKey,
        required_capabilities: ["browser_read"],
        related_object_ids: [monitorId],
        metadata: { sourceMonitorId: monitorId, onboardingSessionId: sessionId, onboardingWorkItemId: workItem.id },
        created_by: "system",
        updated_by: "system",
      }).select("id").single();
      if (inserted.error || !inserted.data) throw new Error(`Unable to start source inspection: ${inserted.error?.message ?? "unknown error"}`);
      job = inserted.data;
    }
    await admin.from("onboarding_work_items").update({ latest_job_id: job.id, updated_by: "system" }).eq("id", workItem.id).eq("user_id", userId);
  }
}

async function createDefaultSchedules(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
) {
  const { data: profile } = await supabase.from("profiles").select("timezone").eq("user_id", userId).maybeSingle();
  const timezone = profile?.timezone ?? "America/Denver";
  const schedules = [
    {
      title: "Morning brief",
      schedule_type: "morning_brief",
      cron_expression: "0 6 * * *",
      dedupe_prefix: "morning",
      job_template: {
        agentId: "career-daily-weekly-planner",
        inputType: "planner.morning",
        title: "Generate morning brief",
        queue: "planning",
        priority: 100,
        input: { schemaVersion: 1, type: "planner.morning" },
      },
    },
    {
      title: "Daily check-in",
      schedule_type: "daily_check_in",
      cron_expression: "0 19 * * *",
      dedupe_prefix: "daily-check-in",
      job_template: {
        agentId: "career-daily-weekly-planner",
        inputType: "planner.daily_check_in",
        title: "Create daily check-in",
        queue: "planning",
        priority: 80,
        input: { schemaVersion: 1, type: "planner.daily_check_in" },
      },
    },
    {
      title: "Weekly review",
      schedule_type: "weekly_review",
      cron_expression: "0 18 * * 0",
      dedupe_prefix: "weekly-review",
      job_template: {
        agentId: "career-daily-weekly-planner",
        inputType: "planner.weekly_review",
        title: "Create weekly review",
        queue: "planning",
        priority: 90,
        input: { schemaVersion: 1, type: "planner.weekly_review" },
      },
    },
  ];
  for (const schedule of schedules)
    await supabase
      .from("schedules")
      .upsert(
        {
          user_id: userId,
          ...schedule,
          timezone,
          next_run_at: new Cron(schedule.cron_expression, { timezone }).nextRun()?.toISOString() ?? null,
          status: "active",
          created_by: "system",
          updated_by: "system",
        },
        { onConflict: "user_id,dedupe_prefix" },
      );
}
