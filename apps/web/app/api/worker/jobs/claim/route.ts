import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const inputSchema = z.object({ limit: z.number().int().min(1).max(10).default(1), leaseSeconds: z.number().int().min(30).max(1800).default(300) });

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const parsed = inputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid claim request" }, { status: 400 });
  const admin = getSupabaseAdminClient();
  await admin.rpc("recover_stale_agent_jobs");
  const { data, error } = await admin.rpc("claim_agent_jobs", {
    p_device_id: device.id,
    p_limit: parsed.data.limit,
    p_lease_seconds: parsed.data.leaseSeconds,
  });
  if (error) return NextResponse.json({ error: "Unable to claim jobs" }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}
