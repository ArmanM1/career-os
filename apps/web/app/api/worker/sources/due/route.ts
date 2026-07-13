import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  browserSourceSkillDefinitionSchema,
  renderBrowserSourceSkill,
} from "@career-os/core";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  onboardingWorkItemForMonitor,
  updateOnboardingWorkItem,
} from "@/lib/onboarding-work-items";

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("claim_source_monitors", {
    p_device_id: device.id,
    p_limit: 2,
  });
  if (error)
    return NextResponse.json(
      { error: "Unable to claim source monitors" },
      { status: 500 },
    );

  const deterministic = [];
  for (const monitor of data ?? []) {
    const workItem = await onboardingWorkItemForMonitor(
      admin,
      device.userId,
      monitor.id,
    );
    const { data: adapter } = await admin
      .from("source_adapters")
      .select("id,adapter_type,definition,checksum,status")
      .eq("user_id", device.userId)
      .eq("source_monitor_id", monitor.id)
      .is("archived_at", null)
      .in("status", ["testing", "active"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!adapter) {
      await admin
        .from("source_monitors")
        .update({
          status: "broken",
          claimed_by_device_id: null,
          lease_expires_at: null,
          last_error: "No validated source adapter is active.",
          updated_by: "system",
        })
        .eq("id", monitor.id)
        .eq("user_id", device.userId);
      await updateOnboardingWorkItem(admin, workItem?.id ?? null, device.userId, {
        status: "failed",
        phase: "adapter_missing",
        progress: 50,
        blockingReason: "Career OS could not activate a validated adapter for this source.",
      });
      continue;
    }

    if (adapter.adapter_type === "browser_skill") {
      const parsed = browserSourceSkillDefinitionSchema.safeParse(adapter.definition);
      if (!parsed.success) {
        await admin.from("source_adapters").update({
          status: "broken",
          test_result: { valid: false, issues: parsed.error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })) },
          updated_by: "system",
        }).eq("id", adapter.id);
        await admin.from("source_monitors").update({
          status: "broken",
          claimed_by_device_id: null,
          lease_expires_at: null,
          last_error: "Generated browser source skill failed validation.",
          updated_by: "system",
        }).eq("id", monitor.id);
        await updateOnboardingWorkItem(admin, workItem?.id ?? null, device.userId, {
          status: "failed",
          phase: "browser_skill_invalid",
          progress: 50,
          blockingReason: "The generated read-only browser skill failed validation and must be rebuilt.",
        });
        continue;
      }
      const markdown = renderBrowserSourceSkill(parsed.data);
      const browserSkillChecksum = createHash("sha256").update(markdown).digest("hex");
      const dedupeWindow = Math.floor(Date.now() / (parsed.data.cadenceMinutes * 60_000));
      const dedupeKey = `source-browser:${monitor.id}:${dedupeWindow}`;
      let { data: browserJob } = await admin
        .from("agent_jobs")
        .select("id")
        .eq("user_id", device.userId)
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();
      if (!browserJob) {
        const inserted = await admin.from("agent_jobs").insert({
          user_id: device.userId,
          agent_id: "career-source-browser-reader",
          title: `Read ${monitor.title}`,
          status: "queued",
          queue: "browser",
          input_type: "source.browser_read",
          input: {
            schemaVersion: 1,
            type: "source.browser_read",
            sourceMonitorId: monitor.id,
            sourceUrl: monitor.url,
            browserSkillDefinition: parsed.data,
            browserSkillChecksum,
            onboardingWorkItemId: workItem?.id,
          },
          prompt: `Use the source-specific read-only skill to inspect ${monitor.url} once. Return normalized career signals and evidence. If the existing browser profile cannot proceed without login, MFA, CAPTCHA, consent, or school SSO, return an exact nextUserAction instead of bypassing it.`,
          related_object_ids: [monitor.id, adapter.id],
          required_capabilities: ["browser_read"],
          priority: monitor.priority ?? 75,
          scheduled_for: new Date().toISOString(),
          dedupe_key: dedupeKey,
          metadata: {
            sourceMonitorId: monitor.id,
            sourceAdapterId: adapter.id,
            onboardingWorkItemId: workItem?.id,
          },
          created_by: "system",
          updated_by: "system",
        }).select("id").single();
        if (inserted.error || !inserted.data) {
          await admin.from("source_monitors").update({ claimed_by_device_id: null, lease_expires_at: null, updated_by: "system" }).eq("id", monitor.id);
          continue;
        }
        browserJob = inserted.data;
      }
      await admin.from("source_monitors").update({
        claimed_by_device_id: null,
        lease_expires_at: null,
        next_run_at: new Date(Date.now() + parsed.data.cadenceMinutes * 60_000).toISOString(),
        updated_by: "system",
      }).eq("id", monitor.id).eq("user_id", device.userId);
      await updateOnboardingWorkItem(admin, workItem?.id ?? null, device.userId, {
        status: "queued",
        phase: "first_read_queued",
        progress: 75,
        latestJobId: browserJob.id,
      });
      continue;
    }

    await updateOnboardingWorkItem(admin, workItem?.id ?? null, device.userId, {
      status: "running",
      phase: "reading_source",
      progress: 80,
    });
    const existingMetadata = monitor.metadata && typeof monitor.metadata === "object" && !Array.isArray(monitor.metadata)
      ? monitor.metadata as Record<string, unknown>
      : {};
    const definition = adapter.definition && typeof adapter.definition === "object" && !Array.isArray(adapter.definition)
      ? adapter.definition as Record<string, unknown>
      : {};
    deterministic.push({
      ...monitor,
      metadata: {
        ...existingMetadata,
        ...definition,
        adapterType: adapter.adapter_type,
        sourceAdapterId: adapter.id,
        onboardingWorkItemId: workItem?.id,
      },
    });
  }
  return NextResponse.json({ monitors: deterministic });
}
