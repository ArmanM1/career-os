import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueSystemEmail } from "@/lib/notification-outbox";
import { onboardingWorkItemForMonitor, updateOnboardingWorkItem } from "@/lib/onboarding-work-items";
import { toJson } from "@/lib/json";

const signalSchema = z.object({ title: z.string(), signalType: z.enum(["job_post", "internship_post", "event", "program", "fellowship", "repo_update", "social_post", "newsletter_item", "other"]), sourceUrl: z.url().optional(), canonicalUrl: z.url().optional(), externalRef: z.string().optional(), companyName: z.string().optional(), roleTitle: z.string().optional(), location: z.string().optional(), opportunityType: z.enum(["job", "internship", "event", "program", "fellowship", "competition", "other"]).optional(), postedAt: z.string().datetime().optional(), deadlineAt: z.string().datetime().optional(), payload: z.record(z.string(), z.unknown()).default({}) });
const inputSchema = z.object({ status: z.enum(["success", "no_change", "failed", "auth_required"]), signals: z.array(signalSchema).max(1000).default([]), parserVersion: z.string().max(80).optional(), error: z.string().max(4000).optional(), evidence: z.record(z.string(), z.unknown()).default({}) });
function nextRun(metadata: unknown, schedule: string) { const minutes = Number((metadata as Record<string, unknown> | null)?.cadenceMinutes); if (Number.isFinite(minutes) && minutes >= 15) return new Date(Date.now() + minutes * 60_000).toISOString(); const hours = schedule.includes("2") ? 2 : schedule.includes("6") ? 6 : schedule.includes("daily") ? 24 : 6; return new Date(Date.now() + hours * 3600_000).toISOString(); }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const device = await authenticateWorker(request); if (!device) return workerUnauthorized(); const { id } = await params; const parsed = inputSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid source run result" }, { status: 400 }); const admin = getSupabaseAdminClient(); const { data: monitor } = await admin.from("source_monitors").select("*").eq("id", id).eq("user_id", device.userId).eq("claimed_by_device_id", device.id).maybeSingle(); if (!monitor) return NextResponse.json({ error: "Claimed source monitor not found" }, { status: 404 }); const now = new Date().toISOString();
  const runStatus = parsed.data.status === "auth_required" ? "needs_review" : parsed.data.status; const { data: run, error: runError } = await admin.from("source_runs").insert({ user_id: device.userId, source_monitor_id: id, title: `Run: ${monitor.title}`, status: runStatus, started_at: monitor.last_run_at ?? now, completed_at: now, error_message: parsed.data.error, metadata: { parserVersion: parsed.data.parserVersion }, created_by: "system", updated_by: "system" }).select("id").single();
  if (runError || !run) return NextResponse.json({ error: "Unable to create source run" }, { status: 500 });
  const evidenceId = crypto.randomUUID(); await admin.from("evidence").insert({ id: evidenceId, user_id: device.userId, title: `Source evidence: ${monitor.title}`, status: "active", source_type: "source_run", source_url: monitor.url, external_ref: run.id, payload: toJson(parsed.data.evidence), retention_policy: "raw_30_days", expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(), created_by: "system", updated_by: "system" });
  let created = 0; for (const signal of parsed.data.signals) { if (signal.canonicalUrl) { const { data: existing } = await admin.from("signals").select("id").eq("user_id", device.userId).eq("canonical_url", signal.canonicalUrl).maybeSingle(); if (existing) continue; } const { error } = await admin.from("signals").insert({ user_id: device.userId, source_monitor_id: id, source_run_id: run.id, title: signal.title, status: "new", signal_type: signal.signalType, source_type: monitor.source_type, source_url: signal.sourceUrl ?? monitor.url, canonical_url: signal.canonicalUrl, external_ref: signal.externalRef, company_name: signal.companyName, role_title: signal.roleTitle, location: signal.location, opportunity_type: signal.opportunityType, posted_at: signal.postedAt, deadline_at: signal.deadlineAt, raw_payload: toJson(signal.payload), normalized_payload: toJson(signal), parser_name: parsed.data.parserVersion ?? monitor.parser_version, parser_confidence: "high", rationale: "Deterministic source adapter extraction", evidence_ids: [evidenceId], created_by: "system", updated_by: "system" }); if (!error) created += 1; }
  await admin.from("source_runs").update({ new_signal_count: created, status: created ? "success" : runStatus, updated_by: "system" }).eq("id", run.id);
  if (created > 0) await admin.from("agent_jobs").insert({
    user_id: device.userId,
    agent_id: "career-opportunity-intelligence",
    title: `Normalize and rank ${created} signal${created === 1 ? "" : "s"} from ${monitor.title}`,
    queue: "opportunities",
    input_type: "opportunity.rank",
    input: { schemaVersion: 1, type: "opportunity.rank", sourceRunId: run.id, sourceMonitorId: monitor.id, signalCount: created },
    related_object_ids: [run.id, monitor.id],
    required_capabilities: [],
    priority: 75,
    scheduled_for: now,
    dedupe_key: `opportunity-rank:source-run:${run.id}`,
    created_by: "system",
    updated_by: "system",
  });
  const failures = parsed.data.status === "failed" ? monitor.consecutive_failures + 1 : 0; const status = parsed.data.status === "auth_required" ? "auth_required" : failures >= 3 ? "broken" : monitor.status; await admin.from("source_monitors").update({ status, claimed_by_device_id: null, lease_expires_at: null, last_run_at: now, next_run_at: nextRun(monitor.metadata, monitor.schedule), consecutive_failures: failures, useful_signal_count: monitor.useful_signal_count + created, last_useful_signal_at: created ? now : monitor.last_useful_signal_at, parser_version: parsed.data.parserVersion ?? monitor.parser_version, last_error: parsed.data.error, updated_by: "system" }).eq("id", id);
  const workItem = await onboardingWorkItemForMonitor(admin, device.userId, id);
  if (parsed.data.status === "success" || parsed.data.status === "no_change") {
    await updateOnboardingWorkItem(admin, workItem?.id ?? null, device.userId, {
      status: "ready",
      phase: "first_read_complete",
      progress: 100,
      readinessConfirmedAt: now,
    });
    await admin.from("source_adapters").update({ status: "active", updated_by: "system" }).eq("source_monitor_id", id).eq("user_id", device.userId);
  } else if (parsed.data.status === "auth_required") {
    const provider = new URL(monitor.url).hostname.replace(/^www\./, "");
    await updateOnboardingWorkItem(admin, workItem?.id ?? null, device.userId, {
      status: "waiting_for_user",
      phase: "auth_required",
      progress: 80,
      blockingReason: parsed.data.error ?? `${provider} requires an authenticated browser session.`,
      nextUserAction: {
        type: "authenticate_source",
        label: `Sign in to ${provider}`,
        provider,
        href: "/settings/worker",
        instructions: `Open the Career OS Browser desktop shortcut, finish the ${provider} login or consent step in that dedicated profile, then return to onboarding and retry this source.`,
      },
    });
  } else {
    await updateOnboardingWorkItem(admin, workItem?.id ?? null, device.userId, {
      status: "failed",
      phase: "first_read_failed",
      progress: 80,
      blockingReason: parsed.data.error ?? "The first source read failed.",
    });
  }
  if (status === "auth_required" || status === "broken") await enqueueSystemEmail(admin, { userId: device.userId, category: "source_failure", severity: status === "auth_required" ? "important" : "urgent", idempotencyKey: `source-${status}:${monitor.id}:${now.slice(0, 10)}`, subject: status === "auth_required" ? `${monitor.title} needs sign-in` : `${monitor.title} source is broken`, body: parsed.data.error ?? "Open Career OS to inspect and repair this source.", actionUrl: "/sources", actionLabel: "Review source" });
  return NextResponse.json({ runId: run.id, created });
}
