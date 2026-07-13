"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toJson } from "@/lib/json";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

const privateBuckets = ["resume-sources", "resume-artifacts", "thread-attachments", "evidence", "exports"] as const;

async function executeApprovedExport(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, approvalId: string, approvalPayload: unknown) {
  const { data, error } = await supabase.rpc("export_career_os_data", { p_user_id: userId });
  if (error) throw new Error(`Unable to assemble data export: ${error.message}`);
  const bytes = Buffer.from(JSON.stringify(data, null, 2), "utf8");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `${userId}/career-os-export-${timestamp}.json`;
  const admin = getSupabaseAdminClient();
  const upload = await admin.storage.from("exports").upload(storagePath, bytes, { contentType: "application/json", upsert: false });
  if (upload.error) throw new Error(`Unable to store data export: ${upload.error.message}`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const title = `Career OS export ${new Date().toLocaleDateString("en-US")}`;
  const { data: artifact, error: artifactError } = await admin.from("artifacts").insert({
    user_id: userId,
    title,
    status: "active",
    artifact_type: "account_export",
    bucket: "exports",
    storage_path: storagePath,
    mime_type: "application/json",
    size_bytes: bytes.length,
    sha256,
    origin: "approved_export",
    retention_policy: "user_managed",
    metadata: { approvalId, excludes: ["oauth_credentials", "oauth_states", "worker_devices", "worker_pairing_codes"] },
    created_by: "system",
    updated_by: "system",
  }).select("id").single();
  if (artifactError || !artifact) {
    await admin.storage.from("exports").remove([storagePath]);
    throw new Error(`Unable to record data export: ${artifactError?.message ?? "unknown error"}`);
  }
  const payload = approvalPayload && typeof approvalPayload === "object" && !Array.isArray(approvalPayload) ? approvalPayload as Record<string, unknown> : {};
  await admin.from("approval_requests").update({ status: "executed", executed_at: new Date().toISOString(), payload: toJson({ ...payload, artifactId: artifact.id }), updated_by: "system" }).eq("id", approvalId).eq("user_id", userId);
  await admin.from("audit_log_entries").insert({ user_id: userId, action_type: "sensitive_data.exported", target_object_type: "artifact", target_object_id: artifact.id, summary: "Private Career OS data export created", payload: { approvalId, sha256 }, created_by: "system", updated_by: "system" });
}

async function listStorageFiles(bucket: string, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 8) throw new Error(`Storage hierarchy is too deep in ${bucket}`);
  const admin = getSupabaseAdminClient();
  const files: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`Unable to inspect ${bucket}: ${error.message}`);
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id) files.push(path);
      else files.push(...await listStorageFiles(bucket, path, depth + 1));
    }
    if (!data || data.length < 1000) break;
  }
  return files;
}

async function executeApprovedDeletion(userId: string, payload: unknown) {
  const input = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  if (input.confirmation !== "DELETE MY CAREER OS DATA" || input.scope !== "all") throw new Error("Deletion approval payload does not contain the exact confirmation.");
  const admin = getSupabaseAdminClient();
  for (const bucket of privateBuckets) {
    const files = await listStorageFiles(bucket, userId);
    for (let offset = 0; offset < files.length; offset += 100) {
      const { error } = await admin.storage.from(bucket).remove(files.slice(offset, offset + 100));
      if (error) throw new Error(`Unable to delete files from ${bucket}: ${error.message}`);
    }
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Unable to delete account: ${error.message}`);
}

export async function decideApproval(id: string, decision: "approved" | "rejected" | "cancelled") {
  const { supabase, user } = await requireUser();
  const { data: approval } = await supabase.from("approval_requests").select("id,title,action_type,payload,target_object_id,agent_run_id").eq("id", id).eq("user_id", user.id).eq("status", "pending").maybeSingle();
  if (!approval) throw new Error("Approval request was already decided or does not exist.");
  const { data, error } = await supabase.rpc("decide_approval", { p_approval_id: id, p_user_id: user.id, p_decision: decision });
  if (error) throw new Error(error.message);
  if (decision === "approved" && data?.agent_run_id) {
    const { data: run } = await supabase.from("agent_runs").select("agent_job_id").eq("id", data.agent_run_id).eq("user_id", user.id).maybeSingle();
    if (run?.agent_job_id) await supabase.from("agent_jobs").update({ status: "queued", error_message: null, scheduled_for: new Date().toISOString(), updated_by: "user" }).eq("id", run.agent_job_id).eq("user_id", user.id).eq("status", "needs_user_input");
  }
  if (decision === "approved" && /application[._-]form[._-]fill/i.test(approval.action_type)) {
    const approvedPayload = approval.payload && typeof approval.payload === "object" && !Array.isArray(approval.payload) ? approval.payload as Record<string, unknown> : {};
    const portalUrl = typeof approvedPayload.portalUrl === "string" ? approvedPayload.portalUrl : undefined;
    await supabase.from("agent_jobs").insert({
      user_id: user.id,
      agent_id: "career-application-manager",
      title: `Approved form preparation: ${approval.title}`,
      queue: "browser",
      input_type: "application.form_fill",
      input: { schemaVersion: 1, type: "application.form_fill", mode: "execute_approved_fill", approvalId: approval.id, approvedPayload: approval.payload, applicationId: approval.target_object_id, portalUrl },
      related_object_ids: approval.target_object_id ? [approval.target_object_id] : [],
      required_capabilities: ["browser_fill_after_approval"],
      priority: 100,
      scheduled_for: new Date().toISOString(),
      dedupe_key: `approved-form-fill:${approval.id}`,
      created_by: "user",
      updated_by: "user",
    });
  }
  if (decision === "approved" && approval.action_type === "sensitive_data.export.request") {
    try {
      await executeApprovedExport(supabase, user.id, approval.id, approval.payload);
    } catch (error) {
      await getSupabaseAdminClient().from("approval_requests").update({ status: "pending", decided_at: null, error_message: error instanceof Error ? error.message : String(error), updated_by: "system" }).eq("id", approval.id).eq("user_id", user.id);
      throw error;
    }
  }
  if (decision === "approved" && approval.action_type === "sensitive_data.delete.request") {
    await executeApprovedDeletion(user.id, approval.payload);
    redirect("/login?deleted=1");
  }
  revalidatePath("/approvals"); revalidatePath("/dashboard");
  revalidatePath("/settings");
}
