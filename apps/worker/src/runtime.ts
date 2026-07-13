import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { AgentOutput, agentSchemas, getAgentContract, normalizeAgentId } from "@career-os/core";
import { z } from "zod";
import { AppServerMessage, CodexAppServerClient } from "./codex-app-server-client";

type JsonObject = Record<string, unknown>;

export type RuntimeProvider = "codex-app-server" | "mock";

export type RuntimeThread = {
  id: string;
  provider: RuntimeProvider;
  title: string;
  cwd: string;
};

export type RuntimeApprovalRequest = {
  actionType: string;
  title: string;
  description: string;
  rationale: string;
  riskLevel: "low" | "medium" | "high";
  payload: JsonObject;
};

export type RuntimeEvent = {
  type: "message" | "tool" | "warning" | "contract_warning" | "completed" | "turn_started" | "approval_required";
  message: string;
  payload?: JsonObject;
};

export type StartThreadInput = {
  title: string;
  agentId: string;
  cwd: string;
};

export type RunTurnInput = {
  agentId: string;
  thread: RuntimeThread;
  prompt: string;
  skillPath: string;
  context: JsonObject;
};

export interface AgentRuntime {
  startThread(input: StartThreadInput): Promise<RuntimeThread>;
  resumeThread(threadId: string): Promise<RuntimeThread>;
  runTurn(input: RunTurnInput): AsyncIterable<RuntimeEvent>;
  interruptTurn(threadId: string, turnId: string): Promise<void>;
  archiveThread(threadId: string): Promise<void>;
  dispose?(): Promise<void> | void;
}

export class NeedsUserInputError extends Error {
  constructor(readonly approvalRequest: RuntimeApprovalRequest) {
    super(approvalRequest.title);
    this.name = "NeedsUserInputError";
  }
}

export class MockRuntime implements AgentRuntime {
  async startThread(input: StartThreadInput): Promise<RuntimeThread> {
    return { id: randomUUID(), provider: "mock", title: input.title, cwd: input.cwd };
  }

  async resumeThread(threadId: string): Promise<RuntimeThread> {
    return { id: threadId, provider: "mock", title: "Resumed thread", cwd: process.cwd() };
  }

  async *runTurn(input: RunTurnInput): AsyncIterable<RuntimeEvent> {
    yield { type: "message", message: `Loaded ${input.skillPath}` };
    yield { type: "message", message: `Processed job for ${input.thread.title}` };
    yield {
      type: "completed",
      message: "Mock runtime completed with no mutations.",
      payload: {
        schemaVersion: 1,
        summary: "Mock runtime completed.",
        messageParts: [],
        proposedMutations: [],
        stateObservations: [],
        approvalRequests: [],
        evidence: [],
        followUpQuestions: [],
        warnings: [],
      } satisfies AgentOutput,
    };
  }

  async interruptTurn(): Promise<void> {
    return;
  }

  async archiveThread(): Promise<void> {
    return;
  }
}

export class CodexAppServerRuntime implements AgentRuntime {
  private client: CodexAppServerClient | null = null;
  private cwd: string | null = null;

  async startThread(input: StartThreadInput): Promise<RuntimeThread> {
    const client = await this.clientFor(input.cwd);
    const response = await client.request<{ thread?: { id?: string } }>("thread/start", {
      model: codexModel(),
      cwd: input.cwd,
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      sandbox: "workspace-write",
      config: {
        web_search: "live",
        ...careerOsMcpConfig(input.cwd, input.agentId),
      },
      serviceName: "career-os-worker",
      baseInstructions: careerOsBaseInstructions,
      developerInstructions: [
        "You are being invoked by Career OS through Codex App Server.",
        "Use the provided Career OS skill and context snapshot.",
        "Your final assistant message must be only the requested structured JSON object.",
      ].join("\n"),
      experimentalRawEvents: false,
      persistExtendedHistory: true,
    });

    const id = response.thread?.id;
    if (!id) throw new Error("codex app-server thread/start did not return a thread id.");
    return { id, provider: "codex-app-server", title: input.title, cwd: input.cwd };
  }

