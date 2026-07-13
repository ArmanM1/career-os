import {
  agentOutputSchema,
  enforceAgentOutputContract,
  getAgentDefinition,
  validateAgentJobInput,
} from "@career-os/core";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  loadDeviceCredentials,
  saveDeviceCredentials,
} from "./device-credentials";
import { readWorkerEnv } from "./env";
import {
  pairWorker,
  WorkerGatewayClient,
  type ClaimedJob,
} from "./gateway-client";
import { createRuntime, NeedsUserInputError } from "./runtime";
import { runSourceAdapter } from "./source-adapters";
import { materializeBrowserSourceSkill } from "./source-browser-skill";

const capabilities = [
  "codex",
  "filesystem",
  "latex",
  "browser",
  "source-monitor",
  "artifact-sync",
];

function log(
  level: "info" | "error" | "warn",
  event: string,
  details: Record<string, unknown> = {},
) {
  const sanitized = Object.fromEntries(
    Object.entries(details).filter(
      ([key]) => !/secret|token|password|authorization/i.test(key),
    ),
  );
  console[level](
    JSON.stringify({
      time: new Date().toISOString(),
      level,
      event,
      ...sanitized,
    }),
  );
}

async function main() {
  const env = readWorkerEnv();
  const pairIndex = process.argv.indexOf("--pair");
  if (pairIndex >= 0) {
    const code = process.argv[pairIndex + 1];
    if (!code)
      throw new Error("Pass the ten-minute pairing code after --pair.");
    const credentials = await pairWorker(env.gatewayUrl, code, capabilities);
    saveDeviceCredentials(env.dataDir, credentials);
    log("info", "worker.paired", { deviceId: credentials.deviceId });
    return;
  }

  const credentials = loadDeviceCredentials(env.dataDir);
  const gateway = new WorkerGatewayClient(env.gatewayUrl, credentials);
  const repoRoot = findRepoRoot();
  const once = process.argv.includes("--once");
  log("info", "worker.started", {
    runtime: env.runtime,
    deviceId: credentials.deviceId,
  });

  try {
    do {
      await gateway.heartbeat({
        workerVersion: "0.3.0",
        capabilities,
        health: await collectHealth(repoRoot),
      });
      await gateway.tickSchedules();
      try { await gateway.dispatchNotifications(); } catch (error) { log("warn", "notifications.dispatch_failed", { message: error instanceof Error ? error.message : String(error) }); }
      const { accounts } = await gateway.dueConnectors();
      for (const account of accounts) {
        try {
          await gateway.syncConnector(account.id);
        } catch (error) {
          log("warn", "connector.sync_failed", {
            accountId: account.id,
            provider: account.provider,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      const { monitors } = await gateway.dueSources();
      for (const monitor of monitors) {
        try {
          await gateway.completeSource(
            monitor.id,
            await runSourceAdapter(monitor),
          );
        } catch (error) {
          await gateway.completeSource(monitor.id, {
            status: "failed",
            signals: [],
            error: error instanceof Error ? error.message : String(error),
            evidence: {},
          });
        }
      }
      const { jobs } = await gateway.claimJobs(2);
      const browserJobs = jobs.filter((job) =>
        job.required_capabilities.some((capability) =>
          capability.startsWith("browser_"),
        ),
      );
      const latexJobs = jobs.filter(
        (job) =>
          !browserJobs.includes(job) &&
          job.required_capabilities.includes("latex_compile"),
      );
      const regularJobs = jobs.filter(
        (job) => !browserJobs.includes(job) && !latexJobs.includes(job),
      );
      await Promise.all([
        Promise.all(
          regularJobs.map(async (job) => {
            const jobRuntime = createRuntime(env.runtime);
            try {
              await processJob(gateway, jobRuntime, repoRoot, env.dataDir, job);
            } finally {
              await jobRuntime.dispose?.();
            }
          }),
        ),
        (async () => {
          for (const job of browserJobs) {
            const jobRuntime = createRuntime(env.runtime);
            try {
              await processJob(gateway, jobRuntime, repoRoot, env.dataDir, job);
            } finally {
              await jobRuntime.dispose?.();
            }
          }
        })(),
        (async () => {
          for (const job of latexJobs) {
            const jobRuntime = createRuntime(env.runtime);
            try {
              await processJob(gateway, jobRuntime, repoRoot, env.dataDir, job);
            } finally {
              await jobRuntime.dispose?.();
            }
          }
        })(),
      ]);
      if (!once)
        await new Promise((resolvePromise) =>
          setTimeout(resolvePromise, env.pollMs),
        );
    } while (!once);
  } finally {
    log("info", "worker.stopped");
  }
}

async function processJob(
  gateway: WorkerGatewayClient,
  runtime: ReturnType<typeof createRuntime>,
  repoRoot: string,
  dataDir: string,
  job: ClaimedJob,
) {
  await synchronizeJobArtifact(gateway, job, dataDir);
  const agent = getAgentDefinition(job.agent_id);
  if (!agent)
    return gateway.fail(job.id, `Unknown agent ${job.agent_id}`, false);
  const validation = validateAgentJobInput(agent.id, job.input ?? {});
  if (!validation.ok)
    return gateway.fail(
      job.id,
      validation.error ?? `Invalid input for ${agent.id}`,
      false,
    );
  for (const warning of validation.warnings)
    await gateway.event(job.id, "contract_warning", warning, {
      agentId: agent.id,
    });

  const leaseHeartbeat = setInterval(() => {
    void gateway.event(job.id, "heartbeat", "Worker extended the active job lease.").catch((error) => log("warn", "job.heartbeat_failed", { jobId: job.id, message: error instanceof Error ? error.message : String(error) }));
  }, 60_000);
  leaseHeartbeat.unref();
  try {
    const execution = await prepareJobExecution(job, repoRoot, dataDir);
    let state = await gateway.currentState();
    const existingRuntimeThreadId = agent.id === "career-source-browser-reader" ? null : typeof job.metadata?.runtimeThreadId === "string" ? job.metadata.runtimeThreadId : null;
    const threadInput = { title: `${agent.displayName}: ${job.title}`, agentId: agent.id, jobId: job.id, requiredCapabilities: job.required_capabilities, cwd: execution.cwd, toolRoot: repoRoot, browserAllowedOrigins: execution.browserAllowedOrigins };
    const thread = existingRuntimeThreadId
      ? await runtime.resumeThread(existingRuntimeThreadId, threadInput)
      : await runtime.startThread(threadInput);
    let finalPayload: unknown = null;
    for await (const event of runtime.runTurn({
      agentId: agent.id,
      thread,
      prompt: job.prompt ?? "",
      skillPath: execution.skillPath,
      context: {
        currentState: state,
        input: job.input,
        requiredCapabilities: job.required_capabilities,
        sourceSkillChecksum: execution.sourceSkillChecksum,
      },
    })) {
      await gateway.event(
        job.id,
        event.type,
        event.message,
        event.payload ?? {},
      );
      if (event.type === "completed") finalPayload = event.payload;
    }
    const parsed = agentOutputSchema.parse(finalPayload ?? {});
    let contract = enforceAgentOutputContract(agent.id, parsed);
    const latestState = await gateway.currentState();
    if (latestState.stateVersion !== state.stateVersion) {
      await gateway.event(job.id, "contract_warning", "Career state changed during this run; revalidating proposed mutations against the latest state.", { previousStateVersion: state.stateVersion, latestStateVersion: latestState.stateVersion });
      let revalidatedPayload: unknown = null;
      for await (const event of runtime.runTurn({
        agentId: agent.id,
        thread,
        prompt: `Career OS state changed while you were working. Revalidate the prior structured output against the new CurrentStateBundle. Return the complete revised output and preserve only still-correct mutations.\n\nPrior output:\n${JSON.stringify(contract.output)}`,
        skillPath: execution.skillPath,
        context: { currentState: latestState, input: job.input, requiredCapabilities: job.required_capabilities, sourceSkillChecksum: execution.sourceSkillChecksum, revalidation: true },
      })) {
        await gateway.event(job.id, event.type, event.message, event.payload ?? {});
        if (event.type === "completed") revalidatedPayload = event.payload;
      }
      contract = enforceAgentOutputContract(agent.id, agentOutputSchema.parse(revalidatedPayload ?? {}));
      state = latestState;
    }
    for (const warning of contract.warnings)
      await gateway.event(job.id, "contract_warning", warning, {
        agentId: agent.id,
      });
    await gateway.complete(job.id, contract.output, {
      provider: thread.provider,
      runtimeThreadId: thread.id,
      title: thread.title,
      stateVersion: state.stateVersion,
      stateAsOf: state.asOf,
    });
  } catch (error) {
    if (error instanceof NeedsUserInputError) {
      await gateway.needsInput(job.id, error.message, error.approvalRequest);
      return;
    }
    await gateway.fail(
      job.id,
      error instanceof Error ? error.message : String(error),
      true,
    );
  } finally {
    clearInterval(leaseHeartbeat);
  }
}

async function prepareJobExecution(job: ClaimedJob, repoRoot: string, dataDir: string) {
  if (job.agent_id !== "career-source-browser-reader") {
    let browserAllowedOrigins: string[] = [];
    const scopedBrowserUrl = job.input.type === "source.inspect" && typeof job.input.url === "string"
      ? job.input.url
      : typeof job.input.portalUrl === "string"
        ? job.input.portalUrl
        : null;
    if (scopedBrowserUrl) {
      try { browserAllowedOrigins = [new URL(scopedBrowserUrl).origin]; } catch { browserAllowedOrigins = []; }
    }
    return {
      cwd: repoRoot,
      skillPath: getAgentDefinition(job.agent_id)?.skillPath ?? "",
      browserAllowedOrigins,
      sourceSkillChecksum: null as string | null,
    };
  }
  const definition = job.input.browserSkillDefinition;
  if (!definition || typeof definition !== "object") throw new Error("Browser source job is missing its generated skill definition.");
  const materialized = await materializeBrowserSourceSkill(
    definition as Parameters<typeof materializeBrowserSourceSkill>[0],
    resolve(dataDir, "workspace", "source-skills"),
  );
  const expectedChecksum = typeof job.input.browserSkillChecksum === "string" ? job.input.browserSkillChecksum : null;
  if (expectedChecksum && expectedChecksum !== materialized.checksum) throw new Error("Generated browser source skill checksum does not match the activated adapter.");
  return {
    cwd: materialized.cwd,
    skillPath: materialized.skillPath,
    browserAllowedOrigins: materialized.allowedOrigins,
    sourceSkillChecksum: materialized.checksum,
  };
}

async function synchronizeJobArtifact(gateway: WorkerGatewayClient, job: ClaimedJob, dataDir: string) {
  const storagePath = typeof job.input.storagePath === "string" ? job.input.storagePath : null;
  const artifactId = typeof job.input.artifactId === "string" ? job.input.artifactId : null;
  if (!storagePath || !artifactId || job.input.localPath) return;
  const { signedUrl } = await gateway.artifactDownloadUrl("resume-sources", storagePath);
  const response = await fetch(signedUrl, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Artifact download failed (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 50 * 1024 * 1024) throw new Error("Artifact exceeds the 50 MB worker synchronization limit.");
  const fileName = storagePath.split("/").pop()?.replace(/[^a-zA-Z0-9._-]+/g, "-") || `${artifactId}.bin`;
  const localPath = resolve(dataDir || tmpdir(), "workspace", "resume-sources", artifactId, fileName);
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  await gateway.artifactSynced(artifactId, sha256, localPath);
  job.input.localPath = localPath;
}

async function collectHealth(repoRoot: string) {
  const codex = spawnSync("codex", ["login", "status"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  });
  const latex = spawnSync("latexmk", ["--version"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
  });
  return {
    codexAuthenticated: codex.status === 0,
    repoAvailable: existsSync(join(repoRoot, "package.json")),
    browserProfileAvailable: existsSync(
      join(process.env.LOCALAPPDATA ?? "", "CareerOS", "chrome-profile"),
    ),
    latexAvailable: latex.status === 0,
    codexError:
      codex.status === 0
        ? null
        : (
            codex.stderr ||
            codex.error?.message ||
            "Codex authentication check failed"
          ).slice(0, 500),
    latexError:
      latex.status === 0
        ? null
        : (
            latex.stderr ||
            latex.error?.message ||
            "latexmk is unavailable"
          ).slice(0, 500),
    platform: process.platform,
    node: process.version,
  };
}

function findRepoRoot(start = process.cwd()) {
  let current = resolve(start);
  while (true) {
    if (
      existsSync(join(current, "career-os-agents", "skills")) &&
      existsSync(join(current, "package.json"))
    )
      return current;
    const parent = dirname(current);
    if (parent === current) return resolve(start);
    current = parent;
  }
}

main().catch((error) => {
  log("error", "worker.fatal", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
