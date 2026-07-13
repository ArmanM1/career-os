import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { toJson } from "@/lib/json";

const healthSchema = z.object({
  workerVersion: z.string().max(40).optional(),
  capabilities: z.array(z.string().max(80)).max(50).optional(),
  health: z.record(z.string(), z.unknown()).default({}),
  lastError: z.string().max(2000).nullable().optional(),
});

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const parsed = healthSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid heartbeat" }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("worker_devices").update({
    status: "online",
    last_heartbeat_at: new Date().toISOString(),
    worker_version: parsed.data.workerVersion,
    capabilities: parsed.data.capabilities,
    health: toJson(parsed.data.health),
    last_error: parsed.data.lastError,
    updated_by: "system",
  }).eq("id", device.id).eq("user_id", device.userId).neq("status", "revoked");
  if (error) return NextResponse.json({ error: "Heartbeat update failed" }, { status: 500 });
  return NextResponse.json({ ok: true, serverTime: new Date().toISOString() });
}
