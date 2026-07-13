import { NextResponse } from "next/server";
import { authorizeWorkerJob } from "@/lib/worker-job-route";
import { enqueueSystemEmail } from "@/lib/notification-outbox";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await authorizeWorkerJob(request, id);
  if (!context) return NextResponse.json({ error: "Unauthorized job" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { error?: string; retryable?: boolean };
  const retry = body.retryable !== false && context.job.attempt_count < context.job.max_attempts;
  const delaySeconds = Math.min(3600, 30 * 2 ** Math.max(0, context.job.attempt_count - 1));
  const { error } = await context.admin.from("agent_jobs").update({
    status: retry ? "queued" : "dead_letter",
    error_message: String(body.error ?? "Worker job failed").slice(0, 4000),
    retry_after: retry ? new Date(Date.now() + delaySeconds * 1000).toISOString() : null,
    claimed_by_device_id: null,
    locked_at: null,
    lease_expires_at: null,
    updated_by: "system",
  }).eq("id", id).eq("status", "running");
  if (error) return NextResponse.json({ error: "Unable to fail job" }, { status: 500 });
  if (!retry) await enqueueSystemEmail(context.admin, { userId: context.device.userId, category: "worker_failure", severity: "urgent", idempotencyKey: `dead-letter-job:${id}`, subject: "Career OS work needs attention", body: `${context.job.title} exhausted its retry limit: ${String(body.error ?? "Worker job failed").slice(0, 1000)}`, actionUrl: "/settings/system-health", actionLabel: "Review system health" });
  return NextResponse.json({ ok: true, retryScheduled: retry });
}
