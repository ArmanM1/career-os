import { agentOutputSchema, getAgentDefinition } from "@career-os/core";
import { readWorkerEnv } from "./env";
import { persistAgentOutput } from "./mutation-applier";
import { createRuntime, RuntimeEvent } from "./runtime";
import { createWorkerSupabase } from "./supabase";
import { runDueApplicationStatusChecks, runDueSourceMonitors } from "./source-monitors";

async function main() {
  const env = readWorkerEnv();
  const supabase = createWorkerSupabase(env);
  const runtime = createRuntime(env.runtime);
  const once = process.argv.includes("--once");

  console.log(`Career OS worker started with ${env.runtime} runtime.`);

  do {
    await runDueApplicationStatusChecks(supabase);
    await runDueSourceMonitors(supabase);
    await processOneAgentJob(supabase, runtime);

    if (!once) {
      await new Promise((resolve) => setTimeout(resolve, env.pollMs));
    }
  } while (!once);
}

async function processOneAgentJob(supabase: ReturnType<typeof createWorkerSupabase>, runtime: ReturnType<typeof createRuntime>) {
  const { data: jobs, error } = await supabase
    .from("agent_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (error || !jobs?.length) return;

  const job = jobs[0];
  const agent = getAgentDefinition(job.agent_id);
  if (!agent) {
    await supabase.from("agent_jobs").update({ status: "failed", error_message: `Unknown agent ${job.agent_id}` }).eq("id", job.id);
    return;
  }

  await supabase.from("agent_jobs").update({ status: "running", locked_at: new Date().toISOString() }).eq("id", job.id);

  const { data: runRows, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      user_id: job.user_id,
      agent_job_id: job.id,
      agent_id: agent.id,
      title: job.title ?? agent.displayName,
      status: "running",
      input: job.input ?? {},
      created_by: "system",
      updated_by: "system",
    })
    .select("*")
    .limit(1);

  if (runError || !runRows?.length) {
    await supabase.from("agent_jobs").update({ status: "failed", error_message: runError?.message ?? "Could not create run" }).eq("id", job.id);
    return;
  }

  const run = runRows[0];
  const thread = await runtime.startThread({
    title: `${agent.displayName}: ${job.title ?? job.id}`,
    agentId: agent.id,
    cwd: process.cwd(),
  });

  await supabase.from("runtime_threads").insert({
    user_id: job.user_id,
    agent_run_id: run.id,
    provider: thread.provider,
    runtime_thread_id: thread.id,
    thread_type: agent.threadPolicy,
    title: thread.title,
    status: "active",
    created_by: "system",
    updated_by: "system",
  });

  let finalPayload: unknown = null;
  try {
    for await (const event of runtime.runTurn({
      thread,
      prompt: job.prompt ?? "",
      skillPath: agent.skillPath,
      context: job.input ?? {},
    })) {
      await persistEvent(supabase, job.user_id, run.id, event);
      if (event.type === "completed") {
        finalPayload = event.payload;
      }
    }

    const output = agentOutputSchema.parse(finalPayload ?? {});
    await persistAgentOutput(supabase, { userId: job.user_id, agentRunId: run.id }, output);
    await supabase.from("agent_runs").update({ status: "completed", output }).eq("id", run.id);
    await supabase.from("agent_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    await supabase.from("agent_runs").update({ status: "failed", error_message: message }).eq("id", run.id);
    await supabase.from("agent_jobs").update({ status: "failed", error_message: message }).eq("id", job.id);
  }
}

async function persistEvent(supabase: ReturnType<typeof createWorkerSupabase>, userId: string, agentRunId: string, event: RuntimeEvent) {
  await supabase.from("agent_events").insert({
    user_id: userId,
    agent_run_id: agentRunId,
    event_type: event.type,
    message: event.message,
    payload: event.payload ?? {},
    created_by: "system",
    updated_by: "system",
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