  async resumeThread(threadId: string): Promise<RuntimeThread> {
    const cwd = this.cwd ?? process.cwd();
    const client = await this.clientFor(cwd);
    const response = await client.request<{ thread?: { id?: string; name?: string | null; cwd?: string | null } }>(
      "thread/resume",
      {
        threadId,
        model: codexModel(),
        cwd,
        approvalPolicy: "on-request",
        approvalsReviewer: "user",
        sandbox: "workspace-write",
        config: {
          web_search: "live",
          ...careerOsMcpConfig(cwd),
        },
        baseInstructions: careerOsBaseInstructions,
        persistExtendedHistory: true,
      },
    );

    return {
      id: response.thread?.id ?? threadId,
      provider: "codex-app-server",
      title: response.thread?.name ?? "Resumed thread",
      cwd: response.thread?.cwd ?? cwd,
    };
  }

  async *runTurn(input: RunTurnInput): AsyncIterable<RuntimeEvent> {
    const client = await this.clientFor(input.thread.cwd);
    const queue = new AsyncEventQueue<RuntimeEvent>();
    let assistantText = "";
    let turnId: string | null = null;
    let turnErrorMessage: string | null = null;
    let needsUserInput: NeedsUserInputError | null = null;

    const unsubscribe = client.onMessage((message) => {
      if (!messageBelongsToThread(message, input.thread.id, turnId)) return;

      if (isServerRequest(message)) {
        const decision = this.handleServerRequest(client, message, input, turnId);
        if (decision.event) queue.push(decision.event);
        if (decision.needsUserInput) {
          needsUserInput = decision.needsUserInput;
          if (turnId) {
            void client.request("turn/interrupt", { threadId: input.thread.id, turnId }).catch(() => undefined);
          }
          queue.close();
        }
        return;
      }

      const event = notificationToRuntimeEvent(message);
      if (message.method === "turn/started") {
        const startedTurnId = getNestedString(message.params, "turn", "id");
        if (startedTurnId) turnId = startedTurnId;
      }

      if (message.method === "item/agentMessage/delta") {
        const delta = getString(message.params, "delta");
        if (delta) assistantText += delta;
      }
      if (message.method === "error") {
        turnErrorMessage = getNestedString(message.params, "error", "message") ?? JSON.stringify(message.params ?? {});
      }

      if (event) queue.push(event);

      if (message.method === "turn/completed") {
        try {
          if (!assistantText.trim() && turnErrorMessage) throw new Error(`Codex App Server turn failed: ${turnErrorMessage}`);
          queue.push({
            type: "completed",
            message: "Codex App Server turn completed.",
            payload: parseAgentOutput(assistantText),
          });
          queue.close();
        } catch (caught) {
          queue.fail(caught instanceof Error ? caught : new Error(String(caught)));
        }
      }
    });

    try {
      const skillName = skillNameFromPath(input.skillPath);
      const absoluteSkillPath = resolve(input.thread.cwd, input.skillPath);
      const response = await client.request<{ turn?: { id?: string } }>(
        "turn/start",
        {
          threadId: input.thread.id,
          input: [
            { type: "skill", name: skillName, path: absoluteSkillPath },
            {
              type: "text",
              text: buildTurnPrompt(input),
              text_elements: [],
            },
          ],
          cwd: input.thread.cwd,
          model: codexModel(),
          approvalPolicy: "on-request",
          approvalsReviewer: "user",
          outputSchema: outputSchemaForAgent(input.agentId),
        },
        turnTimeoutMs(input.context),
      );

      turnId = response.turn?.id ?? turnId;
      if (turnId) {
        queue.push({
          type: "turn_started",
          message: `Codex turn started: ${turnId}`,
          payload: { runtimeTurnId: turnId },
        });
      }

      for await (const event of queue) {
        yield event;
      }

      if (needsUserInput) throw needsUserInput;
    } finally {
      unsubscribe();
    }
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    const client = await this.clientFor(this.cwd ?? process.cwd());
    await client.request("turn/interrupt", { threadId, turnId });
  }

  async archiveThread(threadId: string): Promise<void> {
    const client = await this.clientFor(this.cwd ?? process.cwd());
    try {
      await client.request("thread/archive", { threadId });
    } catch (error) {
      if (!(error instanceof Error) || !/no rollout found/i.test(error.message)) throw error;
    }
  }

  dispose() {
    this.client?.dispose();
    this.client = null;
    this.cwd = null;
  }

  private async clientFor(cwd: string) {
    if (!this.client || this.cwd !== cwd) {
      this.client?.dispose();
      this.client = new CodexAppServerClient({ cwd });
      this.cwd = cwd;
      await this.client.start();
    }

    return this.client;
  }

