"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function setWorkerStatus(id: string, status: "paused" | "offline" | "revoked") {
  const { supabase, user } = await requireUser();
  const update: Record<string, unknown> = { status, updated_by: "user" };
  if (status === "revoked") { update.secret_hash = null; update.archived_at = new Date().toISOString(); }
  const { error } = await supabase.from("worker_devices").update(update).eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/worker"); revalidatePath("/dashboard");
}
