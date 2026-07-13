"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueApplicationPreparation } from "@/lib/application-preparation";
import { toJson } from "@/lib/json";

export async function prepareApplication(applicationId: string) {
  const { user } = await requireUser();
  const admin = getSupabaseAdminClient();
  const { data: application } = await admin.from("applications").select("id,opportunity_id").eq("id", applicationId).eq("user_id", user.id).maybeSingle();
  if (!application?.opportunity_id) throw new Error("This application is not linked to an opportunity.");
  await enqueueApplicationPreparation(admin, user.id, application.id, application.opportunity_id);
  revalidatePath(`/applications/${applicationId}`);
}

export async function requestApplicationFormPreparation(applicationId: string, formData: FormData) {
  const { user } = await requireUser();
  const portalUrl = z.url().parse(String(formData.get("portalUrl") ?? "").trim());
  const parsedUrl = new URL(portalUrl);
  if (parsedUrl.protocol !== "https:") throw new Error("Application portals must use HTTPS.");
  const admin = getSupabaseAdminClient();
  const { data: application } = await admin.from("applications").select("id,opportunity_id,title").eq("id", applicationId).eq("user_id", user.id).maybeSingle();
  if (!application) throw new Error("Application not found.");
  const jobId = crypto.randomUUID();
  const { error } = await admin.from("agent_jobs").insert({
    id: jobId,
    user_id: user.id,
    agent_id: "career-application-manager",
    title: `Inspect application form: ${application.title}`,
    status: "queued",
    queue: "browser",
    input_type: "application.form_fill",
    input: toJson({ schemaVersion: 1, type: "application.form_fill", mode: "prepare_approval", applicationId, opportunityId: application.opportunity_id, portalUrl }),
    prompt: "Inspect this application form read-only, map every field to canonical Career OS facts, identify the exact files and final-submit controls, and create an approval request. Do not fill any field before approval and never submit.",
    related_object_ids: [applicationId, ...(application.opportunity_id ? [application.opportunity_id] : [])],
    required_capabilities: ["browser_read"],
    priority: 100,
    scheduled_for: new Date().toISOString(),
    dedupe_key: `application-form-inspect:${applicationId}:${jobId}`,
    metadata: toJson({ applicationId, opportunityId: application.opportunity_id, portalUrl, approvalPreparation: true }),
    created_by: "user",
    updated_by: "user",
  });
  if (error) throw new Error(`Unable to queue portal inspection: ${error.message}`);
  await admin.from("applications").update({ next_action: "Career OS is inspecting the form and will place the exact fill plan in Approvals.", updated_by: "user" }).eq("id", applicationId).eq("user_id", user.id);
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/approvals");
}

export async function markApplicationSubmitted(applicationId: string) {
  const { user } = await requireUser();
  const admin = getSupabaseAdminClient();
  const { data: application } = await admin.from("applications").select("id,status,opportunity_id,version").eq("id", applicationId).eq("user_id", user.id).maybeSingle();
  if (!application) throw new Error("Application not found.");
  if (application.status === "submitted") return;
  const now = new Date().toISOString();
  const { data: updated, error } = await admin.from("applications").update({ status: "submitted", submitted_at: now, next_action: "Watch for confirmation, assessment, recruiter, and interview updates.", updated_by: "user" }).eq("id", applicationId).eq("user_id", user.id).eq("version", application.version).select("id").maybeSingle();
  if (error || !updated) throw new Error("Application changed elsewhere. Refresh before marking it submitted.");
  await admin.from("application_status_history").insert({ user_id: user.id, application_id: applicationId, status: "recorded", previous_status: application.status, new_status: "submitted", confidence: "high", rationale: "User confirmed final submission was completed manually.", source_type: "user", effective_at: now, created_by: "user", updated_by: "user" });
  await admin.from("audit_log_entries").insert({ user_id: user.id, action_type: "application.submitted_manually", target_object_type: "application", target_object_id: applicationId, summary: "User confirmed manual application submission.", payload: toJson({ previousStatus: application.status, submittedAt: now }), created_by: "user", updated_by: "user" });
  await admin.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-application-manager", title: "Schedule application status monitoring", status: "queued", queue: "applications", input_type: "application.status_check", input: toJson({ schemaVersion: 1, type: "application.status_check", applicationId, opportunityId: application.opportunity_id, checkSources: ["gmail", "calendar", "portal", "manual"] }), prompt: "Create the next evidence-backed status-check policy. Record no_change only after a real configured check.", related_object_ids: [applicationId], required_capabilities: [], priority: 75, scheduled_for: now, dedupe_key: `application-status-monitor:${applicationId}:submitted`, created_by: "system", updated_by: "system" });
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
}