  private handleServerRequest(
    client: CodexAppServerClient,
    message: AppServerMessage,
    input: RunTurnInput,
    turnId: string | null,
  ): { event?: RuntimeEvent; needsUserInput?: NeedsUserInputError } {
    const id = message.id;
    const method = message.method ?? "unknown";
    const params = (message.params ?? {}) as JsonObject;
    if (id === undefined) return {};

    if (method === "item/commandExecution/requestApproval") {
      if (isSafeCommandRequest(params, input)) {
        client.respond(id, { decision: "accept" });
        return {
          event: {
            type: "tool",
            message: "Approved workspace-local command request.",
            payload: { method, params },
          },
        };
      }

      client.respond(id, { decision: "decline" });
      return this.needsApproval(method, params, input, turnId, "Command execution requires review.");
    }

    if (method === "item/fileChange/requestApproval") {
      if (isSafeFileChangeRequest(params, input)) {
        client.respond(id, { decision: "accept" });
        return {
          event: {
            type: "tool",
            message: "Approved workspace-local file change request.",
            payload: { method, params },
          },
        };
      }

      client.respond(id, { decision: "decline" });
      return this.needsApproval(method, params, input, turnId, "File change permission requires review.");
    }

    if (method === "item/permissions/requestApproval") {
      const permissions = buildPermissionGrant(params, input);
      if (permissions) {
        client.respond(id, { permissions, scope: "turn" });
        return {
          event: {
            type: "tool",
            message: "Approved scoped app-server permission request for this turn.",
            payload: { method, params, permissions },
          },
        };
      }

      client.respond(id, { permissions: {}, scope: "turn" });
      return this.needsApproval(method, params, input, turnId, "Permission expansion requires review.");
    }

    if (method === "execCommandApproval") {
      if (isSafeCommandRequest(params, input)) {
        client.respond(id, { decision: "approved" });
        return { event: { type: "tool", message: "Approved legacy command request.", payload: { method, params } } };
      }

      client.respond(id, { decision: "denied" });
      return this.needsApproval(method, params, input, turnId, "Legacy command execution requires review.");
    }

    if (method === "applyPatchApproval") {
      if (isSafeApplyPatchRequest(params, input)) {
        client.respond(id, { decision: "approved" });
        return { event: { type: "tool", message: "Approved workspace patch request.", payload: { method, params } } };
      }

      client.respond(id, { decision: "denied" });
      return this.needsApproval(method, params, input, turnId, "Patch application requires review.");
    }

    if (method === "item/tool/requestUserInput") {
      client.respond(id, { answers: {} });
      return this.needsApproval(method, params, input, turnId, "Codex requested user input.");
    }

    if (method === "mcpServer/elicitation/request") {
      if (isSafeMcpElicitation(params, input)) {
        client.respond(id, { action: "accept", content: {}, _meta: null });
        return {
          event: {
            type: "tool",
            message: "Approved scoped read-only browser MCP request.",
            payload: { method, params },
          },
        };
      }

      client.respond(id, { action: "decline", content: null, _meta: null });
      return this.needsApproval(method, params, input, turnId, "Connector elicitation requires review.");
    }

    if (method === "item/tool/call") {
      client.respond(id, {
        success: false,
        contentItems: [
          {
            type: "inputText",
            text: "Career OS worker has no dynamic tool implementation for this call.",
          },
        ],
      });
      return {
        event: {
          type: "warning",
          message: "Declined unsupported dynamic tool call.",
          payload: { method, params },
        },
      };
    }

    client.rejectRequest(id, -32601, `Career OS worker does not implement app-server request ${method}`);
    return this.needsApproval(method, params, input, turnId, "Unsupported app-server request requires review.");
  }

  private needsApproval(
    method: string,
    params: JsonObject,
    input: RunTurnInput,
    turnId: string | null,
    rationale: string,
  ): { event: RuntimeEvent; needsUserInput: NeedsUserInputError } {
    const approvalRequest: RuntimeApprovalRequest = {
      actionType: `codex_app_server.${method}`,
      title: `Codex approval required: ${friendlyMethodName(method)}`,
      description: rationale,
      rationale,
      riskLevel: riskForMethod(method),
      payload: {
        method,
        params,
        threadId: input.thread.id,
        turnId,
        agentContext: input.context,
      },
    };

    return {
      event: {
        type: "approval_required",
        message: approvalRequest.title,
        payload: approvalRequest,
      },
      needsUserInput: new NeedsUserInputError(approvalRequest),
    };
  }
}

export function createRuntime(kind: RuntimeProvider): AgentRuntime {
  return kind === "mock" ? new MockRuntime() : new CodexAppServerRuntime();
}

