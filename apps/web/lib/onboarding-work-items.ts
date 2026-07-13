import type { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@career-os/db";
import { toJson } from "@/lib/json";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

export type OnboardingWorkStatus =
  | "pending"
  | "queued"
  | "running"
  | "waiting_for_user"
  | "review_required"
  | "ready"
  | "deferred"
  | "failed"
  | "unsupported"
  | "archived";

export type NextUserAction = {
  type: string;
  label: string;
  provider?: string;
  href?: string;
  instructions?: string;
};

type JobLike = {
  input?: unknown;
  metadata?: unknown;
};

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function onboardingWorkItemIdFromJob(job: JobLike) {
  const input = objectValue(job.input);
  const metadata = objectValue(job.metadata);
  const value = input.onboardingWorkItemId ?? metadata.onboardingWorkItemId;
  return typeof value === "string" ? value : null;
}

export function sourceMonitorIdFromJob(job: JobLike) {
  const input = objectValue(job.input);
  const metadata = objectValue(job.metadata);
  const value = input.sourceMonitorId ?? metadata.sourceMonitorId;
  return typeof value === "string" ? value : null;
}

export async function activeOnboardingSession(
  admin: AdminClient,
  userId: string,
) {
  const { data } = await admin
    .from("onboarding_sessions")
    .select("id,status,version")
    .eq("user_id", userId)
    .in("status", ["not_started", "in_progress", "blocked"])
    .maybeSingle();
  return data;
}

export async function upsertOnboardingWorkItem(
  admin: AdminClient,
  values: {
    userId: string;
    sessionId: string;
    stableKey: string;
    workType: string;
    title: string;
    status: OnboardingWorkStatus;
    phase: string;
    progress: number;
    relatedObjectType?: string;
    relatedObjectId?: string;
    latestJobId?: string;
    blockingReason?: string | null;
    nextUserAction?: NextUserAction | Record<string, never>;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await admin
    .from("onboarding_work_items")
    .upsert(
      {
        user_id: values.userId,
        onboarding_session_id: values.sessionId,
        stable_key: values.stableKey,
        work_type: values.workType,
        title: values.title,
        status: values.status,
        phase: values.phase,
        progress: values.progress,
        related_object_type: values.relatedObjectType ?? null,
        related_object_id: values.relatedObjectId ?? null,
        latest_job_id: values.latestJobId ?? null,
        blocking_reason: values.blockingReason ?? null,
        next_user_action: toJson(values.nextUserAction ?? {}),
        metadata: toJson(values.metadata ?? {}),
        updated_by: "system",
      },
      { onConflict: "onboarding_session_id,stable_key" },
    )
    .select("id,status,version")
    .single();
  if (error) throw new Error(`Unable to update onboarding readiness: ${error.message}`);
  return data;
}

export async function updateOnboardingWorkItem(
  admin: AdminClient,
  workItemId: string | null,
  userId: string,
  values: {
    status: OnboardingWorkStatus;
    phase: string;
    progress: number;
    latestJobId?: string | null;
    latestRunId?: string | null;
    blockingReason?: string | null;
    nextUserAction?: NextUserAction | Record<string, never>;
    attemptCount?: number;
    readinessConfirmedAt?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (!workItemId) return null;
  const update: Database["public"]["Tables"]["onboarding_work_items"]["Update"] = {
    status: values.status,
    phase: values.phase,
    progress: values.progress,
    blocking_reason: values.blockingReason ?? null,
    next_user_action: toJson(values.nextUserAction ?? {}),
    updated_by: "system",
  };
  if (values.latestJobId !== undefined) update.latest_job_id = values.latestJobId;
  if (values.latestRunId !== undefined) update.latest_run_id = values.latestRunId;
  if (values.attemptCount !== undefined) update.attempt_count = values.attemptCount;
  if (values.readinessConfirmedAt !== undefined)
    update.readiness_confirmed_at = values.readinessConfirmedAt;
  if (values.metadata !== undefined) update.metadata = toJson(values.metadata);
  const { data, error } = await admin
    .from("onboarding_work_items")
    .update(update)
    .eq("id", workItemId)
    .eq("user_id", userId)
    .select("id,status,version")
    .maybeSingle();
  if (error) throw new Error(`Unable to advance onboarding work: ${error.message}`);
  return data;
}

export async function onboardingWorkItemForMonitor(
  admin: AdminClient,
  userId: string,
  sourceMonitorId: string,
) {
  const { data } = await admin
    .from("onboarding_work_items")
    .select("id,status,metadata")
    .eq("user_id", userId)
    .eq("work_type", "source")
    .eq("related_object_type", "source_monitor")
    .eq("related_object_id", sourceMonitorId)
    .neq("status", "archived")
    .maybeSingle();
  return data;
}
