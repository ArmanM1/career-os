import { NextResponse } from "next/server";
import { getAgentContract, mutationRegistry } from "@career-os/core";
import { z } from "zod";
import { assembleCurrentState } from "@/lib/current-state";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateWorker, workerUnauthorized } from "@/lib/worker-auth";
import { toJson } from "@/lib/json";

const toolSchema = z.enum([
  "career.state.current",
  "career.profile.read",
  "career.goals.list",
  "career.tasks.list",
  "career.opportunities.list",
  "career.applications.list",
  "career.contacts.list",
  "career.events.list",
  "career.resumes.read",
  "career.sources.list",
  "career.evidence.read",
  "career.thread.read",
  "career.search",
  "career.mutations.propose",
  "career.approvals.request",
  "career.evidence.create",
  "career.artifact.create",
  "career.jobs.enqueue",
]);

const requestSchema = z.object({
  tool: toolSchema,
  arguments: z.record(z.string(), z.unknown()).default({}),
  context: z.object({ jobId: z.uuid(), agentId: z.string().min(1) }),
});
const listSchema = z.object({ status: z.string().optional(), limit: z.coerce.number().int().min(1).max(200).default(50) });
const idSchema = z.object({ id: z.uuid() });
const mutationSchema = z.object({
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
});
const approvalSchema = z.object({ title: z.string().min(1), actionType: z.string().min(1), rationale: z.string().min(1), riskLevel: z.enum(["low", "medium", "high"]), payload: z.record(z.string(), z.unknown()), targetObjectType: z.string().optional(), targetObjectId: z.uuid().optional(), evidenceIds: z.array(z.uuid()).default([]) });
const evidenceSchema = z.object({ title: z.string().min(1), sourceType: z.string().min(1), sourceUrl: z.url().optional(), excerpt: z.string().max(10_000).optional(), payload: z.record(z.string(), z.unknown()).default({}), artifactId: z.uuid().optional(), expiresAt: z.iso.datetime().optional(), retentionPolicy: z.string().default("facts_persist_raw_30_days") });
const artifactSchema = z.object({ title: z.string().min(1), artifactType: z.string().min(1), bucket: z.enum(["resume-sources", "resume-artifacts", "thread-attachments", "evidence", "exports"]), storagePath: z.string().min(1), localPath: z.string().optional(), mimeType: z.string().optional(), sizeBytes: z.number().int().nonnegative().optional(), sha256: z.string().regex(/^[a-f0-9]{64}$/i), origin: z.string().min(1), retentionPolicy: z.string().default("canonical") });
const jobSchema = z.object({ agentId: z.string().min(1), title: z.string().min(1), inputType: z.string().min(1), input: z.record(z.string(), z.unknown()).default({}), prompt: z.string().optional(), relatedObjectIds: z.array(z.uuid()).default([]), requiredCapabilities: z.array(z.string()).default([]), priority: z.number().int().min(0).max(100).default(50), scheduledFor: z.iso.datetime().optional(), dedupeKey: z.string().optional() });

