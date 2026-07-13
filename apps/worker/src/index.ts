import {
  agentOutputSchema,
  enforceAgentOutputContract,
  getAgentDefinition,
  validateAgentJobInput,
} from "@career-os/core";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { readWorkerEnv } from "./env";
import { persistAgentOutput } from "./mutation-applier";
import { createRuntime, NeedsUserInputError, RuntimeApprovalRequest, RuntimeEvent } from "./runtime";
import { createWorkerSupabase } from "./supabase";
import { runDueApplicationStatusChecks, runDueSourceMonitors } from "./source-monitors";

async function main() {
  const env = readWorkerEnv();
  const supabase = createWorkerSupabase(env);
  const runtime = createRuntime(env.runtime);
  const repoRoot = findRepoRoot();
  const once = process.argv.includes("--once");

  console.log(`Career OS worker started with ${env.runtime} runtime.`);

  try {
    do {
      await runDueApplicationStatusChecks(supabase);
      await runDueSourceMonitors(supabase);
      await processOneAgentJob(supabase, runtime, repoRoot);

      if (!once) {
        await new Promise((resolve) => setTimeout(resolve, env.pollMs));
      }
    } while (!once);
  } finally {
    if (once) await runtime.dispose?.();
  }
}

async function processOneAgentJob(
  supabase: ReturnType<typeof createWorkerSupabase>,
  runtime: ReturnType<typeof createRuntime>,
  repoRoot: string,
) {
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

  const inputValidation = validateAgentJobInput(agent.id, job.input ?? {});
  if (!inputValidation.ok) {
    const message = inputValidation.error ?? `Invalid input for ${agent.id}`;
    await supabase.from("agent_jobs").update({ status: "failed", error_message: message }).eq("id", job.id);
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
  for (const warning of inputValidation.warnings) {
    await persistEvent(supabase, job.user_id, run.id, {
      type: "contract_warning",
      message: warning,
      payload: { agentId: agent.id, agentJobId: job.id },
    });
  }

  const threadTitle = `${agent.displayName}: ${job.title ?? job.id}`;
  const thread = await startRuntimeThreadOrFail(supabase, runtime, job.id, run.id, {
    title: threadTitle,
    agentId: agent.id,
    cwd: repoRoot,
  });
  if (!thread) return;

  const { data: threadRows, error: threadError } = await supabase.from("runtime_threads").insert({
    user_id: job.user_id,
    agent_run_id: run.id,
    provider: thread.provider,
    runtime_thread_id: thread.id,
    thread_type: agent.threadPolicy,
    title: thread.title,
    status: "active",
    created_by: "system",
    updated_by: "system",
  }).select("*").limit(1);

  if (threadError || !threadRows?.length) {
    await supabase.from("agent_runs").update({ status: "failed", error_message: threadError?.message ?? "Could not create runtime thread" }).eq("id", run.id);
    await supabase.from("agent_jobs").update({ status: "failed", error_message: threadError?.message ?? "Could not create runtime thread" }).eq("id", job.id);
    return;
  }

  const runtimeThread = threadRows[0];
  const turnInput = {
    prompt: job.prompt ?? "",
    skillPath: agent.skillPath,
    context: job.input ?? {},
  };
  const { data: turnRows, error: turnError } = await supabase.from("runtime_turns").insert({
    user_id: job.user_id,
    runtime_thread_id: runtimeThread.id,
    agent_run_id: run.id,
    title: job.title ?? agent.displayName,
    status: "running",
    input: turnInput,
    metadata: {
      agentId: agent.id,
      agentJobId: job.id,
    },
    created_by: "system",
    updated_by: "system",
  }).select("*").limit(1);

  if (turnError || !turnRows?.length) {
    await supabase.from("agent_runs").update({ status: "failed", error_message: turnError?.message ?? "Could not create runtime turn" }).eq("id", run.id);
    await supabase.from("agent_jobs").update({ status: "failed", error_message: turnError?.message ?? "Could not create runtime turn" }).eq("id", job.id);
    return;
  }

  const runtimeTurn = turnRows[0];

  let finalPayload: unknown = null;
  try {
    for await (const event of runtime.runTurn({
      thread,
      prompt: turnInput.prompt,
      skillPath: agent.skillPath,
      context: turnInput.context,
    })) {
      await persistEvent(supabase, job.user_id, run.id, event);
      if (event.type === "turn_started") {
        const runtimeTurnId = typeof event.payload?.runtimeTurnId === "string" ? event.payload.runtimeTurnId : null;
        if (runtimeTurnId) {
          await supabase.from("runtime_turns").update({ runtime_turn_id: runtimeTurnId }).eq("id", runtimeTurn.id);
        }
      }
      if (event.type === "completed") {
        finalPayload = event.payload;
      }
    }

    const parsedOutput = agentOutputSchema.parse(finalPayload ?? {});
    const contractResult = enforceAgentOutputContract(agent.id, parsedOutput);
    for (const warning of contractResult.warnings) {
      await persistEvent(supabase, job.user_id, run.id, {
        type: "contract_warning",
        message: warning,
        payload: { agentId: agent.id, agentJobId: job.id },
      });
    }

    await persistAgentOutput(supabase, { userId: job.user_id, agentRunId: run.id }, contractResult.output);
    await supabase.from("runtime_turns").update({ status: "completed", output: contractResult.output }).eq("id", runtimeTurn.id);
    await supabase.from("agent_runs").update({ status: "completed", output: contractResult.output }).eq("id", run.id);
    await supabase.from("agent_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    if (caught instanceof NeedsUserInputError) {
      await createRuntimeApprovalRequest(supabase, job.user_id, run.id, caught.approvalRequest);
      await supabase.from("runtime_turns").update({
        status: "needs_user_input",
        metadata: {
          ...runtimeTurn.metadata,
          approvalRequest: caught.approvalRequest,
        },
      }).eq("id", runtimeTurn.id);
      await supabase.from("agent_runs").update({ status: "needs_user_input", error_message: message }).eq("id", run.id);
      await supabase.from("agent_jobs").update({ status: "needs_user_input", error_message: message }).eq("id", job.id);
      return;
    }

    await supabase.from("runtime_turns").update({ status: "failed", metadata: { ...runtimeTurn.metadata, errorMessage: message } }).eq("id", runtimeTurn.id);
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

async function startRuntimeThreadOrFail(
  supabase: ReturnType<typeof createWorkerSupabase>,
  runtime: ReturnType<typeof createRuntime>,
  agentJobId: string,
  agentRunId: string,
  input: Parameters<ReturnType<typeof createRuntime>["startThread"]>[0],
) {
  try {
    return await runtime.startThread(input);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    await supabase.from("agent_runs").update({ status: "failed", error_message: message }).eq("id", agentRunId);
    await supabase.from("agent_jobs").update({ status: "failed", error_message: message }).eq("id", agentJobId);
    return null;
  }
}

async function createRuntimeApprovalRequest(
  supabase: ReturnType<typeof createWorkerSupabase>,
  userId: string,
  agentRunId: string,
  request: RuntimeApprovalRequest,
) {
  await supabase.from("approval_requests").insert({
    user_id: userId,
    agent_run_id: agentRunId,
    title: request.title,
    status: "pending",
    labels: ["codex-app-server", "runtime"],
    action_type: request.actionType,
    rationale: request.rationale,
    risk_level: request.riskLevel,
    payload: {
      description: request.description,
      ...request.payload,
    },
    evidence_ids: [],
    created_by: "agent",
    updated_by: "agent",
  });
}

function findRepoRoot(start = process.cwd()) {
  let current = resolve(start);

  while (true) {
    if (existsSync(join(current, "career-os-agents", "skills")) && existsSync(join(current, "package.json"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) return resolve(start);
    current = parent;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