class AsyncEventQueue<T> {
  private items: T[] = [];
  private waiters: Array<() => void> = [];
  private closed = false;
  private error: Error | null = null;

  push(item: T) {
    if (this.closed) return;
    this.items.push(item);
    this.flush();
  }

  close() {
    this.closed = true;
    this.flush();
  }

  fail(error: Error) {
    this.error = error;
    this.closed = true;
    this.flush();
  }

  async *[Symbol.asyncIterator]() {
    while (true) {
      if (this.items.length > 0) {
        yield this.items.shift() as T;
        continue;
      }

      if (this.error) throw this.error;
      if (this.closed) return;

      await new Promise<void>((resolveWaiter) => this.waiters.push(resolveWaiter));
    }
  }

  private flush() {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) waiter();
  }
}

const careerOsBaseInstructions = [
  "Career OS is a personal career operating system.",
  "Supabase is the source of truth. The web UI renders structured database objects, not prose.",
  "Agents should return structured proposed mutations, evidence, warnings, approval requests, and follow-up questions.",
  "Do not send messages, post, DM, submit applications, follow accounts, or mutate external account state.",
  "For source discovery, create proposed source monitors only; the ranking and planner agents handle downstream prioritization.",
].join("\n");

const stringArrayJsonSchema = { type: "array", items: { type: "string" } };
const emptyObjectJsonSchema = { type: "object", additionalProperties: false, required: [], properties: {} };
const scoreObjectJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["relevance", "freshness", "signalDensity", "trust", "parseability", "maintenanceCost", "authBurden", "strategicValue"],
  properties: {
    relevance: { type: "number" },
    freshness: { type: "number" },
    signalDensity: { type: "number" },
    trust: { type: "number" },
    parseability: { type: "number" },
    maintenanceCost: { type: "number" },
    authBurden: { type: "number" },
    strategicValue: { type: "number" },
  },
};
const mutationPayloadJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "status",
    "labels",
    "priority",
    "sourceType",
    "url",
    "discoveryMode",
    "fetchStrategy",
    "fetchStrategyGuess",
    "schedule",
    "localPath",
    "parserScriptPath",
    "requiresAuth",
    "browserUseEnabled",
    "approvalRequired",
    "recommendation",
    "rationale",
    "sourceRationale",
    "targetSeason",
    "targetRoles",
    "targetCompanies",
    "accountHints",
    "relatedGoalIds",
    "relatedCompanyIds",
    "evidenceIds",
    "sourceCandidateId",
    "relatedSourceMonitorId",
    "sourceDiscoveryRunId",
    "query",
    "scope",
    "mode",
    "browserUseAllowed",
    "computerUseAllowed",
    "maxDurationMinutes",
    "sourceCandidatesFound",
    "sourceMonitorsCreated",
    "sourceMonitorsUpdated",
    "parserJobsQueued",
    "logPath",
    "errorMessage",
    "nextRecommendedRunAt",
    "scores",
    "evaluation",
    "metadata",
    "payload",
  ],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    status: { type: "string" },
    labels: stringArrayJsonSchema,
    priority: { type: "number" },
    sourceType: { type: "string" },
    url: { type: "string" },
    discoveryMode: { type: "string" },
    fetchStrategy: { type: "string" },
    fetchStrategyGuess: { type: "string" },
    schedule: { type: "string" },
    localPath: { type: "string" },
    parserScriptPath: { type: "string" },
    requiresAuth: { type: "boolean" },
    browserUseEnabled: { type: "boolean" },
    approvalRequired: { type: "boolean" },
    recommendation: { type: "string" },
    rationale: { type: "string" },
    sourceRationale: { type: "string" },
    targetSeason: { type: "string" },
    targetRoles: stringArrayJsonSchema,
    targetCompanies: stringArrayJsonSchema,
    accountHints: stringArrayJsonSchema,
    relatedGoalIds: stringArrayJsonSchema,
    relatedCompanyIds: stringArrayJsonSchema,
    evidenceIds: stringArrayJsonSchema,
    sourceCandidateId: { type: "string" },
    relatedSourceMonitorId: { type: "string" },
    sourceDiscoveryRunId: { type: "string" },
    query: { type: "string" },
    scope: stringArrayJsonSchema,
    mode: { type: "string" },
    browserUseAllowed: { type: "boolean" },
    computerUseAllowed: { type: "boolean" },
    maxDurationMinutes: { type: "number" },
    sourceCandidatesFound: { type: "number" },
    sourceMonitorsCreated: { type: "number" },
    sourceMonitorsUpdated: { type: "number" },
    parserJobsQueued: { type: "number" },
    logPath: { type: "string" },
    errorMessage: { type: "string" },
    nextRecommendedRunAt: { type: "string" },
    scores: scoreObjectJsonSchema,
    evaluation: scoreObjectJsonSchema,
    metadata: emptyObjectJsonSchema,
    payload: emptyObjectJsonSchema,
  },
};

const agentOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "proposedMutations", "approvalRequests", "evidence", "followUpQuestions", "warnings"],
  properties: {
    summary: { type: "string" },
    proposedMutations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "mutationType",
          "targetObjectType",
          "targetObjectId",
          "payload",
          "rationale",
          "evidenceIds",
          "confidence",
          "approvalPolicy",
        ],
        properties: {
          id: { type: "string" },
          mutationType: { type: "string" },
          targetObjectType: { type: "string" },
          targetObjectId: { type: "string" },
          payload: mutationPayloadJsonSchema,
          rationale: { type: "string" },
          evidenceIds: stringArrayJsonSchema,
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          approvalPolicy: {
            type: "string",
            enum: ["auto_apply", "approval_required", "never_auto_apply"],
          },
        },
      },
    },
    approvalRequests: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "actionType",
          "title",
          "description",
          "targetObjectType",
          "targetObjectId",
          "rationale",
          "riskLevel",
          "payload",
          "evidenceIds",
        ],
        properties: {
          actionType: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          targetObjectType: { type: "string" },
          targetObjectId: { type: "string" },
          rationale: { type: "string" },
          riskLevel: { type: "string", enum: ["low", "medium", "high"] },
          payload: emptyObjectJsonSchema,
          evidenceIds: stringArrayJsonSchema,
        },
      },
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "sourceType", "id", "sourceUrl", "excerpt", "payload"],
        properties: {
          title: { type: "string" },
          sourceType: { type: "string" },
          id: { type: "string" },
          sourceUrl: { type: "string" },
          excerpt: { type: "string" },
          payload: emptyObjectJsonSchema,
        },
      },
    },
    followUpQuestions: stringArrayJsonSchema,
    warnings: stringArrayJsonSchema,
  },
};

function buildTurnPrompt(input: RunTurnInput) {
  return [
    "Run the selected Career OS agent turn.",
    "Return exactly one JSON object matching the supplied output schema. Do not wrap it in markdown fences.",
    "Every proposed mutation id must be a UUID.",
    "Use canonical snake_case object types such as 'source_monitor', not UI names like 'SourceMonitor'.",
    "Use only mutation types registered for the selected agent contract.",
    "Every auto-applied mutation must include a deterministic idempotencyKey; updates must include expectedObjectVersion.",
    "Use approvalPolicy 'auto_apply' only for safe internal Career OS database proposals. Use 'approval_required' for external or irreversible actions.",
    "If you cannot complete the task, return a valid JSON object with warnings and followUpQuestions.",
    `User/task prompt:\n${input.prompt || "(no prompt supplied)"}`,
    `Career OS context JSON:\n${JSON.stringify(input.context, null, 2)}`,
  ].join("\n\n");
}

function turnTimeoutMs(context: JsonObject) {
  const minutes = typeof context.maxDurationMinutes === "number" ? context.maxDurationMinutes : 20;
  return Math.max(5, Math.min(minutes, 90)) * 60_000;
}

function outputSchemaForAgent(agentId: string) {
  const normalized = normalizeAgentId(agentId);
  return normalized ? z.toJSONSchema(agentSchemas[normalized].output) : agentOutputJsonSchema;
}

function codexModel() {
  return process.env.CAREER_OS_CODEX_MODEL || undefined;
}

