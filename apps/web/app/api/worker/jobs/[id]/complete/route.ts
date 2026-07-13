import { NextResponse } from "next/server";
import { agentOutputSchema, enforceAgentOutputContract } from "@career-os/core";
import { authorizeWorkerJob } from "@/lib/worker-job-route";
import { enqueueSystemEmail } from "@/lib/notification-outbox";
import { advanceOnboardingAfterCompletedJob } from "@/lib/onboarding-job-orchestration";
import { sourceMonitorIdFromJob } from "@/lib/onboarding-work-items";
import { toJson } from "@/lib/json";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await authorizeWorkerJob(request, id);
  if (!context) return NextResponse.json({ error: "Unauthorized job" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { output?: unknown; runtime?: unknown };
  const output = agentOutputSchema.safeParse(body.output);
  if (!output.success) return NextResponse.json({ error: "Agent output failed its contract", details: output.error.flatten() }, { status: 400 });
  let contracted;
  try { contracted = enforceAgentOutputContract(context.job.agent_id, output.data).output; }
  catch { return NextResponse.json({ error: "Agent output exceeds its registered contract" }, { status: 400 }); }
  const { data: runId, error } = await context.admin.rpc("complete_agent_job", { p_device_id: context.device.id, p_job_id: id, p_output: toJson(contracted), p_runtime: toJson(body.runtime ?? {}) });
  if (error) return NextResponse.json({ error: "Unable to persist completed job" }, { status: 500 });
  const { data: mutations } = await context.admin.from("proposed_mutations").select("id,mutation_type,payload").eq("agent_run_id", runId).eq("status", "pending").order("created_at");
  const { data: approvals } = await context.admin.from("approval_requests").select("id,title,rationale").eq("agent_run_id", runId).eq("status", "pending");
  for (const approval of approvals ?? []) await enqueueSystemEmail(context.admin, { userId: context.device.userId, category: "approval", severity: "important", idempotencyKey: `approval:${approval.id}`, subject: approval.title, body: approval.rationale, actionUrl: "/approvals", actionLabel: "Review approval" });
  const sourceMonitorId = sourceMonitorIdFromJob(context.job);
  let sourceRunId: string | null = null;
  if (context.job.agent_id === "career-source-browser-reader" && sourceMonitorId) {
    const signalCount = (mutations ?? []).filter((mutation) => mutation.mutation_type === "signal.create").length;
    const runStatus = ["auth_required", "needs_user_input"].includes(contracted.disposition.status)
      ? "needs_review"
      : signalCount > 0
        ? "success"
        : "no_change";
    const { data: sourceRun, error: sourceRunError } = await context.admin.from("source_runs").insert({
      user_id: context.device.userId,
      source_monitor_id: sourceMonitorId,
      title: `Browser read: ${context.job.title}`,
      status: runStatus,
      completed_at: new Date().toISOString(),
      new_signal_count: signalCount,
      error_message: contracted.disposition.reason,
      metadata: toJson({ agentRunId: runId, jobId: id, disposition: contracted.disposition }),
      created_by: "system",
      updated_by: "system",
    }).select("id").single();
    if (sourceRunError || !sourceRun) return NextResponse.json({ error: "Unable to persist browser source run" }, { status: 500 });
    sourceRunId = sourceRun.id;
    for (const mutation of mutations ?? []) {
      if (mutation.mutation_type !== "signal.create") continue;
      const payload = mutation.payload && typeof mutation.payload === "object" && !Array.isArray(mutation.payload) ? mutation.payload as Record<string, unknown> : {};
      const nextPayload = { ...payload, sourceMonitorId, sourceRunId };
      mutation.payload = nextPayload;
      await context.admin.from("proposed_mutations").update({ payload: toJson(nextPayload), updated_by: "system" }).eq("id", mutation.id).eq("user_id", context.device.userId);
    }
  }
  const mutationErrors: string[] = [];
  for (const mutation of mutations ?? []) { const applied = await context.admin.rpc("apply_career_mutation", { p_mutation_id: mutation.id }); if (applied.error) { mutationErrors.push(`${mutation.id}: ${applied.error.message}`); break; } }
  if (sourceRunId && sourceMonitorId) {
    const now = new Date().toISOString();
    const authRequired = ["auth_required", "needs_user_input"].includes(contracted.disposition.status);
    const { data: monitor } = await context.admin.from("source_monitors").select("metadata,useful_signal_count").eq("id", sourceMonitorId).eq("user_id", context.device.userId).maybeSingle();
    const metadata = monitor?.metadata && typeof monitor.metadata === "object" && !Array.isArray(monitor.metadata) ? monitor.metadata as Record<string, unknown> : {};
    const cadenceMinutes = Number(metadata.cadenceMinutes);
    const nextMinutes = Number.isFinite(cadenceMinutes) && cadenceMinutes >= 15 ? cadenceMinutes : 120;
    const appliedSignals = mutationErrors.length ? 0 : (mutations ?? []).filter((mutation) => mutation.mutation_type === "signal.create").length;
    await context.admin.from("source_runs").update({ new_signal_count: appliedSignals, status: authRequired ? "needs_review" : appliedSignals ? "success" : "no_change", updated_by: "system" }).eq("id", sourceRunId);
    await context.admin.from("source_monitors").update({ status: authRequired ? "auth_required" : "active", last_run_at: now, next_run_at: new Date(Date.now() + nextMinutes * 60_000).toISOString(), last_error: contracted.disposition.reason ?? null, consecutive_failures: 0, useful_signal_count: (monitor?.useful_signal_count ?? 0) + appliedSignals, last_useful_signal_at: appliedSignals ? now : undefined, updated_by: "system" }).eq("id", sourceMonitorId).eq("user_id", context.device.userId);
  }
  await advanceOnboardingAfterCompletedJob(context.admin, context.job, runId, contracted, mutationErrors);
  return NextResponse.json({ ok: true, runId, mutationErrors });
}
