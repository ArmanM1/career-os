"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

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
  revalidatePath("/approvals"); revalidatePath("/dashboard");
}
