import { requireUser } from "@/lib/supabase/server";

/** @deprecated Use requireUser from lib/supabase/server in new domain code. */
export async function createCareerServerClient() {
  const { supabase, user } = await requireUser();
  return { supabase, userId: user.id };
}