function careerOsMcpConfig(cwd: string, agentId?: string) {
  const gatewayUrl = process.env.CAREER_OS_GATEWAY_URL ?? "http://localhost:3000";
  const dataDir = process.env.CAREER_OS_DATA_DIR ?? process.env.LOCALAPPDATA;
  if (!dataDir) throw new Error("CAREER_OS_DATA_DIR or LOCALAPPDATA is required to launch the Career OS MCP server.");
  const mcpServers: JsonObject = {
      career_os: {
        command: process.execPath,
        args: [resolve(cwd, "node_modules/tsx/dist/cli.mjs"), resolve(cwd, "apps/worker/src/mcp-server.ts")],
        env: {
          CAREER_OS_GATEWAY_URL: gatewayUrl,
          CAREER_OS_DATA_DIR: dataDir,
        },
        startup_timeout_sec: 20,
        tool_timeout_sec: 30,
      },
  };
  const contract = agentId ? getAgentContract(agentId) : null;
  if (contract?.allowedCapabilities.includes("browser_read")) {
    const profile = resolve(dataDir, "CareerOS", "chrome-profile");
    const output = resolve(dataDir, "CareerOS", "workspace", "evidence", "browser");
    mcpServers.playwright = {
      command: process.execPath,
      args: [resolve(cwd, "node_modules/@playwright/mcp/cli.js"), "--browser", "chrome", "--user-data-dir", profile, "--output-dir", output, "--block-service-workers", "--codegen", "none", "--init-script", resolve(cwd, "apps/worker/src/browser-final-submit-guard.js")],
      startup_timeout_sec: 30,
      tool_timeout_sec: 60,
    };
  }
  return { mcp_servers: mcpServers };
}

function parseAgentOutput(text: string): JsonObject {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Codex completed without a structured final message.");
  }

  const candidates = [
    trimmed,
    fencedJson(trimmed),
    substringJson(trimmed),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return normalizeAgentOutput(parsed as JsonObject);
    } catch {
      // Try the next extraction strategy.
    }
  }

  throw new Error("Codex final message was not valid Career OS JSON.");
}

function normalizeAgentOutput(output: JsonObject) {
  const normalized = { ...output };

  normalized.proposedMutations = Array.isArray(output.proposedMutations)
    ? output.proposedMutations.map((item) => normalizeProposedMutation(stripEmptyOptionalFields(item, ["targetObjectId"])))
    : [];
  normalized.approvalRequests = Array.isArray(output.approvalRequests)
    ? output.approvalRequests.map((item) => stripEmptyOptionalFields(item, ["targetObjectType", "targetObjectId"]))
    : [];
  normalized.evidence = Array.isArray(output.evidence)
    ? output.evidence.map((item) => normalizeEvidence(stripEmptyOptionalFields(item, ["id", "sourceUrl", "excerpt"])))
    : [];
  normalized.followUpQuestions = Array.isArray(output.followUpQuestions) ? output.followUpQuestions : [];
  normalized.warnings = Array.isArray(output.warnings) ? output.warnings : [];

  return normalized;
}

function normalizeEvidence(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const evidence = { ...(value as JsonObject) };
  const id = getString(evidence, "id");
  evidence.id = id && isUuid(id) ? id : randomUUID();
  return evidence;
}

function normalizeProposedMutation(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const mutation = { ...(value as JsonObject) };
  const payload = mutation.payload && typeof mutation.payload === "object" && !Array.isArray(mutation.payload)
    ? { ...(mutation.payload as JsonObject) }
    : {};

  const targetObjectType = normalizeObjectType(getString(mutation, "targetObjectType"));
  if (targetObjectType) mutation.targetObjectType = targetObjectType;

  const mutationType = getString(mutation, "mutationType");
  if ((mutationType === "create" || mutationType === "create_proposal") && targetObjectType === "source_monitor") {
    mutation.mutationType = "source_monitor.create_proposal";
  }
  if ((mutationType === "create" || mutationType === "create_proposal") && targetObjectType === "source_candidate") {
    mutation.mutationType = "source_candidate.create";
  }
  if ((mutationType === "create" || mutationType === "create_proposal") && targetObjectType === "source_discovery_run") {
    mutation.mutationType = "source_discovery_run.create";
  }

  payload.fetchStrategy = normalizeFetchStrategy(getString(payload, "fetchStrategy"), getString(payload, "sourceType"));
  payload.fetchStrategyGuess = normalizeFetchStrategy(getString(payload, "fetchStrategyGuess"), getString(payload, "sourceType"));
  payload.discoveryMode = normalizeDiscoveryMode(getString(payload, "discoveryMode"));
  payload.mode = normalizeDiscoveryMode(getString(payload, "mode"));
  mutation.payload = payload;

  return mutation;
}

function normalizeObjectType(value: string | undefined) {
  if (!value) return undefined;
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
  const aliases: Record<string, string> = {
    sourcemonitor: "source_monitor",
    source_monitor: "source_monitor",
    sourcecandidate: "source_candidate",
    source_candidate: "source_candidate",
    sourcediscoveryrun: "source_discovery_run",
    source_discovery_run: "source_discovery_run",
  };
  return aliases[spaced] ?? aliases[spaced.replace(/_/g, "")] ?? spaced;
}

