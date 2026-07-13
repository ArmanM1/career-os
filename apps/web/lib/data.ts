import { requireUser } from "@/lib/supabase/server";

async function listTable<T>(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  table: string,
): Promise<T[]> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) return data as T[];
    // GoTrue and PostgREST can differ by a fraction of a second immediately
    // after issuing a session. One bounded retry prevents that transient clock
    // skew from turning a successful login into a dashboard error.
    if (attempt < 3 && error.message.includes("JWT issued at future")) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
      continue;
    }
    throw new Error(`Failed to load ${table}: ${error.message}`);
  }
  throw new Error(`Failed to load ${table}: session could not be validated`);
}

export async function getDashboardData() {
  const { supabase, user } = await requireUser();
  const [
    tasks,
    applications,
    approvals,
    sourceMonitors,
    goals,
    resumes,
    agentRuns,
    sourceCandidates,
    sourceDiscoveryRuns,
    signals,
    opportunityRecommendations,
  ] = await Promise.all([
    listTable<Record<string, unknown>>(supabase, user.id, "tasks"),
    listTable<Record<string, unknown>>(supabase, user.id, "applications"),
    listTable<Record<string, unknown>>(supabase, user.id, "approval_requests"),
    listTable<Record<string, unknown>>(supabase, user.id, "source_monitors"),
    listTable<Record<string, unknown>>(supabase, user.id, "goals"),
    listTable<Record<string, unknown>>(supabase, user.id, "resume_variants"),
    listTable<Record<string, unknown>>(supabase, user.id, "agent_runs"),
    listTable<Record<string, unknown>>(supabase, user.id, "source_candidates"),
    listTable<Record<string, unknown>>(supabase, user.id, "source_discovery_runs"),
    listTable<Record<string, unknown>>(supabase, user.id, "signals"),
    listTable<Record<string, unknown>>(supabase, user.id, "opportunity_recommendations"),
  ]);

  return {
    tasks,
    applications,
    approvals,
    sourceMonitors,
    goals,
    resumes,
    agentRuns,
    sourceCandidates,
    sourceDiscoveryRuns,
    signals,
    opportunityRecommendations,
  };
}
