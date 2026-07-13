import { requireUser } from "@/lib/supabase/server";

async function listTable<T>(table: string): Promise<T[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
  return data as T[];
}

export async function getDashboardData() {
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
    listTable<Record<string, unknown>>("tasks"),
    listTable<Record<string, unknown>>("applications"),
    listTable<Record<string, unknown>>("approval_requests"),
    listTable<Record<string, unknown>>("source_monitors"),
    listTable<Record<string, unknown>>("goals"),
    listTable<Record<string, unknown>>("resume_variants"),
    listTable<Record<string, unknown>>("agent_runs"),
    listTable<Record<string, unknown>>("source_candidates"),
    listTable<Record<string, unknown>>("source_discovery_runs"),
    listTable<Record<string, unknown>>("signals"),
    listTable<Record<string, unknown>>("opportunity_recommendations"),
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