export async function POST(request: Request) {
  const device = await authenticateWorker(request);
  if (!device) return workerUnauthorized();
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid MCP tool request" }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const { data: job } = await admin
    .from("agent_jobs")
    .select("id,agent_id,status,required_capabilities")
    .eq("id", parsed.data.context.jobId)
    .eq("user_id", device.userId)
    .eq("claimed_by_device_id", device.id)
    .eq("status", "running")
    .maybeSingle();
  if (!job || job.agent_id !== parsed.data.context.agentId)
    return NextResponse.json({ error: "MCP scope does not match the active claimed job" }, { status: 403 });
  const contract = getAgentContract(job.agent_id);
  if (!contract || !toolAllowedForJob(parsed.data.tool, contract.allowedCapabilities, job.required_capabilities))
    return NextResponse.json({ error: "This agent job is not allowed to use that Career OS tool" }, { status: 403 });

  try {
    const result = await callTool(device.userId, job.agent_id, parsed.data.tool, parsed.data.arguments);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP tool failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function toolAllowedForJob(tool: z.infer<typeof toolSchema>, allowedCapabilities: readonly string[], requiredCapabilities: string[]) {
  if (tool === "career.jobs.enqueue") return allowedCapabilities.includes("enqueue_jobs");
  if (tool === "career.artifact.create") return allowedCapabilities.includes("write_workspace") && requiredCapabilities.includes("write_workspace");
  if (["career.mutations.propose", "career.approvals.request", "career.evidence.create"].includes(tool)) return allowedCapabilities.includes("propose_mutations");
  return allowedCapabilities.includes("read_state");
}

async function callTool(userId: string, agentId: string, tool: z.infer<typeof toolSchema>, input: Record<string, unknown>) {
  const admin = getSupabaseAdminClient();
  if (tool === "career.state.current") return assembleCurrentState(userId);
  if (tool === "career.profile.read") return single(admin.from("profiles").select("*").eq("user_id", userId).maybeSingle());
  if (tool === "career.goals.list") return list(admin, "goals", userId, input);
  if (tool === "career.tasks.list") return list(admin, "tasks", userId, input);
  if (tool === "career.opportunities.list") return list(admin, "opportunities", userId, input);
  if (tool === "career.applications.list") return list(admin, "applications", userId, input);
  if (tool === "career.contacts.list") return list(admin, "contacts", userId, input);
  if (tool === "career.events.list") return list(admin, "events", userId, input);
  if (tool === "career.sources.list") return list(admin, "source_monitors", userId, input);

  if (tool === "career.resumes.read") {
    const limit = listSchema.parse(input).limit;
    const [{ data: versions, error: versionsError }, { data: variants, error: variantsError }] = await Promise.all([
      admin.from("resume_versions").select("*").eq("user_id", userId).is("archived_at", null).order("updated_at", { ascending: false }).limit(limit),
      admin.from("resume_variants").select("*").eq("user_id", userId).is("archived_at", null).order("updated_at", { ascending: false }).limit(limit),
    ]);
    if (versionsError || variantsError) throw new Error("Unable to read resumes");
    return { versions: versions ?? [], variants: variants ?? [] };
  }

  if (tool === "career.evidence.read") {
    const { id } = idSchema.parse(input);
    return single(admin.from("evidence").select("*").eq("user_id", userId).eq("id", id).maybeSingle());
  }

  if (tool === "career.thread.read") {
    const { id } = idSchema.parse(input);
    const [{ data: thread, error: threadError }, { data: messages, error: messagesError }] = await Promise.all([
      admin.from("threads").select("*").eq("user_id", userId).eq("id", id).maybeSingle(),
      admin.from("messages").select("id,role,content,status,created_at").eq("user_id", userId).eq("thread_id", id).order("created_at"),
    ]);
    if (threadError || messagesError) throw new Error("Unable to read thread");
    return { thread, messages: messages ?? [] };
  }

  if (tool === "career.search") return search(userId, input);

  if (tool === "career.mutations.propose") {
    const mutation = mutationSchema.parse(input);
    const registryEntry = mutationRegistry[mutation.mutationType as keyof typeof mutationRegistry];
    if (!registryEntry) throw new Error(`Unsupported mutation type: ${mutation.mutationType}`);
    if (!registryEntry.owners.includes(agentId as never)) throw new Error(`${agentId} cannot propose ${mutation.mutationType}`);
    const payload = registryEntry.payloadSchema.parse(mutation.payload);
    const { data, error } = await admin.from("proposed_mutations").upsert({
      id: mutation.id,
      user_id: userId,
      idempotency_key: mutation.idempotencyKey,
      mutation_type: mutation.mutationType,
      target_object_type: mutation.targetObjectType,
      target_object_id: mutation.targetObjectId,
      payload: toJson(payload),
      rationale: mutation.rationale,
      evidence_ids: mutation.evidenceIds,
      confidence: mutation.confidence,
      expected_object_version: mutation.expectedObjectVersion,
      approval_policy: registryEntry.approvalPolicy,
      status: "pending",
      created_by: "agent",
      updated_by: "agent",
    }, { onConflict: "user_id,idempotency_key", ignoreDuplicates: true }).select().maybeSingle();
    if (error) throw new Error("Unable to persist mutation proposal");
    return data;
  }

  if (tool === "career.approvals.request") {
    const value = approvalSchema.parse(input);
    const { data, error } = await admin.from("approval_requests").insert({ user_id: userId, title: value.title, action_type: value.actionType, rationale: value.rationale, risk_level: value.riskLevel, payload: toJson(value.payload), target_object_type: value.targetObjectType, target_object_id: value.targetObjectId, evidence_ids: value.evidenceIds, created_by: "agent", updated_by: "agent" }).select().single();
    if (error) throw new Error("Unable to create approval request");
    return data;
  }

  if (tool === "career.evidence.create") {
    const value = evidenceSchema.parse(input);
    const { data, error } = await admin.from("evidence").insert({ user_id: userId, title: value.title, source_type: value.sourceType, source_url: value.sourceUrl, excerpt: value.excerpt, payload: toJson(value.payload), artifact_id: value.artifactId, expires_at: value.expiresAt, retention_policy: value.retentionPolicy, created_by: "agent", updated_by: "agent" }).select().single();
    if (error) throw new Error("Unable to create evidence");
    return data;
  }

  if (tool === "career.artifact.create") {
    const value = artifactSchema.parse(input);
    if (!value.storagePath.startsWith(`${userId}/`) || value.storagePath.includes("..")) throw new Error("Artifact path must be inside the user namespace");
    const { data, error } = await admin.from("artifacts").insert({ user_id: userId, title: value.title, artifact_type: value.artifactType, bucket: value.bucket, storage_path: value.storagePath, local_path: value.localPath, mime_type: value.mimeType, size_bytes: value.sizeBytes, sha256: value.sha256, origin: value.origin, retention_policy: value.retentionPolicy, created_by: "agent", updated_by: "agent" }).select().single();
    if (error) throw new Error("Unable to create artifact record");
    return data;
  }

  const value = jobSchema.parse(input);
  const { data, error } = await admin.from("agent_jobs").upsert({ user_id: userId, agent_id: value.agentId, title: value.title, input_type: value.inputType, input: toJson(value.input), prompt: value.prompt, related_object_ids: value.relatedObjectIds, required_capabilities: value.requiredCapabilities, priority: value.priority, scheduled_for: value.scheduledFor ?? new Date().toISOString(), dedupe_key: value.dedupeKey, created_by: "agent", updated_by: "agent" }, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }).select().maybeSingle();
  if (error) throw new Error("Unable to enqueue agent job");
  return data;
}

async function single(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

async function list(admin: ReturnType<typeof getSupabaseAdminClient>, table: "goals" | "tasks" | "opportunities" | "applications" | "contacts" | "events" | "source_monitors", userId: string, input: Record<string, unknown>) {
  const options = listSchema.parse(input);
  let query = admin.from(table).select("*").eq("user_id", userId).is("archived_at", null).order("updated_at", { ascending: false }).limit(options.limit);
  if (options.status) query = query.eq("status", options.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function search(userId: string, input: Record<string, unknown>) {
  const { query, limit } = z.object({ query: z.string().min(2).max(200), limit: z.coerce.number().int().min(1).max(50).default(20) }).parse(input);
  const admin = getSupabaseAdminClient();
  const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const [opportunities, contacts, experiences, messages] = await Promise.all([
    admin.from("opportunities").select("id,title,company_name,status,updated_at").eq("user_id", userId).ilike("title", pattern).limit(limit),
    admin.from("contacts").select("id,full_name,company_name,status,updated_at").eq("user_id", userId).ilike("full_name", pattern).limit(limit),
    admin.from("experiences").select("id,title,organization,status,updated_at").eq("user_id", userId).ilike("title", pattern).limit(limit),
    admin.from("messages").select("id,thread_id,role,content,created_at").eq("user_id", userId).ilike("content", pattern).limit(limit),
  ]);
  const failed = [opportunities, contacts, experiences, messages].find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  return { opportunities: opportunities.data ?? [], contacts: contacts.data ?? [], experiences: experiences.data ?? [], messages: messages.data ?? [] };
}