function normalizeFetchStrategy(value: string | undefined, sourceType: string | undefined) {
  const allowed = new Set(["http", "git_pull", "browser", "manual", "api"]);
  if (sourceType === "github_repo") return "git_pull";
  if (sourceType === "social_account") return "browser";
  if (value && allowed.has(value)) return value;
  return "manual";
}

function normalizeDiscoveryMode(value: string | undefined) {
  const allowed = new Set(["onboarding", "scheduled", "manual", "repair"]);
  return value && allowed.has(value) ? value : "manual";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stripEmptyOptionalFields(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = { ...(value as JsonObject) };
  for (const key of keys) {
    if (record[key] === "" || record[key] === null) delete record[key];
  }
  return record;
}

function fencedJson(text: string) {
  return text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
}

function substringJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function notificationToRuntimeEvent(message: AppServerMessage): RuntimeEvent | null {
  const method = message.method;
  const params = message.params ?? {};

  if (method === "career-os/stderr") {
    return { type: "warning", message: getString(params, "text") ?? "codex app-server stderr", payload: params };
  }
  if (method === "career-os/protocol-error" || method === "career-os/exit") {
    return { type: "warning", message: method, payload: params };
  }
  if (method === "turn/started") {
    const turnId = getNestedString(params, "turn", "id");
    return { type: "turn_started", message: `Codex turn started: ${turnId ?? "unknown"}`, payload: { runtimeTurnId: turnId, raw: params } };
  }
  if (method === "item/agentMessage/delta") {
    return { type: "message", message: getString(params, "delta") ?? "", payload: params };
  }
  if (method === "item/started") {
    return { type: "tool", message: "Codex item started.", payload: params };
  }
  if (method === "item/completed") {
    return { type: "tool", message: "Codex item completed.", payload: params };
  }
  if (method === "item/commandExecution/outputDelta") {
    return { type: "tool", message: getString(params, "delta") ?? "Command output.", payload: params };
  }
  if (method === "turn/completed") {
    return { type: "tool", message: "Codex turn reported completion.", payload: params };
  }
  if (method === "error" || method === "configWarning" || method === "deprecationNotice") {
    return { type: "warning", message: method, payload: params };
  }

  return null;
}

function isServerRequest(message: AppServerMessage) {
  return message.id !== undefined && Boolean(message.method);
}

function messageBelongsToThread(message: AppServerMessage, threadId: string, turnId: string | null) {
  const params = message.params ?? {};
  const messageThreadId = getString(params, "threadId");
  if (messageThreadId && messageThreadId !== threadId) return false;

  const messageTurnId = getString(params, "turnId") ?? getNestedString(params, "turn", "id");
  if (turnId && messageTurnId && messageTurnId !== turnId) return false;

  return true;
}

function isSafeCommandRequest(params: JsonObject, input: RunTurnInput) {
  const command = getString(params, "command") ?? getString(params, "cmd") ?? "";
  const requestCwd = getString(params, "cwd") ?? input.thread.cwd;
  if (!isSafePath(requestCwd, input.thread.cwd) || !command) return false;
  const capabilities = new Set(stringList(input.context.requiredCapabilities));
  const first = command.trim().match(/^(?:&\s*)?(?:["']?[^"'\s\\/]+["']?[\\/])?([a-zA-Z][\w.-]*)/)?.[1]?.toLowerCase();
  if (!first) return false;
  if (capabilities.has("read_files") && new Set(["rg", "get-content", "get-childitem", "resolve-path", "test-path"]).has(first)) return true;
  if (capabilities.has("latex_compile") && new Set(["latexmk", "pdflatex", "xelatex", "lualatex", "biber"]).has(first)) return true;
  return false;
}

function isSafeFileChangeRequest(params: JsonObject, input: RunTurnInput) {
  if (!stringList(input.context.requiredCapabilities).includes("write_workspace")) return false;
  const grantRoot = getString(params, "grantRoot");
  return Boolean(grantRoot && isSafeWritablePath(grantRoot, input.thread.cwd));
}

function isSafeApplyPatchRequest(params: JsonObject, input: RunTurnInput) {
  if (!stringList(input.context.requiredCapabilities).includes("write_workspace")) return false;
  const requestCwd = getString(params, "cwd") ?? input.thread.cwd;
  return isSafeWritablePath(requestCwd, input.thread.cwd);
}

function isSafeWritablePath(candidate: string, cwd: string) {
  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(cwd, candidate);
  const localRoot = resolve(process.env.LOCALAPPDATA ?? tmpdir(), "CareerOS", "workspace");
  return isInside(localRoot, absolute) || isInside(resolve(cwd, "career-os-workspace"), absolute) || isInside(tmpdir(), absolute);
}

function isSafeMcpElicitation(params: JsonObject, input: RunTurnInput) {
  const capabilities = stringList(input.context.requiredCapabilities);
  const allowInteractive = capabilities.includes("browser_read") || capabilities.includes("browser_fill_after_approval");
  if (!allowInteractive) return false;

  const serverName = getString(params, "serverName")?.toLowerCase();
  if (!serverName || !["playwright", "browser"].includes(serverName)) return false;

  const toolName = mcpToolName(params);
  if (!toolName) return false;

  const readOnlyTools = new Set([
    "browser_tabs",
    "browser_navigate",
    "browser_snapshot",
    "browser_take_screenshot",
    "browser_screenshot",
    "browser_resize",
    "browser_wait",
    "browser_console_messages",
    "browser_network_requests",
    "browser_click",
    "browser_type",
    "browser_fill_form",
  ]);
  if (!readOnlyTools.has(toolName)) return false;

  const toolParams = mcpToolParams(params);
  const url = getString(toolParams, "url");
  if (url && !isSafeBrowserUrl(url)) return false;
  if (["browser_click", "browser_type", "browser_fill_form"].includes(toolName)) {
    const description = JSON.stringify(toolParams ?? {}).toLowerCase();
    if (!description || (toolName === "browser_click" && /\b(send|submit|apply|follow|like|comment|post|purchase|checkout|register|confirm)\b/.test(description))) return false;
    if (!capabilities.includes("browser_fill_after_approval") && /\b(password|message|dm|comment|post)\b/.test(description)) return false;
    if (/\bpassword\b/.test(description)) return false;
  }

  return true;
}

function mcpToolName(params: JsonObject) {
  const meta = recordValue(params, "_meta");
  const explicit = getString(meta, "tool") ?? getString(meta, "tool_name") ?? getString(meta, "toolName");
  if (explicit) return explicit;

  const message = getString(params, "message") ?? "";
  return message.match(/tool\s+"([^"]+)"/i)?.[1];
}

