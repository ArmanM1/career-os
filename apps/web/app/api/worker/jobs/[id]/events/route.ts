import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeWorkerJob } from "@/lib/worker-job-route";

const eventSchema = z.object({ eventType: z.string().min(1).max(120), message: z.string().max(10000).default(""), payload: z.record(z.string(), z.unknown()).default({}) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await authorizeWorkerJob(request, id);
  if (!context) return NextResponse.json({ error: "Unauthorized job" }, { status: 401 });
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const { data: run } = await context.admin.from("agent_runs").select("id").eq("agent_job_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { error } = await context.admin.from("agent_events").insert({ user_id: context.device.userId, agent_run_id: run?.id ?? null, event_type: parsed.data.eventType, message: parsed.data.message, payload: parsed.data.payload, created_by: "system", updated_by: "system" });
  if (error) return NextResponse.json({ error: "Unable to store event" }, { status: 500 });
  await context.admin.from("agent_jobs").update({ heartbeat_at: new Date().toISOString(), lease_expires_at: new Date(Date.now() + 300_000).toISOString(), updated_by: "system" }).eq("id", id);
  return NextResponse.json({ ok: true });
}
