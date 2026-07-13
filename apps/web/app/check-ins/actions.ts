"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function completeCheckIn(checkInId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data: checkIn } = await supabase.from("check_ins").select("id").eq("id", checkInId).eq("user_id", user.id).in("status", ["open", "scheduled"]).maybeSingle();
  if (!checkIn) throw new Error("Check-in is no longer open");
  const { data: questions } = await supabase.from("check_in_questions").select("id,question_type").eq("check_in_id", checkInId).eq("user_id", user.id);
  for (const question of questions ?? []) {
    const values = formData.getAll(question.id).map(String);
    const answer = question.question_type === "multi_select" ? values : values[0] ?? "";
    await supabase.from("check_in_answers").upsert({ user_id: user.id, check_in_id: checkInId, question_id: question.id, answer, created_by: "user", updated_by: "user" }, { onConflict: "question_id" });
  }
  const nextVersion = await supabase.rpc("bump_state_version", { p_user_id: user.id, p_reason: `Check-in ${checkInId} completed` });
  await supabase.from("check_ins").update({ status: "completed", completed_at: new Date().toISOString(), state_version_after: nextVersion.data, updated_by: "user" }).eq("id", checkInId).eq("user_id", user.id);
  await supabase.from("agent_jobs").insert({ user_id: user.id, agent_id: "career-state-curator", title: "Curate check-in state", status: "queued", queue: "state", input_type: "state.curate", input: { schemaVersion: 1, type: "state.curate", checkInId }, priority: 80, scheduled_for: new Date().toISOString(), dedupe_key: `check-in:${checkInId}:state`, created_state_version: Number(nextVersion.data ?? 0), created_by: "system", updated_by: "system" });
  revalidatePath("/check-ins"); revalidatePath("/dashboard");
}
