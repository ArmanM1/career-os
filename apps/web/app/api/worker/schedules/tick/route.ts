import { Cron } from "croner";
import { NextResponse } from "next/server";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type JobTemplate = {
  agentId?: string;
  title?: string;
  queue?: string;
  inputType?: string;
  input?: Record<string, unknown>;
  priority?: number;
  requiredCapabilities?: string[];
  relatedObjectIds?: string[];
};

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const admin = getSupabaseAdminClient();
  const now = new Date();
  const { data: schedules, error } = await admin
    .from("schedules")
    .select("*")
    .eq("user_id", device.userId)
    .eq("status", "active")
    .lte("next_run_at", now.toISOString())
    .order("next_run_at")
    .limit(50);
  if (error) return NextResponse.json({ error: "Unable to read schedules" }, { status: 500 });

  let enqueued = 0;
  for (const schedule of schedules ?? []) {
    const template = (schedule.job_template ?? {}) as JobTemplate;
    if (!template.agentId || !template.inputType || !schedule.cron_expression) continue;
    const dueAt = schedule.next_run_at ?? now.toISOString();
    const dedupeKey = `${schedule.dedupe_prefix}:${dueAt}`;
    const { error: insertError } = await admin.from("agent_jobs").insert({
      user_id: device.userId,
      agent_id: template.agentId,
      title: template.title ?? schedule.title,
      status: "queued",
      queue: template.queue ?? "default",
      input_type: template.inputType,
      input: { ...(template.input ?? {}), scheduleId: schedule.id, scheduledFor: dueAt },
      priority: template.priority ?? 0,
      scheduled_for: now.toISOString(),
      dedupe_key: dedupeKey,
      required_capabilities: template.requiredCapabilities ?? [],
      related_object_ids: template.relatedObjectIds ?? [],
      created_state_version: 0,
      created_by: "system",
      updated_by: "system",
    });
    if (!insertError) enqueued += 1;
    const next = new Cron(schedule.cron_expression, { timezone: schedule.timezone }).nextRun(new Date(now.getTime() + 1000));
    await admin.from("schedules").update({ last_run_at: now.toISOString(), next_run_at: next?.toISOString() ?? null, status: next ? "active" : "completed", updated_by: "system" }).eq("id", schedule.id).eq("user_id", device.userId);
  }
  return NextResponse.json({ checked: schedules?.length ?? 0, enqueued, serverTime: now.toISOString() });
}
