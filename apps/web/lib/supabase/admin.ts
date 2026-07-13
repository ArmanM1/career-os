import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@career-os/db";
import { getServerEnv, requireServerSecret } from "@/lib/env";

let adminClient: SupabaseClient<Database> | undefined;

export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;
  const env = getServerEnv();
  adminClient = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, requireServerSecret("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
