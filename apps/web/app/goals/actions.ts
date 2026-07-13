"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function undoStateItem(stateItemId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("undo_state_item", { p_state_item_id: stateItemId });
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}
