import { requireUser } from "@/lib/supabase/server";

async function listTable<T>(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  table: string,
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
  return data as T[];
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