function mcpToolParams(params: JsonObject) {
  const meta = recordValue(params, "_meta");
  return recordValue(meta, "tool_params");
}

function isSafeBrowserUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function buildPermissionGrant(params: JsonObject, input: RunTurnInput) {
  const permissions = params.permissions as JsonObject | undefined;
  if (!permissions || typeof permissions !== "object") return null;

  const capabilities = stringList(input.context.requiredCapabilities);
  const allowInteractive = capabilities.includes("browser_read") || capabilities.includes("browser_fill_after_approval");
  const network = permissions.network as JsonObject | null | undefined;
  const fileSystem = permissions.fileSystem as JsonObject | null | undefined;
  const granted: JsonObject = {};

  if (network) {
    if (!allowInteractive) return null;
    granted.network = network;
  }

  if (fileSystem) {
    const read = stringList(fileSystem.read);
    const write = stringList(fileSystem.write);
    if (![...read, ...write].every((path) => isSafePath(path, input.thread.cwd))) return null;
    granted.fileSystem = fileSystem;
  }

  return Object.keys(granted).length > 0 ? granted : null;
}

function isSafePath(candidate: string, cwd: string) {
  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(cwd, candidate);
  return isInside(cwd, absolute) || isInside(tmpdir(), absolute);
}

function isInside(parent: string, child: string) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function recordValue(payload: JsonObject | undefined, key: string) {
  const value = payload?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined;
}

function skillNameFromPath(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-2) ?? path.split(/[\\/]/).pop() ?? "career-agent";
}

function friendlyMethodName(method: string) {
  return method.replace(/^item\//, "").replace(/^mcpServer\//, "").replace(/[/.]/g, " ");
}

function riskForMethod(method: string): "low" | "medium" | "high" {
  if (method.includes("command") || method.includes("permissions")) return "medium";
  if (method.includes("tool/requestUserInput") || method.includes("elicitation")) return "medium";
  return "low";
}

export function getString(payload: JsonObject | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function getNestedString(payload: JsonObject | undefined, parent: string, key: string) {
  const nested = payload?.[parent];
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return undefined;
  return getString(nested as JsonObject, key);
}
