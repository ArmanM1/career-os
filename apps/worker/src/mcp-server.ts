#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { loadDeviceCredentials } from "./device-credentials";
import { readWorkerEnv } from "./env";
import { WorkerGatewayClient } from "./gateway-client";

const env = readWorkerEnv();
const gateway = new WorkerGatewayClient(env.gatewayUrl, loadDeviceCredentials(env.dataDir));
const server = new McpServer({ name: "career-os", version: "1.0.0" });
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const proposal = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

function result(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function register(name: string, description: string, inputSchema: Record<string, z.ZodType>, annotations: typeof readOnly | typeof proposal) {
  server.registerTool(name, { description, inputSchema, annotations }, async (input) => {
    if (name === "career.artifact.create") await uploadLocalArtifact(input as Record<string, unknown>);
    const response = await gateway.mcp(name, input as Record<string, unknown>);
    return result(response.result);
  });
}

async function uploadLocalArtifact(input: Record<string, unknown>) {
  const localPathValue = typeof input.localPath === "string" ? input.localPath : null;
  if (!localPathValue) return;
  const workspace = resolve(env.dataDir, "workspace");
  const localPath = isAbsolute(localPathValue) ? resolve(localPathValue) : resolve(workspace, localPathValue);
  const rel = relative(workspace, localPath);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Artifact upload path is outside the Career OS workspace.");
  const bytes = await readFile(localPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (typeof input.sha256 !== "string" || input.sha256.toLowerCase() !== sha256) throw new Error("Artifact checksum does not match the local file.");
  const bucket = String(input.bucket ?? "");
  const storagePath = String(input.storagePath ?? "");
  const upload = await gateway.artifactUploadUrl(bucket, storagePath);
  const response = await fetch(upload.signedUrl, { method: "PUT", headers: { "content-type": String(input.mimeType ?? "application/octet-stream"), "x-upsert": "false" }, body: bytes, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Artifact upload failed (${response.status}).`);
}

register("career.state.current", "Read the freshly assembled, versioned CurrentStateBundle for this user.", {}, readOnly);
register("career.profile.read", "Read the active career profile.", {}, readOnly);
const listInput = { status: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) };
register("career.goals.list", "List current goals.", listInput, readOnly);
register("career.tasks.list", "List tasks and next actions.", listInput, readOnly);
register("career.opportunities.list", "List normalized opportunities.", listInput, readOnly);
register("career.applications.list", "List application pipeline records.", listInput, readOnly);
register("career.contacts.list", "List contacts and mentors.", listInput, readOnly);
register("career.events.list", "List career events.", listInput, readOnly);
register("career.resumes.read", "Read resume versions and generated variants.", { limit: z.number().int().min(1).max(200).default(50) }, readOnly);
register("career.sources.list", "List configured source monitors and health.", listInput, readOnly);
register("career.evidence.read", "Read one evidence record and provenance.", { id: z.uuid() }, readOnly);
register("career.thread.read", "Read a persisted user-facing thread and visible messages.", { id: z.uuid() }, readOnly);
register("career.search", "Search Career OS opportunities, contacts, experiences, and messages.", { query: z.string().min(2).max(200), limit: z.number().int().min(1).max(50).default(20) }, readOnly);

register("career.mutations.propose", "Persist a typed internal mutation proposal. This never performs an external action.", {
  id: z.uuid().optional(),
  idempotencyKey: z.string().min(1).max(200),
  mutationType: z.string().min(1),
  targetObjectType: z.string().min(1),
  targetObjectId: z.uuid().optional(),
  payload: z.record(z.string(), z.unknown()),
  rationale: z.string().min(1),
  evidenceIds: z.array(z.uuid()).default([]),
  confidence: z.enum(["low", "medium", "high"]),
  expectedObjectVersion: z.number().int().positive().optional(),
}, proposal);

register("career.approvals.request", "Create an explicit user approval request for an allowed approval-gated action.", {
  title: z.string().min(1),
  actionType: z.string().min(1),
  rationale: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high"]),
  payload: z.record(z.string(), z.unknown()),
  targetObjectType: z.string().optional(),
  targetObjectId: z.uuid().optional(),
  evidenceIds: z.array(z.uuid()).default([]),
}, proposal);

register("career.evidence.create", "Create a provenance record for an observed fact.", {
  title: z.string().min(1), sourceType: z.string().min(1), sourceUrl: z.url().optional(), excerpt: z.string().max(10_000).optional(), payload: z.record(z.string(), z.unknown()).default({}), artifactId: z.uuid().optional(), expiresAt: z.iso.datetime().optional(), retentionPolicy: z.string().default("facts_persist_raw_30_days"),
}, proposal);

register("career.artifact.create", "Register an already-uploaded private artifact inside the user's storage namespace.", {
  title: z.string().min(1), artifactType: z.string().min(1), bucket: z.enum(["resume-sources", "resume-artifacts", "thread-attachments", "evidence", "exports"]), storagePath: z.string().min(1), localPath: z.string().min(1), mimeType: z.string().optional(), sizeBytes: z.number().int().nonnegative().optional(), sha256: z.string().regex(/^[a-f0-9]{64}$/i), origin: z.string().min(1), retentionPolicy: z.string().default("canonical"),
}, proposal);

register("career.jobs.enqueue", "Enqueue a typed downstream Career OS agent job.", {
  agentId: z.string().min(1), title: z.string().min(1), inputType: z.string().min(1), input: z.record(z.string(), z.unknown()).default({}), prompt: z.string().optional(), relatedObjectIds: z.array(z.uuid()).default([]), requiredCapabilities: z.array(z.string()).default([]), priority: z.number().int().min(0).max(100).default(50), scheduledFor: z.iso.datetime().optional(), dedupeKey: z.string().optional(),
}, proposal);

await server.connect(new StdioServerTransport());
