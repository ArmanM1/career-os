import { NextResponse } from "next/server";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const device = await authenticateWorker(request); if (!device) return workerUnauthorized(); const admin = getSupabaseAdminClient(); const { data, error } = await admin.rpc("claim_source_monitors", { p_device_id: device.id, p_limit: 2 }); if (error) return NextResponse.json({ error: "Unable to claim source monitors" }, { status: 500 });
  const deterministic = [];
  for (const monitor of data ?? []) {
    if (monitor.fetch_strategy === "browser" || monitor.requires_auth) {
      const inputType = "source.inspect"; await admin.from("agent_jobs").insert({ user_id: device.userId, agent_id: "career-source-discovery", title: `Authenticated source read: ${monitor.title}`, status: "queued", queue: "browser", input_type: inputType, input: { schemaVersion: 1, type: inputType, sourceMonitorId: monitor.id, url: monitor.url, configuredRead: true }, prompt: `Read the configured source ${monitor.url}, extract only career-relevant signals, and do not perform any external write action.`, priority: monitor.priority ?? 50, scheduled_for: new Date().toISOString(), dedupe_key: `source-monitor:${monitor.id}:${new Date().toISOString().slice(0, 13)}`, required_capabilities: ["browser"], metadata: { sourceMonitorId: monitor.id }, created_by: "system", updated_by: "system" });
      await admin.from("source_monitors").update({ claimed_by_device_id: null, lease_expires_at: null, next_run_at: new Date(Date.now() + 2 * 3600_000).toISOString(), last_run_at: new Date().toISOString(), updated_by: "system" }).eq("id", monitor.id);
    } else deterministic.push(monitor);
  }
  return NextResponse.json({ monitors: deterministic });
}
