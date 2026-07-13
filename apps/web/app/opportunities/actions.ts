"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { enqueueApplicationPreparation } from "@/lib/application-preparation";
import { toJson } from "@/lib/json";

export async function prepareOpportunityApplication(opportunityId: string) {
  const { user } = await requireUser();
  const admin = getSupabaseAdminClient();
  const [{ data: opportunity }, { data: recommendation }] = await Promise.all([
    admin.from("opportunities").select("id,title,company_id,deadline_at,companies(title)").eq("id", opportunityId).eq("user_id", user.id).maybeSingle(),
    admin.from("opportunity_recommendations").select("score").eq("opportunity_id", opportunityId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!opportunity) throw new Error("Opportunity not found.");
  const { data: existing } = await admin.from("applications").select("id").eq("user_id", user.id).eq("opportunity_id", opportunityId).is("archived_at", null).order("created_at").limit(1).maybeSingle();
  let applicationId = existing?.id;
  if (!applicationId) {
    applicationId = crypto.randomUUID();
    const company = opportunity.companies as { title?: string } | null;
    const { error } = await admin.from("applications").insert({
      id: applicationId,
      user_id: user.id,
      opportunity_id: opportunityId,
      company_id: opportunity.company_id,
      title: company?.title ? `${company.title} — ${opportunity.title}` : opportunity.title,
      status: "drafting",
      priority: recommendation?.score ?? 70,
      deadline_at: opportunity.deadline_at,
      due_at: opportunity.deadline_at,
      next_action: "Career OS is preparing this application.",
      status_check_policy: "email",
      related_opportunity_ids: [opportunityId],
      metadata: toJson({ createdFrom: "opportunity_detail", preparationPipeline: true }),
      created_by: "user",
      updated_by: "user",
    });
    if (error) throw new Error(`Unable to create application: ${error.message}`);
    await admin.from("audit_log_entries").insert({
      user_id: user.id,
      action_type: "application.preparation_started",
      target_object_type: "application",
      target_object_id: applicationId,
      summary: `Started application preparation for ${opportunity.title}.`,
      payload: toJson({ opportunityId }),
      created_by: "user",
      updated_by: "user",
    });
  }
  await enqueueApplicationPreparation(admin, user.id, applicationId, opportunityId);
  redirect(`/applications/${applicationId}`);
}
