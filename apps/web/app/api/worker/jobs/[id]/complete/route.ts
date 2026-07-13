import { NextResponse } from "next/server";
import { agentOutputSchema, enforceAgentOutputContract } from "@career-os/core";
import { authorizeWorkerJob } from "@/lib/worker-job-route";

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
  const { data: runId, error } = await context.admin.rpc("complete_agent_job", { p_device_id: context.device.id, p_job_id: id, p_output: contracted, p_runtime: body.runtime ?? {} });
  if (error) return NextResponse.json({ error: "Unable to persist completed job" }, { status: 500 });
  const { data: mutations } = await context.admin.from("proposed_mutations").select("id").eq("agent_run_id", runId).eq("status", "pending").order("created_at");
  const mutationErrors: string[] = [];
  for (const mutation of mutations ?? []) { const applied = await context.admin.rpc("apply_career_mutation", { p_mutation_id: mutation.id }); if (applied.error) { mutationErrors.push(`${mutation.id}: ${applied.error.message}`); break; } }
  return NextResponse.json({ ok: true, runId, mutationErrors });
}
