import { createClient } from "@supabase/supabase-js";
import type { WorkerEnv } from "./env";

export function createWorkerSupabase(env: WorkerEnv) {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type WorkerSupabase = ReturnType<typeof createWorkerSupabase>;

