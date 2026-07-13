"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function updateTaskStatus(id: string, expectedVersion: number, status: "completed" | "blocked" | "skipped") {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("tasks").update({ status, updated_by: "user", completion_notes: status === "completed" ? "Completed from Today" : undefined }).eq("id", id).eq("user_id", user.id).eq("version", expectedVersion).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This task changed elsewhere. Refresh before updating it.");
  await supabase.rpc("bump_state_version", { p_user_id: user.id, p_reason: `Task ${id} marked ${status}` });
  revalidatePath("/dashboard");
}
